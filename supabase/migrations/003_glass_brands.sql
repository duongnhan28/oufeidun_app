-- Additive migration: separate screen protector brands from device brands.
create table app_private.glass_brands (
 id uuid primary key default gen_random_uuid(),
 name text not null check(name=trim(name) and length(name) between 1 and 100),
 created_at timestamptz not null default now()
);
create unique index glass_brands_name_unique on app_private.glass_brands(lower(name));
alter table app_private.glass_brands enable row level security;
revoke all on app_private.glass_brands from public,anon,authenticated;
alter table app_private.products add column glass_brand_id uuid references app_private.glass_brands(id);
create index products_glass_brand on app_private.products(glass_brand_id);
-- Existing products stay unclassified; device brands are not converted into glass brands.
create or replace function public.shop_read(payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare u app_private.app_users; result jsonb; act text:=coalesce(payload->>'action','workspace'); brand_filter text:=coalesce(nullif(trim(payload->>'brand'),''),'all'); d1 timestamptz; d2 timestamptz; rev numeric:=0; refunds numeric:=0; cost numeric:=0; reversed_cost numeric:=0; damage numeric:=0; sold integer:=0;
begin
 u:=app_private.current_actor();
 if act='report' then
  if u.role<>'admin' then raise exception 'FORBIDDEN'; end if;
  d1:=(payload->>'from')::date::timestamp at time zone 'Asia/Ho_Chi_Minh';
  d2:=((payload->>'to')::date+1)::timestamp at time zone 'Asia/Ho_Chi_Minh';
  if d1 is null or d2 is null or d2<=d1 or d2-d1>interval '366 days' then raise exception 'VALIDATION_ERROR'; end if;
  select coalesce(sum(i.quantity*i.unit_sale_price),0),coalesce(sum(i.quantity*c.unit_cost_snapshot),0),coalesce(sum(i.quantity),0) into rev,cost,sold
   from app_private.sales_orders o join app_private.sales_order_items i on i.order_id=o.id join app_private.sales_item_costs c on c.order_item_id=i.id join app_private.products p on p.id=i.product_id where o.confirmed_at>=d1 and o.confirmed_at<d2 and (brand_filter='all' or p.brand=brand_filter);
  select coalesce(sum(i.quantity*i.unit_sale_price),0),coalesce(sum(i.quantity*c.unit_cost_snapshot),0) into refunds,reversed_cost from app_private.sales_orders o join app_private.sales_order_items i on i.order_id=o.id join app_private.sales_item_costs c on c.order_item_id=i.id join app_private.products p on p.id=i.product_id where o.cancelled_at>=d1 and o.cancelled_at<d2 and (brand_filter='all' or p.brand=brand_filter);
  select refunds+coalesce(sum(r.refund_amount),0),reversed_cost+coalesce(sum(r.quantity*c.unit_cost_snapshot),0),coalesce(sum((r.quantity-r.restock_quantity)*c.unit_cost_snapshot),0) into refunds,reversed_cost,damage from app_private.sales_returns h join app_private.sales_return_items r on r.return_id=h.id join app_private.sales_order_items sold_item on sold_item.id=r.order_item_id join app_private.sales_item_costs c on c.order_item_id=r.order_item_id join app_private.products p on p.id=sold_item.product_id where h.posted_at>=d1 and h.posted_at<d2 and (brand_filter='all' or p.brand=brand_filter);
  select damage+coalesce(sum(-i.quantity_delta*i.fixed_cost_snapshot),0) into damage from app_private.inventory_documents h join app_private.inventory_document_items i on i.document_id=h.id join app_private.products p on p.id=i.product_id where h.type='damage' and h.posted_at>=d1 and h.posted_at<d2 and (brand_filter='all' or p.brand=brand_filter);
  return jsonb_build_object('revenue',(rev-refunds)::text,'refunds',refunds::text,'cost',(cost-reversed_cost)::text,'profit',(rev-refunds-cost+reversed_cost)::text,'damage',damage::text,'sold',sold,'stock',(select coalesce(sum(b.on_hand),0) from app_private.inventory_balances b join app_private.products p on p.id=b.product_id where brand_filter='all' or p.brand=brand_filter),'stock_value',(select coalesce(sum(b.on_hand*c.fixed_cost),0)::text from app_private.inventory_balances b join app_private.product_costs c on c.product_id=b.product_id join app_private.products p on p.id=b.product_id where brand_filter='all' or p.brand=brand_filter),
  'inventory',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from (select p.sku,p.name,coalesce(sum(m.quantity_delta) filter(where m.occurred_at<d1),0) opening,coalesce(sum(m.quantity_delta) filter(where m.occurred_at>=d1 and m.quantity_delta>0),0) incoming,coalesce(-sum(m.quantity_delta) filter(where m.occurred_at>=d1 and m.quantity_delta<0),0) outgoing,coalesce(sum(m.quantity_delta),0) closing from app_private.products p left join app_private.inventory_movements m on m.product_id=p.id and m.occurred_at<d2 where brand_filter='all' or p.brand=brand_filter group by p.id,p.sku,p.name order by p.sku limit 5000) x));
 end if;
 if act='history' then
  if u.role<>'admin' then raise exception 'FORBIDDEN'; end if;
  return coalesce((select jsonb_agg(to_jsonb(x)) from (select m.*,p.sku,p.name,a.display_name actor_name from app_private.inventory_movements m join app_private.products p on p.id=m.product_id join app_private.app_users a on a.id=m.actor_id where m.product_id=(payload->>'product_id')::uuid order by product_version_after desc limit 100) x),'[]');
 end if;
 if act<>'workspace' then raise exception 'VALIDATION_ERROR'; end if;
 select jsonb_build_object(
 'glass_brands',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name) order by name) from app_private.glass_brands),'[]'),
 'me',jsonb_build_object('id',u.id,'display_name',u.display_name,'role',u.role,'active',u.active),
 'products',coalesce((select jsonb_agg(to_jsonb(x)) from (select p.id,p.sku,p.name,p.glass_type,p.models,p.brand,p.glass_brand_id,p.image_path,p.sale_price::text,p.active,p.version,p.price_version,b.on_hand,b.version stock_version,
 case when u.role='admin' then c.fixed_cost::text else null end fixed_cost from app_private.products p join app_private.inventory_balances b on b.product_id=p.id join app_private.product_costs c on c.product_id=p.id where p.deleted_at is null order by p.sku limit 5000) x),'[]'),
 'orders',coalesce((select jsonb_agg(to_jsonb(x)) from (select o.id,'DH-'||lpad(o.order_no::text,5,'0') order_no,o.status,o.created_by,a.display_name creator_name,o.customer_name,o.customer_phone,o.note,o.payment_method,o.total_amount::text,o.created_at,o.confirmed_at,o.cancelled_at,o.version,o.exchange_return_id,
 (select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'product_id',i.product_id,'quantity',i.quantity,'custom_name',i.custom_name,'unit_sale_price',i.unit_sale_price::text,'quoted_price_version',i.quoted_price_version,'sku_snapshot',i.sku_snapshot,'product_name_snapshot',i.product_name_snapshot,'returned_quantity',(select coalesce(sum(ri.quantity),0) from app_private.sales_return_items ri where ri.order_item_id=i.id)) order by i.id),'[]') from app_private.sales_order_items i where i.order_id=o.id) items,
 (select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'return_no','TH-'||r.return_no,'posted_at',r.posted_at,'refund_amount',r.refund_amount::text,'reason',r.reason,'items',(select jsonb_agg(jsonb_build_object('order_item_id',ri.order_item_id,'quantity',ri.quantity,'restock_quantity',ri.restock_quantity)) from app_private.sales_return_items ri where ri.return_id=r.id))),'[]') from app_private.sales_returns r where r.order_id=o.id) returns
 from app_private.sales_orders o join app_private.app_users a on a.id=o.created_by where o.status<>'deleted' and (u.role='admin' or o.created_by=u.id) order by o.updated_at desc limit 500) x),'[]'),
 'users',case when u.role='admin' then coalesce((select jsonb_agg(jsonb_build_object('id',id,'display_name',display_name,'role',role,'active',active)) from app_private.app_users),'[]') else '[]'::jsonb end,
 'logs',case when u.role='admin' then coalesce((select jsonb_agg(to_jsonb(x)) from (select l.id,l.action,l.detail,l.created_at,a.display_name actor_name from app_private.audit_logs l join app_private.app_users a on a.id=l.actor_id order by l.created_at desc limit 100) x),'[]') else '[]'::jsonb end
 ) into result;
 -- Do not return even an empty cost field to staff.
 if u.role<>'admin' then result:=jsonb_set(result,'{products}',coalesce((select jsonb_agg(v-'fixed_cost') from jsonb_array_elements(result->'products') v),'[]')); end if;
 return result;
end $$;

create or replace function public.shop_write(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
<<write_block>>
declare u app_private.app_users; act text:=payload->>'action'; key uuid:=(payload->>'key')::uuid; oldreq app_private.mutation_requests;
 o app_private.sales_orders; p app_private.products; b app_private.inventory_balances; i app_private.sales_order_items;
 el jsonb; oid uuid; pid uuid; docid uuid; lineid uuid; retid uuid; n integer; delta integer; restock integer; already integer; total numeric:=0; cost numeric; oldname text; result jsonb; detail text; kind text;
begin
 u:=app_private.current_actor();
 if key is null then raise exception 'VALIDATION_ERROR: key required'; end if;
 insert into app_private.mutation_requests(actor_id,request_key,payload) values(u.id,key,payload) on conflict do nothing;
 select * into oldreq from app_private.mutation_requests where actor_id=u.id and request_key=key for update;
 if oldreq.payload<>payload then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
 if oldreq.result is not null then return oldreq.result; end if;
 if act not in ('save_draft','confirm_order','delete_draft') and u.role<>'admin' then raise exception 'FORBIDDEN'; end if;
 if act='save_draft' then
  perform app_private.only_keys(payload,array['action','key','id','version','items','customer_name','customer_phone','note']);
  if jsonb_typeof(payload->'items')<>'array' or coalesce(jsonb_array_length(payload->'items'),0) not between 1 and 100 then raise exception 'VALIDATION_ERROR: items'; end if;
  oid:=(payload->>'id')::uuid;
  if oid is null then insert into app_private.sales_orders(created_by) values(u.id) returning * into o; oid:=o.id;
  else
   select * into o from app_private.sales_orders where id=oid for update;
   if o.id is null or (o.created_by<>u.id and u.role<>'admin') then raise exception 'FORBIDDEN'; end if;
   if o.status<>'draft' then raise exception 'INVALID_ORDER_STATE'; end if;
   if o.version is distinct from (payload->>'version')::integer then raise exception 'VERSION_CONFLICT'; end if;
  end if;
  for el in select value from jsonb_array_elements(payload->'items') order by value->>'product_id' loop
   perform app_private.only_keys(el,array['product_id','quantity','custom_name']);
   if (el->>'quantity') !~ '^[0-9]+$' then raise exception 'VALIDATION_ERROR'; end if;
   pid:=(el->>'product_id')::uuid;
   select * into p from app_private.products where id=pid for share;
   if p.id is null or not p.active then raise exception 'PRODUCT_INACTIVE'; end if;
   select custom_name into oldname from app_private.sales_order_items where order_id=oid and product_id=pid;
   if oldname is distinct from (el->>'custom_name') then insert into app_private.audit_logs(actor_id,action,detail) values(u.id,'order.item_name.update',oid||' / '||p.sku||': '||coalesce(oldname,p.name)||' → '||coalesce(el->>'custom_name',p.name)); end if;
   insert into app_private.sales_order_items(order_id,product_id,quantity,custom_name,unit_sale_price,quoted_price_version)
   values(oid,pid,(el->>'quantity')::integer,case when el->>'custom_name' is null then null else trim(el->>'custom_name') end,p.sale_price,p.price_version)
   on conflict(order_id,product_id) do update set quantity=excluded.quantity,custom_name=excluded.custom_name,unit_sale_price=excluded.unit_sale_price,quoted_price_version=excluded.quoted_price_version;
  end loop;
  if (select count(*) from jsonb_array_elements(payload->'items'))<>(select count(distinct value->>'product_id') from jsonb_array_elements(payload->'items')) then raise exception 'VALIDATION_ERROR: duplicate product'; end if;
  delete from app_private.sales_order_items where order_id=oid and product_id not in(select (value->>'product_id')::uuid from jsonb_array_elements(payload->'items'));
  update app_private.sales_orders set customer_name=coalesce(payload->>'customer_name',''),customer_phone=coalesce(payload->>'customer_phone',''),note=coalesce(payload->>'note',''),total_amount=(select sum(quantity*unit_sale_price) from app_private.sales_order_items where order_id=oid),version=version+1,updated_at=now() where id=oid;
  result:=jsonb_build_object('id',oid); detail:=oid::text;
 elsif act in ('confirm_order','delete_draft','cancel_order','return_order') then
  perform app_private.only_keys(payload,array['action','key','id','version','payment_method','reason','refund_method','items']);
  oid:=(payload->>'id')::uuid;
  select * into o from app_private.sales_orders where id=oid for update;
  if o.id is null or (o.created_by<>u.id and u.role<>'admin') then raise exception 'FORBIDDEN'; end if;
  if act in ('confirm_order','delete_draft') then
   if o.status<>'draft' then raise exception 'INVALID_ORDER_STATE'; end if;
   if o.version is distinct from (payload->>'version')::integer then raise exception 'VERSION_CONFLICT'; end if;
  end if;
  if act='delete_draft' then
   update app_private.sales_orders set status='deleted',exchange_return_id=null,version=version+1,updated_at=now() where id=oid;
  elsif act='confirm_order' then
   if payload->>'payment_method' is null then raise exception 'VALIDATION_ERROR'; end if;
   if not exists(select 1 from app_private.sales_order_items where order_id=oid) then raise exception 'VALIDATION_ERROR'; end if;
   for i in select * from app_private.sales_order_items where order_id=oid order by product_id loop
    select * into p from app_private.products where id=i.product_id for share;
    if not p.active then raise exception 'PRODUCT_INACTIVE'; end if;
    if p.price_version<>i.quoted_price_version then raise exception 'PRICE_CHANGED'; end if;
    select fixed_cost into cost from app_private.product_costs where product_id=p.id for share;
    perform app_private.move_stock(p.id,-i.quantity,'sale',u.id,null,i.id);
    update app_private.sales_order_items set sku_snapshot=p.sku,product_name_snapshot=coalesce(i.custom_name,p.name),unit_sale_price=p.sale_price where id=i.id;
    insert into app_private.sales_item_costs values(i.id,cost);
   end loop;
   update app_private.sales_orders set status='confirmed',confirmed_by=u.id,confirmed_at=now(),payment_method=payload->>'payment_method',version=version+1,updated_at=now() where id=oid;
  elsif act='cancel_order' then
   if o.status<>'confirmed' or exists(select 1 from app_private.sales_returns where order_id=oid) then raise exception 'INVALID_ORDER_STATE'; end if;
   if length(trim(coalesce(payload->>'reason',''))) not between 1 and 1000 or payload->>'refund_method' is null then raise exception 'VALIDATION_ERROR'; end if;
   for i in select * from app_private.sales_order_items where order_id=oid order by product_id loop perform app_private.move_stock(i.product_id,i.quantity,'cancel',u.id,null,i.id); end loop;
   update app_private.sales_orders set status='cancelled',cancelled_at=now(),cancel_reason=payload->>'reason',cancel_refund_method=payload->>'refund_method',version=version+1,updated_at=now() where id=oid;
  else
   if o.status not in ('confirmed','partially_returned') then raise exception 'INVALID_ORDER_STATE'; end if;
   if jsonb_typeof(payload->'items')<>'array' or coalesce(jsonb_array_length(payload->'items'),0) not between 1 and 100 then raise exception 'VALIDATION_ERROR'; end if;
   insert into app_private.sales_returns(order_id,reason,refund_method,created_by) values(oid,trim(payload->>'reason'),payload->>'refund_method',u.id) returning id into retid;
   -- Product order is global for stock locks, including partial returns.
   for el in select e.value from jsonb_array_elements(payload->'items') e join app_private.sales_order_items si on si.id=(e.value->>'order_item_id')::uuid order by si.product_id loop
    perform app_private.only_keys(el,array['order_item_id','quantity','restock_quantity']);
    select * into i from app_private.sales_order_items where id=(el->>'order_item_id')::uuid and order_id=oid;
    if i.id is null then raise exception 'VALIDATION_ERROR'; end if;
    if (el->>'quantity') !~ '^[0-9]+$' or (el->>'restock_quantity') !~ '^[0-9]+$' then raise exception 'VALIDATION_ERROR'; end if;
    n:=(el->>'quantity')::integer; restock:=(el->>'restock_quantity')::integer;
    select coalesce(sum(quantity),0) into already from app_private.sales_return_items where order_item_id=i.id;
    if n+already>i.quantity then raise exception 'RETURN_EXCEEDS_SOLD'; end if;
    insert into app_private.sales_return_items(return_id,order_item_id,quantity,restock_quantity,refund_amount) values(retid,i.id,n,restock,n*i.unit_sale_price) returning id into lineid;
    perform app_private.move_stock(i.product_id,restock,'return',u.id,null,null,lineid);
    total:=total+n*i.unit_sale_price;
   end loop;
   if (select count(*) from app_private.sales_return_items where return_id=retid)<>jsonb_array_length(payload->'items') then raise exception 'VALIDATION_ERROR'; end if;
   update app_private.sales_returns set refund_amount=total where id=retid;
   update app_private.sales_orders set status=case when (select sum(quantity) from app_private.sales_order_items where order_id=oid)=(select sum(r.quantity) from app_private.sales_return_items r join app_private.sales_returns h on h.id=r.return_id where h.order_id=oid) then 'returned' else 'partially_returned' end,version=version+1,updated_at=now() where id=oid;
  end if;
  result:=jsonb_build_object('id',oid,'return_id',retid); detail:=oid::text;
 elsif act='product' then
  perform app_private.only_keys(payload,array['action','key','id','version','sku','name','glass_type','models','brand','sale_price','fixed_cost','active','image_path','glass_brand_id']);
  if (payload->>'sale_price') !~ '^[0-9]{1,15}$' or (payload->>'fixed_cost') !~ '^[0-9]{1,15}$' then raise exception 'VALIDATION_ERROR'; end if;
  pid:=(payload->>'id')::uuid;
  if pid is null then
   insert into app_private.products(sku,name,glass_type,models,brand,sale_price,active,image_path) values(upper(trim(payload->>'sku')),trim(payload->>'name'),payload->>'glass_type',array(select distinct trim(value) from jsonb_array_elements_text(payload->'models') where trim(value)<>''),coalesce(payload->>'brand','other'),(payload->>'sale_price')::numeric,coalesce((payload->>'active')::boolean,true),payload->>'image_path') returning id into pid;
   insert into app_private.product_costs values(pid,(payload->>'fixed_cost')::numeric);
   insert into app_private.inventory_balances(product_id) values(pid);
  else
   select * into p from app_private.products where id=pid and deleted_at is null for update;
   if p.id is null or p.version is distinct from (payload->>'version')::integer then raise exception 'VERSION_CONFLICT'; end if;
   if p.sku<>upper(trim(payload->>'sku')) and (exists(select 1 from app_private.inventory_movements where product_id=pid) or exists(select 1 from app_private.sales_order_items where product_id=pid)) then raise exception 'SKU_IMMUTABLE'; end if;
   select fixed_cost into cost from app_private.product_costs where product_id=pid for update;
   detail:=p.sku||': tên '||p.name||' → '||trim(payload->>'name')||'; giá bán '||p.sale_price||' → '||(payload->>'sale_price')||'; vốn '||cost||' → '||(payload->>'fixed_cost');
   update app_private.products set sku=upper(trim(payload->>'sku')),name=trim(payload->>'name'),glass_type=payload->>'glass_type',models=array(select distinct trim(value) from jsonb_array_elements_text(payload->'models') where trim(value)<>''),brand=coalesce(payload->>'brand','other'),sale_price=(payload->>'sale_price')::numeric,price_version=price_version+case when sale_price<>(payload->>'sale_price')::numeric then 1 else 0 end,active=(payload->>'active')::boolean,image_path=payload->>'image_path',version=version+1 where id=pid;
   update app_private.product_costs set fixed_cost=(payload->>'fixed_cost')::numeric where product_id=pid;
  end if;
  if payload ? 'glass_brand_id' then
   update app_private.products set glass_brand_id=(payload->>'glass_brand_id')::uuid where id=pid;
  end if;
  result:=jsonb_build_object('id',pid); detail:=coalesce(detail,payload->>'sku');
 elsif act='delete_product' then
  perform app_private.only_keys(payload,array['action','key','id','version']);
  pid:=(payload->>'id')::uuid;
  select * into p from app_private.products where id=pid and deleted_at is null for update;
  if p.id is null then raise exception 'PRODUCT_NOT_FOUND'; end if;
  if p.version is distinct from (payload->>'version')::integer then raise exception 'VERSION_CONFLICT'; end if;
  select * into b from app_private.inventory_balances where product_id=pid for update;
  if b.on_hand<>0 then raise exception 'PRODUCT_HAS_STOCK'; end if;
  if exists(select 1 from app_private.sales_order_items item join app_private.sales_orders order_row on order_row.id=item.order_id where item.product_id=pid and order_row.status='draft') then raise exception 'PRODUCT_IN_USE'; end if;
  update app_private.products set active=false,deleted_at=now(),version=version+1 where id=pid;
  result:=jsonb_build_object('id',pid); detail:=p.sku; act:='product.delete';
 elsif act='inventory' then
  perform app_private.only_keys(payload,array['action','key','type','reason','items']);
  kind:=payload->>'type';
  if kind not in ('opening','receipt','issue','damage','adjustment') or length(trim(coalesce(payload->>'reason',''))) not between 1 and 1000 then raise exception 'VALIDATION_ERROR'; end if;
  if coalesce(jsonb_array_length(payload->'items'),0) not between 1 and 100 then raise exception 'VALIDATION_ERROR'; end if;
  insert into app_private.inventory_documents(type,reason,created_by) values(kind,trim(payload->>'reason'),u.id) returning id into docid;
  for el in select value from jsonb_array_elements(payload->'items') order by value->>'product_id' loop
   perform app_private.only_keys(el,array['product_id','quantity','purchase_price','stock_version']);
   if (el->>'quantity') !~ '^[0-9]+$' then raise exception 'VALIDATION_ERROR'; end if;
   pid:=(el->>'product_id')::uuid; n:=(el->>'quantity')::integer;
   if n>1000000 or (kind<>'adjustment' and n<=0) then raise exception 'VALIDATION_ERROR'; end if;
   select * into p from app_private.products where id=pid for share;
   select fixed_cost into cost from app_private.product_costs where product_id=pid for share;
   select * into b from app_private.inventory_balances where product_id=pid for update;
   if kind='opening' and exists(select 1 from app_private.inventory_movements where product_id=pid) then raise exception 'OPENING_EXISTS'; end if;
   if kind='adjustment' and b.version is distinct from (el->>'stock_version')::integer then raise exception 'VERSION_CONFLICT'; end if;
   delta:=case when kind='adjustment' then n-b.on_hand when kind in ('issue','damage') then -n else n end;
   if delta=0 then continue; end if;
   if kind='receipt' and (el->>'purchase_price' is null or (el->>'purchase_price') !~ '^[0-9]{1,15}$') then raise exception 'VALIDATION_ERROR'; end if;
   insert into app_private.inventory_document_items(document_id,product_id,quantity_delta,unit_purchase_price,fixed_cost_snapshot,sku_snapshot,name_snapshot) values(docid,pid,delta,(el->>'purchase_price')::numeric,cost,p.sku,p.name) returning id into lineid;
   perform app_private.move_stock(pid,delta,kind,u.id,lineid);
  end loop;
  result:=jsonb_build_object('id',docid); detail:=kind||': '||(payload->>'reason');
 elsif act='exchange' then
  perform app_private.only_keys(payload,array['action','key','return_id']);
  retid:=(payload->>'return_id')::uuid;
  perform 1 from app_private.sales_returns where id=retid for update;
  if not found then raise exception 'VALIDATION_ERROR'; end if;
  select id into oid from app_private.sales_orders where exchange_return_id=retid;
  if oid is null then insert into app_private.sales_orders(created_by,exchange_return_id,note) values(u.id,retid,'Đổi hàng từ phiếu trả '||retid) returning id into oid; end if;
  result:=jsonb_build_object('id',oid); detail:=oid::text;
 elsif act='glass_brand' then
  perform app_private.only_keys(payload,array['action','key','name']);
  insert into app_private.glass_brands(name) values(regexp_replace(trim(payload->>'name'),'\s+',' ','g')) returning id into pid;
  result:=jsonb_build_object('id',pid); detail:=payload->>'name';
 elsif act='staff_profile' then
  perform app_private.only_keys(payload,array['action','key','id','display_name']);
  pid:=(payload->>'id')::uuid;
  insert into app_private.app_users(id,display_name,role) values(pid,trim(payload->>'display_name'),'staff');
  result:=jsonb_build_object('id',pid); detail:=payload->>'display_name';
 elsif act='staff_state' then
  perform app_private.only_keys(payload,array['action','key','id','active','display_name']);
  pid:=(payload->>'id')::uuid;
  if not exists(select 1 from app_private.app_users where id=pid and role='staff') then raise exception 'FORBIDDEN'; end if;
  update app_private.app_users set active=coalesce((payload->>'active')::boolean,active),display_name=coalesce(payload->>'display_name',display_name) where id=pid;
  result:=jsonb_build_object('id',pid); detail:=pid::text;
 else raise exception 'VALIDATION_ERROR: unknown action'; end if;
 insert into app_private.audit_logs(actor_id,action,detail) values(u.id,act,coalesce(detail,''));
 update app_private.mutation_requests set result=write_block.result where actor_id=u.id and request_key=key;
 return result;
end $$;
