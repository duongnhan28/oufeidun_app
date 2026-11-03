-- Refresh demo reporting without touching production schemas or historical rows.
create or replace function app_private.report_order_totals(payload jsonb, base jsonb)
returns jsonb language plpgsql set search_path='' as $$
declare d1 timestamptz; d2 timestamptz; brand_filter text:=coalesce(nullif(trim(payload->>'brand'),''),'all');
 products numeric; costs numeric; fees numeric; units bigint; orders bigint;
begin
 d1:=(payload->>'from')::date::timestamp at time zone 'Asia/Ho_Chi_Minh';
 d2:=((payload->>'to')::date+1)::timestamp at time zone 'Asia/Ho_Chi_Minh';
 select coalesce(sum((i.delivered_quantity-coalesce(ret.qty,0))*i.unit_sale_price),0),
   coalesce(sum((i.delivered_quantity-coalesce(ret.qty,0))*c.unit_cost_snapshot),0),
   coalesce(sum(i.delivered_quantity-coalesce(ret.qty,0)),0),count(distinct o.id)
 into products,costs,units,orders
 from app_private.sales_orders o join app_private.sales_order_items i on i.order_id=o.id
 join app_private.sales_item_costs c on c.order_item_id=i.id join app_private.products p on p.id=i.product_id
 left join (select ri.order_item_id,sum(ri.quantity) qty from app_private.sales_return_items ri
   join app_private.sales_returns r on r.id=ri.return_id where r.posted_at<d2 group by ri.order_item_id) ret on ret.order_item_id=i.id
 where o.confirmed_at is not null and o.status in ('confirmed','partially_returned','returned')
 and coalesce(o.ordered_at,o.confirmed_at,o.created_at)>=d1 and coalesce(o.ordered_at,o.confirmed_at,o.created_at)<d2
 and (brand_filter='all' or p.brand=brand_filter);
 select coalesce(sum(o.extra_cost),0) into fees from app_private.sales_orders o
 where o.confirmed_at is not null and o.status in ('confirmed','partially_returned','returned')
 and coalesce(o.ordered_at,o.confirmed_at,o.created_at)>=d1 and coalesce(o.ordered_at,o.confirmed_at,o.created_at)<d2
 and (brand_filter='all' or exists(select 1 from app_private.sales_order_items i join app_private.products p on p.id=i.product_id where i.order_id=o.id and p.brand=brand_filter));
 return base||jsonb_build_object('product_revenue',products::text,'other_charges',fees::text,
 'revenue',(products+fees)::text,'order_value',(products+fees)::text,'cost',costs::text,
 'profit',(products+fees-costs)::text,'sold',units,'order_count',orders);
end $$;
revoke all on function app_private.report_order_totals(jsonb,jsonb) from public,anon,authenticated;
do $patch$
declare def text;
begin
 def:=pg_get_functiondef('public.shop_read(jsonb)'::regprocedure);
 if position('app_private.report_order_totals' in def)=0 then
  def:=replace(def,'return app_private.visible_data(u.role,result);',
    'return app_private.visible_data(u.role,case when act=''report'' then app_private.report_order_totals(payload,result) else result end);');
  if position('app_private.report_order_totals' in def)=0 then raise exception 'Missing report return marker'; end if;
  execute def;
 end if;
end $patch$;
