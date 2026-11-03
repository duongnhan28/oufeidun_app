create table if not exists app_private.product_sku_names(sku text not null,product_id uuid not null references app_private.products(id),created_at timestamptz not null default now());
create unique index if not exists product_sku_names_unique on app_private.product_sku_names(lower(sku));
create table if not exists app_private.product_sku_renames(id uuid primary key default gen_random_uuid(),product_id uuid not null references app_private.products(id),old_sku text not null,new_sku text not null,actor_id uuid references app_private.app_users(id),created_at timestamptz not null default now());
insert into app_private.product_sku_names(sku,product_id) select sku,id from app_private.products on conflict(lower(sku)) do nothing;
update app_private.sales_order_items i set sku_snapshot=p.sku from app_private.products p where p.id=i.product_id and i.sku_snapshot is null;

create or replace function app_private.reserve_product_sku() returns trigger language plpgsql set search_path='' as $$
declare owner uuid;
begin
 insert into app_private.product_sku_names(sku,product_id) values(new.sku,new.id) on conflict(lower(sku)) do update set sku=app_private.product_sku_names.sku returning product_id into owner;
 if owner<>new.id then raise exception 'SKU_ALIAS_CONFLICT';end if;
 if tg_op='UPDATE' and old.sku is distinct from new.sku then
  insert into app_private.product_sku_renames(product_id,old_sku,new_sku,actor_id) values(new.id,old.sku,new.sku,auth.uid());
  insert into app_private.audit_logs(actor_id,action,detail) values(auth.uid(),'product.rename',new.id||' / '||old.sku||' -> '||new.sku);
 end if;
 return new;
end $$;
drop trigger if exists reserve_product_sku on app_private.products;
create trigger reserve_product_sku after insert or update of sku on app_private.products for each row execute function app_private.reserve_product_sku();

create or replace function app_private.selected_sku(pid uuid,label text) returns text language plpgsql set search_path='' as $$
declare result text;
begin
 if label is null then select sku into result from app_private.products where id=pid;return result;end if;
 select sku into result from app_private.product_sku_names where product_id=pid and lower(sku)=lower(trim(label));
 if result is null then raise exception 'SKU_ALIAS_CONFLICT';end if;return result;
end $$;
create or replace function app_private.keep_item_sku() returns trigger language plpgsql set search_path='' as $$
declare saved text;
begin
 if tg_op='UPDATE' and old.sku_snapshot is not null then new.sku_snapshot:=old.sku_snapshot;
 else
  select sku_snapshot into saved from app_private.sales_order_items where order_id=new.order_id and product_id=new.product_id and item_kind=new.item_kind;
  new.sku_snapshot:=coalesce(saved,new.sku_snapshot,(select sku from app_private.products where id=new.product_id));
 end if;return new;
end $$;
drop trigger if exists keep_item_sku on app_private.sales_order_items;
create trigger keep_item_sku before insert or update on app_private.sales_order_items for each row execute function app_private.keep_item_sku();

create or replace function app_private.resolve_import_skus(payload jsonb) returns jsonb language plpgsql set search_path='' as $$
declare result jsonb:='[]'; item jsonb; current_sku text;
begin
 for item in select value from jsonb_array_elements(payload->'items') loop
  if item ? 'sku' then
   select p.sku into current_sku from app_private.product_sku_names n join app_private.products p on p.id=n.product_id where lower(n.sku)=lower(trim(item->>'sku'));
   if current_sku is not null then item:=item||jsonb_build_object('sku',current_sku);end if;
  end if;result:=result||jsonb_build_array(item);
 end loop;return payload||jsonb_build_object('items',result);
end $$;
revoke all on all tables in schema app_private from public,anon,authenticated;
revoke all on function app_private.reserve_product_sku(),app_private.keep_item_sku(),app_private.selected_sku(uuid,text),app_private.resolve_import_skus(jsonb) from public,anon,authenticated;

do $patch$
declare def text;
begin
 def:=pg_get_functiondef('public.shop_write(jsonb)'::regprocedure);
 def:=regexp_replace(def,'if p.sku<>upper\(trim\(payload->>''sku''\)\)[^;]+raise exception ''SKU_IMMUTABLE''; end if;','','g');
 if position('SKU_IMMUTABLE' in def)>0 then raise exception 'Unexpected SKU lock';end if;
 if position('-- rename_skus_v1' in def)=0 then
  def:=replace(def,'if act=''save_draft'' then',E'-- rename_skus_v1\n if act in (''inventory'',''import_products'') then payload:=app_private.resolve_import_skus(payload);end if;\n if act=''save_draft'' then');
  def:=replace(def,'''quoted_price_version'',''price_source'']','''quoted_price_version'',''price_source'',''selected_sku'']');
  def:=replace(def,'quoted_price_version,item_kind)','quoted_price_version,item_kind,sku_snapshot)');
  def:=replace(def,'p.price_version,coalesce(el->>''item_kind'',''sale''))','p.price_version,coalesce(el->>''item_kind'',''sale''),app_private.selected_sku(pid,el->>''selected_sku''))');
 end if;
 execute def;
 def:=pg_get_functiondef('public.shop_read(jsonb)'::regprocedure);
 if position('sku_aliases' in def)=0 then
  def:=replace(def,'p.models,p.brand,','p.models,(select coalesce(jsonb_agg(n.sku),''[]'') from app_private.product_sku_names n where n.product_id=p.id and n.sku<>p.sku) sku_aliases,p.brand,');
 end if;
 def:=replace(def,'select m.*,p.sku,p.name,a.display_name actor_name,d.reason','select m.*,coalesce(i.sku_snapshot,di.sku_snapshot,p.sku) sku,p.sku current_sku,p.name,a.display_name actor_name,d.reason');
 def:=replace(def,'left join app_private.inventory_documents d on d.id=di.document_id where m.product_id=', 'left join app_private.inventory_documents d on d.id=di.document_id left join app_private.sales_return_items ri on ri.id=m.return_item_id left join app_private.sales_order_items i on i.id=coalesce(m.sale_order_item_id,ri.order_item_id) where m.product_id=');
 def:=replace(def,'l.action in (''confirm_order'',''deliver_order'')','l.action in (''confirm_order'',''deliver_order'',''product.rename'')');execute def;
 def:=pg_get_functiondef('app_private.inventory_report_movements(jsonb)'::regprocedure);
 def:=replace(def,'m.occurred_at,p.sku,p.name,','m.occurred_at,coalesce(i.sku_snapshot,di.sku_snapshot,p.sku) sku,p.sku current_sku,p.name,');execute def;
end $patch$;
