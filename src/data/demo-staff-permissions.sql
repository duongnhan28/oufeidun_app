alter table app_private.app_users add column if not exists permissions jsonb;
alter table app_private.app_users add column if not exists permissions_version integer not null default 1;
alter table app_private.products add column if not exists cost_configured boolean not null default true;
create or replace function app_private.require_capability(actor app_private.app_users, capability text) returns void language plpgsql set search_path='' as $$
begin
 if actor.role<>'admin' and not coalesce((actor.permissions->>capability)::boolean,actor.permissions is null and capability<>'receive_stock') then raise exception 'FORBIDDEN';end if;
end $$;
create or replace function app_private.check_capability(actor app_private.app_users,fn text,payload jsonb) returns void language plpgsql set search_path='' as $$
declare act text:=payload->>'action';p app_private.products;
begin
 if fn in ('shop_write','shop_partial_fulfillment') and act='confirm_order' and exists(select 1 from app_private.sales_order_items i join app_private.products item_product on item_product.id=i.product_id where i.order_id=(payload->>'id')::uuid and not item_product.cost_configured) then raise exception 'COST_NOT_CONFIGURED';end if;
 if fn='shop_write' then
  if act in ('product','glass_brand','delete_product') then perform app_private.require_capability(actor,'manage_products');end if;
  if act in ('return_order','cancel_order','exchange') then perform app_private.require_capability(actor,'manage_returns');end if;
  if act='staff_state' and actor.role<>'admin' then raise exception 'FORBIDDEN';end if;
  if act='inventory' then perform app_private.require_capability(actor,case when payload->>'type'='receipt' then 'receive_stock' else 'adjust_stock' end);end if;
  if act='product' and actor.role<>'admin' and not coalesce((actor.permissions->>'manage_prices')::boolean,actor.permissions is null) then
   select * into p from app_private.products where id=nullif(payload->>'id','')::uuid;
   if (payload->>'sale_price')::numeric<>coalesce(p.sale_price,0) or coalesce((payload->>'wholesale_price')::numeric,0)<>coalesce(p.wholesale_price,0) then raise exception 'FORBIDDEN';end if;
  end if;
 elsif fn in ('shop_set_wholesale_price','shop_bulk_price') then perform app_private.require_capability(actor,'manage_prices');
 elsif fn='shop_read' and act='report' then perform app_private.require_capability(actor,'view_reports');
 elsif fn='shop_partial_fulfillment' and act in ('cancel_order','return_order','exchange') then perform app_private.require_capability(actor,'manage_returns');
 end if;
end $$;
create or replace function app_private.cost_configuration() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then update app_private.products set cost_configured=(select role='admin' from app_private.app_users where id=auth.uid()) where id=new.product_id;
 elsif (select role from app_private.app_users where id=auth.uid())='admin' then update app_private.products set cost_configured=true where id=new.product_id;end if;return new;
end $$;
drop trigger if exists cost_configuration on app_private.product_costs;
create trigger cost_configuration after insert or update on app_private.product_costs for each row execute function app_private.cost_configuration();
create or replace function app_private.report_product_sales(payload jsonb) returns jsonb language sql set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') from (
 select p.sku,p.name,p.glass_type,p.id product_id,(select coalesce(jsonb_agg(n.sku),'[]') from app_private.product_sku_names n where n.product_id=p.id and n.sku<>p.sku) sku_aliases,c.unit_cost_snapshot::text unit_cost,i.unit_sale_price::text sale_price,sum(i.delivered_quantity-coalesce(rt.quantity,0))::integer quantity,sum((i.delivered_quantity-coalesce(rt.quantity,0))*c.unit_cost_snapshot)::text total_cost,sum((i.delivered_quantity-coalesce(rt.quantity,0))*i.unit_sale_price)::text revenue,sum((i.delivered_quantity-coalesce(rt.quantity,0))*(i.unit_sale_price-c.unit_cost_snapshot))::text profit
 from app_private.sales_order_items i join app_private.sales_orders o on o.id=i.order_id join app_private.products p on p.id=i.product_id join app_private.sales_item_costs c on c.order_item_id=i.id
 left join (select ri.order_item_id,sum(ri.quantity) quantity from app_private.sales_return_items ri join app_private.sales_returns r on r.id=ri.return_id where r.posted_at<(((payload->>'to')::date+1)::timestamp at time zone 'Asia/Ho_Chi_Minh') group by ri.order_item_id) rt on rt.order_item_id=i.id
 where o.confirmed_at is not null and o.status in ('confirmed','partially_returned','returned') and coalesce(o.ordered_at,o.confirmed_at,o.created_at)>=((payload->>'from')::date::timestamp at time zone 'Asia/Ho_Chi_Minh') and coalesce(o.ordered_at,o.confirmed_at,o.created_at)<(((payload->>'to')::date+1)::timestamp at time zone 'Asia/Ho_Chi_Minh') and (coalesce(payload->>'brand','all')='all' or p.brand=payload->>'brand')
 group by p.id,c.unit_cost_snapshot,i.unit_sale_price order by revenue desc) x;
$$;
do $patch$
declare target text;def text;
begin
 foreach target in array array['shop_write','shop_read','shop_partial_fulfillment','shop_set_wholesale_price','shop_bulk_price'] loop
  def:=pg_get_functiondef(('public.'||target||'(jsonb)')::regprocedure);
  if position('-- capabilities_v1' in def)=0 then
   if position('u:=app_private.current_actor();' in def)>0 then
    def:=replace(def,'u:=app_private.current_actor();','u:=app_private.current_actor(); -- capabilities_v1'||chr(10)||'perform app_private.check_capability(u,'||quote_literal(target)||',payload);');
   elsif position('actor:=app_private.current_actor();' in def)>0 then
    def:=replace(def,'actor:=app_private.current_actor();','actor:=app_private.current_actor(); -- capabilities_v1'||chr(10)||'perform app_private.check_capability(actor,'||quote_literal(target)||',payload);');
   else raise exception 'Missing actor marker for %',target;end if;
   if target='shop_write' then
    def:=replace(def,$old$(act='inventory' and payload->>'type' in ('receipt','opening'))$old$,$new$(act='inventory' and payload->>'type'='opening')$new$);
    def:=replace(def,$old$or coalesce(el->>'purchase_price','') !~ '^[0-9]{1,15}$'$old$,$new$or (u.role='admin' and coalesce(el->>'purchase_price','') !~ '^[0-9]{1,15}$')$new$);
    def:=replace(def,$old$(el->>'purchase_price')::numeric$old$,$new$case when u.role='admin' then (el->>'purchase_price')::numeric else 0 end$new$);
    def:=replace(def,$old$if kind='receipt' and ($old$,$new$if kind='receipt' and u.role='admin' and ($new$);
    def:=replace(def,$old$delta,case when u.role='admin' then (el->>'purchase_price')::numeric else 0 end,cost$old$,$new$delta,case when u.role='admin' then (el->>'purchase_price')::numeric else null end,cost$new$);
   end if;
   if target='shop_read' and position('report_product_sales' in def)=0 then
    def:=replace(def,'app_private.report_order_totals(payload,result)', $new$(app_private.report_order_totals(payload,result)||jsonb_build_object('sales',app_private.report_product_sales(payload),'unconfigured_products',(select count(*) from app_private.products p join app_private.inventory_balances b on b.product_id=p.id where p.deleted_at is null and b.on_hand>0 and not p.cost_configured)))$new$);
   end if;
   execute def;
  end if;
 end loop;
end $patch$;
revoke all on function app_private.require_capability(app_private.app_users,text),app_private.check_capability(app_private.app_users,text,jsonb),app_private.cost_configuration() from public,anon,authenticated;
revoke all on function app_private.report_product_sales(jsonb) from public,anon,authenticated;
