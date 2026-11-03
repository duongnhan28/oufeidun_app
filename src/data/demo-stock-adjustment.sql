-- Read-only additions: display reasons already stored on inventory documents.
create or replace function app_private.inventory_report_movements(payload jsonb)
returns jsonb language sql set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') from (
 select m.occurred_at,p.sku,p.name,p.glass_type,m.movement_type,m.quantity_delta,m.balance_after,
 coalesce(sales.display_name,actor.display_name) sales,
 coalesce(o.order_code,case when o.order_no is not null then 'DH-'||lpad(o.order_no::text,5,'0') end) order_no,d.reason
 from app_private.inventory_movements m join app_private.products p on p.id=m.product_id join app_private.app_users actor on actor.id=m.actor_id
 left join app_private.sales_return_items ri on ri.id=m.return_item_id
 left join app_private.sales_order_items i on i.id=coalesce(m.sale_order_item_id,ri.order_item_id)
 left join app_private.sales_orders o on o.id=i.order_id left join app_private.app_users sales on sales.id=o.sales_user_id
 left join app_private.inventory_document_items di on di.id=m.inventory_document_item_id left join app_private.inventory_documents d on d.id=di.document_id
 where m.occurred_at>=((payload->>'from')::date::timestamp at time zone 'Asia/Ho_Chi_Minh')
 and m.occurred_at<(((payload->>'to')::date+1)::timestamp at time zone 'Asia/Ho_Chi_Minh')
 and (coalesce(nullif(trim(payload->>'brand'),''),'all')='all' or p.brand=payload->>'brand')
 order by m.occurred_at desc limit 10000) x;
$$;
revoke all on function app_private.inventory_report_movements(jsonb) from public,anon,authenticated;
do $patch$
declare def text;
begin
 def:=pg_get_functiondef('public.shop_read(jsonb)'::regprocedure);
 def:=replace(def,'select m.*,p.sku,p.name,a.display_name actor_name from app_private.inventory_movements m join app_private.products p on p.id=m.product_id join app_private.app_users a on a.id=m.actor_id where',
 'select m.*,p.sku,p.name,a.display_name actor_name,d.reason from app_private.inventory_movements m join app_private.products p on p.id=m.product_id join app_private.app_users a on a.id=m.actor_id left join app_private.inventory_document_items di on di.id=m.inventory_document_item_id left join app_private.inventory_documents d on d.id=di.document_id where');
 def:=replace(def,'l.detail like ''opening:%''))','l.detail like ''opening:%'' or l.detail like ''adjustment:%''))');
 execute def;
 def:=pg_get_functiondef('app_private.report_order_totals(jsonb,jsonb)'::regprocedure);
 if position('inventory_report_movements' in def)=0 then
  def:=replace(def,'''order_count'',orders)', '''order_count'',orders,''movements'',app_private.inventory_report_movements(payload))');
  if position('inventory_report_movements' in def)=0 then raise exception 'Missing report totals marker'; end if;
  execute def;
 end if;
end $patch$;
