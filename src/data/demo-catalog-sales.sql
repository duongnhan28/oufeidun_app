-- Shared demo/isolated PostgreSQL implementation of catalog + optional gift lines.
do $$declare constraintname text;begin
 for constraintname in select conname from pg_constraint where conrelid='app_private.sales_order_items'::regclass and contype='u' and pg_get_constraintdef(oid)='UNIQUE (order_id, product_id)' loop
  execute format('alter table app_private.sales_order_items drop constraint %I',constraintname);
 end loop;
end $$;
do $$begin
 if not exists(select 1 from pg_constraint where conname='sales_order_items_order_product_kind' and conrelid='app_private.sales_order_items'::regclass) then
  alter table app_private.sales_order_items add constraint sales_order_items_order_product_kind unique(order_id,product_id,item_kind);
 end if;
end $$;
create table if not exists app_private.customers(id uuid primary key default gen_random_uuid(),customer_type text not null check(customer_type in ('retail','wholesale')),name text not null,phone text not null unique,address text not null default '',note text not null default '',active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists app_private.customer_product_prices(customer_id uuid references app_private.customers(id),product_id uuid references app_private.products(id),unit_price numeric(18,0) not null check(unit_price>=0),primary key(customer_id,product_id));
alter table app_private.sales_orders add column if not exists customer_id uuid references app_private.customers(id),add column if not exists sales_user_id uuid references app_private.app_users(id);
alter table app_private.sales_order_items add column if not exists price_overridden boolean not null default false,add column if not exists price_source text not null default 'retail_default';

create or replace function public.shop_customer(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u app_private.app_users; cid uuid;
begin
 u:=app_private.current_actor();
 if payload->>'action'='delete' then
  if u.role<>'admin' then raise exception 'FORBIDDEN';end if;
  update app_private.customers set active=false where id=(payload->>'id')::uuid returning id into cid;
 else
  if length(trim(coalesce(payload->>'name',''))) not between 1 and 200 or length(trim(coalesce(payload->>'phone',''))) not between 1 and 30 or coalesce(payload->>'customer_type','') not in ('retail','wholesale') or length(coalesce(payload->>'address',''))>500 or length(coalesce(payload->>'note',''))>1000 then raise exception 'VALIDATION_ERROR';end if;
  cid:=coalesce((payload->>'id')::uuid,gen_random_uuid());
  if exists(select 1 from app_private.customers where id=cid) then
   update app_private.customers set name=trim(payload->>'name'),phone=trim(payload->>'phone'),customer_type=payload->>'customer_type',address=coalesce(payload->>'address',''),note=coalesce(payload->>'note',''),active=true,updated_at=now() where id=cid;
  else
   insert into app_private.customers(id,name,phone,customer_type,address,note) values(cid,trim(payload->>'name'),trim(payload->>'phone'),payload->>'customer_type',coalesce(payload->>'address',''),coalesce(payload->>'note',''))
    on conflict(phone) do update set name=excluded.name,customer_type=excluded.customer_type,address=excluded.address,note=excluded.note,active=true,updated_at=now() returning id into cid;
  end if;
 end if;
 return jsonb_build_object('id',cid);
end $$;
create or replace function public.shop_set_wholesale_price(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u app_private.app_users;begin
 u:=app_private.current_actor();if u.role<>'admin' then raise exception 'FORBIDDEN';end if;
 if coalesce(payload->>'wholesale_price','')!~'^[0-9]{1,15}$' then raise exception 'VALIDATION_ERROR';end if;
 update app_private.products set wholesale_price=(payload->>'wholesale_price')::numeric,price_version=price_version+case when wholesale_price<>(payload->>'wholesale_price')::numeric then 1 else 0 end,version=version+1 where id=(payload->>'product_id')::uuid;
 if not found then raise exception 'PRODUCT_NOT_FOUND';end if;return jsonb_build_object('id',payload->>'product_id');
end $$;
create or replace function public.shop_business_extras() returns jsonb language plpgsql security definer set search_path='' as $$
declare u app_private.app_users;begin
 u:=app_private.current_actor();return jsonb_build_object(
 'customers',coalesce((select jsonb_agg(to_jsonb(c)) from app_private.customers c where active),'[]'::jsonb),
 'customer_prices',coalesce((select jsonb_agg(jsonb_build_object('customer_id',c.customer_id,'product_id',c.product_id,'unit_price',c.unit_price::text)) from app_private.customer_product_prices c),'[]'::jsonb),
 'salespeople',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'display_name',a.display_name,'role',a.role,'active',a.active)) from app_private.app_users a where a.active),'[]'::jsonb),
 'products',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'wholesale_price',p.wholesale_price::text)) from app_private.products p),'[]'::jsonb),
 'orders',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'customer_id',o.customer_id,'sales_user_id',o.sales_user_id,'sales_name',(select display_name from app_private.app_users where id=o.sales_user_id))) from app_private.sales_orders o where o.status<>'deleted' and (u.role='admin' or o.created_by=u.id)),'[]'::jsonb));
end $$;
create or replace function public.shop_bulk_price(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u app_private.app_users; n integer;begin
 u:=app_private.current_actor();if u.role<>'admin' then raise exception 'FORBIDDEN';end if;
 if coalesce(payload->>'glass_type','') not in ('clear','full_border','privacy','matte','premium_borderless','other') or coalesce(payload->>'sale_price','')!~'^[0-9]{1,15}$' or coalesce(payload->>'wholesale_price','')!~'^[0-9]{1,15}$' or coalesce(payload->>'fixed_cost','')!~'^[0-9]{1,15}$' then raise exception 'VALIDATION_ERROR';end if;
 update app_private.product_costs c set fixed_cost=(payload->>'fixed_cost')::numeric from app_private.products p where c.product_id=p.id and p.active and p.deleted_at is null and (p.glass_type=payload->>'glass_type' or (payload->>'glass_type' in ('clear','full_border') and p.glass_type in ('clear','full_border')));
 update app_private.products set sale_price=(payload->>'sale_price')::numeric,wholesale_price=(payload->>'wholesale_price')::numeric,version=version+1,price_version=price_version+case when sale_price<>(payload->>'sale_price')::numeric or wholesale_price<>(payload->>'wholesale_price')::numeric then 1 else 0 end where active and deleted_at is null and (glass_type=payload->>'glass_type' or (payload->>'glass_type' in ('clear','full_border') and glass_type in ('clear','full_border')));
 get diagnostics n=row_count;return jsonb_build_object('updated',n);
end $$;
create or replace function app_private.save_sale_details(orderid uuid, payload jsonb, items jsonb) returns void language plpgsql set search_path='' as $$
declare o app_private.sales_orders; cid uuid; sid uuid;begin
 select * into o from app_private.sales_orders where id=orderid;
 cid:=(public.shop_customer(jsonb_build_object('id',payload->>'customer_id','name',o.customer_name,'phone',o.customer_phone,'customer_type',payload->>'customer_type','address',payload->>'customer_address','note',coalesce(payload->>'customer_note','')))->>'id')::uuid;
 sid:=coalesce((payload->>'sales_user_id')::uuid,o.created_by);
 if not exists(select 1 from app_private.app_users where id=sid and active) then raise exception 'INVALID_SALES_USER';end if;
 update app_private.sales_orders set customer_id=cid,sales_user_id=sid where id=orderid;
 perform public.shop_order_business(payload||jsonb_build_object('order_id',orderid,'order_code',o.order_code));
 perform public.shop_order_features(payload||jsonb_build_object('action','save','order_id',orderid,'items',items));
end $$;

do $patch$
declare def text;begin
 select pg_get_functiondef('public.shop_write(jsonb)'::regprocedure) into def;
 if position('-- sale_lines_v2' in def)=0 then
  def:=replace(def,'''extra_cost_note'']','''extra_cost_note'',''sale_details'']');
  def:=replace(def,'''image_path'']','''image_path'',''wholesale_price'']');
  def:=replace(def,'''glass_brand_id'']','''glass_brand_id'',''wholesale_price'']');
  def:=replace(def,'''active'']','''active'',''wholesale_price'']');
  def:=replace(def,'result:=jsonb_build_object(''id'',pid); detail:=coalesce(detail,payload->>''sku'');','if payload ? ''wholesale_price'' then perform public.shop_set_wholesale_price(jsonb_build_object(''product_id'',pid,''wholesale_price'',payload->>''wholesale_price''));end if; result:=jsonb_build_object(''id'',pid); detail:=coalesce(detail,payload->>''sku'');');
  def:=replace(def,$keys$'product_id','quantity','custom_name'$keys$, $keys$'product_id','quantity','custom_name','item_kind','unit_sale_price','price_overridden','save_customer_price','zero_price_confirm','item_note','quoted_price_version','price_source'$keys$);
  def:=replace(def,'where order_id=oid and product_id=pid;','where order_id=oid and product_id=pid and item_kind=coalesce(el->>''item_kind'',''sale'');');
  def:=replace(def,'(order_id,product_id,quantity,custom_name,unit_sale_price,quoted_price_version)','(order_id,product_id,quantity,custom_name,unit_sale_price,quoted_price_version,item_kind)');
  def:=replace(def,'end,p.sale_price,p.price_version)','end,p.sale_price,p.price_version,coalesce(el->>''item_kind'',''sale''))');
  def:=replace(def,'on conflict(order_id,product_id)','on conflict(order_id,product_id,item_kind)');
  def:=replace(def,'count(distinct value->>''product_id'')','count(distinct ((value->>''product_id'')||'':''||coalesce(value->>''item_kind'',''sale'')))');
  def:=replace(def,'product_id not in(select (value->>''product_id'')::uuid from jsonb_array_elements(payload->''items''))','not exists(select 1 from jsonb_array_elements(payload->''items'') as entry(value) where (entry.value->>''product_id'')::uuid=sales_order_items.product_id and coalesce(entry.value->>''item_kind'',''sale'')=sales_order_items.item_kind)');
  def:=replace(def,'result:=jsonb_build_object(''id'',oid); detail:=oid::text;',E'-- sale_lines_v2\n  if payload ? ''sale_details'' then perform app_private.save_sale_details(oid,payload->''sale_details'',payload->''items'');end if;\n  result:=jsonb_build_object(''id'',oid); detail:=oid::text;');
  execute def;
 end if;
 select pg_get_functiondef('public.shop_order_features(jsonb)'::regprocedure) into def;
 if position('-- sale_features_v2' in def)=0 then
 def:=replace(def,'product_id=(el->>''product_id'')::uuid for update','product_id=(el->>''product_id'')::uuid and item_kind=coalesce(el->>''item_kind'',''sale'') for update');
 def:=replace(def,'select sale_price into applied from app_private.products where id=line.product_id;',E'if coalesce((el->>''price_overridden'')::boolean,false) then\n if coalesce(el->>''unit_sale_price'','''')!~''^[0-9]{1,15}$'' then raise exception ''VALIDATION_ERROR'';end if;\n applied:=(el->>''unit_sale_price'')::numeric;\n else select case when payload->>''customer_type''=''wholesale'' then coalesce((select unit_price from app_private.customer_product_prices where customer_id=o.customer_id and product_id=line.product_id),wholesale_price) else sale_price end into applied from app_private.products where id=line.product_id;end if;\n if applied=0 and not coalesce((el->>''zero_price_confirm'')::boolean,false) then raise exception ''ZERO_PRICE_CONFIRM_REQUIRED'';end if;');
 def:=replace(def,'custom_unit_price=applied,item_kind=kind,item_note=', 'custom_unit_price=applied,price_overridden=(kind=''sale'' and coalesce((el->>''price_overridden'')::boolean,false)),price_source=case when kind<>''sale'' then ''free_item'' when coalesce((el->>''price_overridden'')::boolean,false) then ''manual'' when payload->>''customer_type''=''wholesale'' then ''wholesale_default'' else ''retail_default'' end,item_kind=kind,item_note=');
 def:=replace(def,'where id=line.id;end loop;',E'where id=line.id;\n -- sale_features_v2\n if coalesce((el->>''save_customer_price'')::boolean,false) then\n if kind<>''sale'' or payload->>''customer_type''<>''wholesale'' or o.customer_id is null then raise exception ''CUSTOMER_PRICE_REQUIRES_WHOLESALE'';end if;\n insert into app_private.customer_product_prices(customer_id,product_id,unit_price) values(o.customer_id,line.product_id,applied) on conflict(customer_id,product_id) do update set unit_price=excluded.unit_price;end if;\n end loop;');
 execute def;
 end if;
 select pg_get_functiondef('public.shop_order_extras()'::regprocedure) into def;
 if position('''price_overridden''' in def)=0 then def:=replace(def,'''product_id'',i.product_id,','''id'',i.id,''price_overridden'',i.price_overridden,''price_source'',i.price_source,''product_id'',i.product_id,');execute def;end if;
end $patch$;

revoke all on function app_private.save_sale_details(uuid,jsonb,jsonb) from public,anon,authenticated;
