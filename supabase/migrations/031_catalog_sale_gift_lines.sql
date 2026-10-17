-- Shared demo/isolated PostgreSQL implementation of catalog + optional gift lines.
do $$declare constraintname text;begin
 for constraintname in select conname from pg_constraint where conrelid='app_ban_hang.sales_order_items'::regclass and contype='u' and pg_get_constraintdef(oid)='UNIQUE (order_id, product_id)' loop
  execute format('alter table app_ban_hang.sales_order_items drop constraint %I',constraintname);
 end loop;
end $$;
do $$begin
 if not exists(select 1 from pg_constraint where conname='sales_order_items_order_product_kind' and conrelid='app_ban_hang.sales_order_items'::regclass) then
  alter table app_ban_hang.sales_order_items add constraint sales_order_items_order_product_kind unique(order_id,product_id,item_kind);
 end if;
end $$;
create or replace function app_ban_hang.save_sale_details(orderid uuid, payload jsonb, items jsonb) returns void language plpgsql set search_path='' as $$
declare o app_ban_hang.sales_orders; cid uuid; sid uuid;begin
 select * into o from app_ban_hang.sales_orders where id=orderid;
 cid:=(public.app_ban_hang_customer(jsonb_build_object('id',payload->>'customer_id','name',o.customer_name,'phone',o.customer_phone,'customer_type',payload->>'customer_type','address',payload->>'customer_address','note',coalesce(payload->>'customer_note','')))->>'id')::uuid;
 sid:=coalesce((payload->>'sales_user_id')::uuid,o.created_by);
 if not exists(select 1 from app_ban_hang.app_users where id=sid and active) then raise exception 'INVALID_SALES_USER';end if;
 update app_ban_hang.sales_orders set customer_id=cid,sales_user_id=sid where id=orderid;
 perform public.app_ban_hang_order_business(payload||jsonb_build_object('order_id',orderid,'order_code',o.order_code));
 perform public.app_ban_hang_order_features(payload||jsonb_build_object('action','save','order_id',orderid,'items',items));
end $$;

do $patch$
declare def text;begin
 select pg_get_functiondef('public.app_ban_hang_write(jsonb)'::regprocedure) into def;
 if position('-- sale_lines_v2' in def)=0 then
  def:=replace(def,'''extra_cost_note'']','''extra_cost_note'',''order_code'',''sale_details'']');
  def:=replace(def,'''image_path'']','''image_path'',''wholesale_price'']');
  def:=replace(def,'''glass_brand_id'']','''glass_brand_id'',''wholesale_price'']');
  def:=replace(def,'''active'']','''active'',''wholesale_price'']');
  def:=replace(def,'result:=jsonb_build_object(''id'',pid); detail:=coalesce(detail,payload->>''sku'');','if payload ? ''wholesale_price'' then perform public.app_ban_hang_set_wholesale_price(jsonb_build_object(''product_id'',pid,''wholesale_price'',payload->>''wholesale_price''));end if; result:=jsonb_build_object(''id'',pid); detail:=coalesce(detail,payload->>''sku'');');
  def:=replace(def,$keys$'product_id','quantity','custom_name'$keys$, $keys$'product_id','quantity','custom_name','item_kind','unit_sale_price','price_overridden','save_customer_price','zero_price_confirm','item_note','quoted_price_version','price_source'$keys$);
  def:=replace(def,'where order_id=oid and product_id=pid;','where order_id=oid and product_id=pid and item_kind=coalesce(el->>''item_kind'',''sale'');');
  def:=replace(def,'(order_id,product_id,quantity,custom_name,unit_sale_price,quoted_price_version)','(order_id,product_id,quantity,custom_name,unit_sale_price,quoted_price_version,item_kind)');
  def:=replace(def,'end,p.sale_price,p.price_version)','end,p.sale_price,p.price_version,coalesce(el->>''item_kind'',''sale''))');
  def:=replace(def,'on conflict(order_id,product_id)','on conflict(order_id,product_id,item_kind)');
  def:=replace(def,'count(distinct value->>''product_id'')','count(distinct ((value->>''product_id'')||'':''||coalesce(value->>''item_kind'',''sale'')))');
  def:=replace(def,'product_id not in(select (value->>''product_id'')::uuid from jsonb_array_elements(payload->''items''))','not exists(select 1 from jsonb_array_elements(payload->''items'') as entry(value) where (entry.value->>''product_id'')::uuid=sales_order_items.product_id and coalesce(entry.value->>''item_kind'',''sale'')=sales_order_items.item_kind)');
  def:=replace(def,'result:=jsonb_build_object(''id'',oid); detail:=oid::text;',E'-- sale_lines_v2\n  if payload ? ''order_code'' then\n   if length(trim(coalesce(payload->>''order_code'',''''))) not between 1 and 50 then raise exception ''VALIDATION_ERROR'';end if;\n   update app_ban_hang.sales_orders set order_code=trim(payload->>''order_code'') where id=oid;\n  end if;\n  if payload ? ''sale_details'' then perform app_ban_hang.save_sale_details(oid,payload->''sale_details'',payload->''items'');end if;\n  result:=jsonb_build_object(''id'',oid); detail:=oid::text;');
  execute def;
 end if;

 select pg_get_functiondef('public.app_ban_hang_order_features(jsonb)'::regprocedure) into def;
 def:=replace(def,'product_id=(item->>''product_id'')::uuid for update','product_id=(item->>''product_id'')::uuid and item_kind=coalesce(item->>''item_kind'',''sale'') for update');execute def;
 select pg_get_functiondef('public.app_ban_hang_order_extras()'::regprocedure) into def;
 if position('''id'',i.id' in def)=0 then def:=replace(def,'''product_id'',i.product_id,','''id'',i.id,''product_id'',i.product_id,');execute def;end if;
end $patch$;
do $$declare def text;begin
 select pg_get_functiondef('public.app_ban_hang_bulk_price(jsonb)'::regprocedure) into def;
 def:=replace(def,'p.glass_type=group_type','(p.glass_type=group_type or (group_type in (''clear'',''full_border'') and p.glass_type in (''clear'',''full_border'')))');
 def:=replace(def,'where glass_type=group_type and active','where (glass_type=group_type or (group_type in (''clear'',''full_border'') and glass_type in (''clear'',''full_border''))) and active');
 if position('-- category_alias_v1' in def)=0 then def:=replace(def,'begin',E'begin\n -- category_alias_v1');execute def;end if;
end $$;
revoke all on function app_ban_hang.save_sale_details(uuid,jsonb,jsonb) from public,anon,authenticated;
