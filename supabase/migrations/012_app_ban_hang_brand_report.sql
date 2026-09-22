-- Accurate report totals and inventory filtered by phone brand.
create or replace function public.app_ban_hang_report(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor app_ban_hang.app_users;
  d1 timestamptz;
  d2 timestamptz;
  brand_filter text := coalesce(nullif(trim(payload->>'brand'),''),'all');
  rev numeric := 0;
  refunds numeric := 0;
  cost numeric := 0;
  reversed_cost numeric := 0;
  damage numeric := 0;
  sold integer := 0;
begin
  actor := app_ban_hang.current_actor();
  if actor.role <> 'admin' then raise exception 'FORBIDDEN'; end if;
  perform app_ban_hang.only_keys(payload,array['from','to','brand']);
  d1 := (payload->>'from')::date::timestamp at time zone 'Asia/Ho_Chi_Minh';
  d2 := ((payload->>'to')::date+1)::timestamp at time zone 'Asia/Ho_Chi_Minh';
  if d1 is null or d2 is null or d2<=d1 or d2-d1>interval '366 days' or length(brand_filter)>100 then raise exception 'VALIDATION_ERROR'; end if;

  select coalesce(sum(i.quantity*i.unit_sale_price),0),coalesce(sum(i.quantity*c.unit_cost_snapshot),0),coalesce(sum(i.quantity),0)
  into rev,cost,sold
  from app_ban_hang.sales_orders o
  join app_ban_hang.sales_order_items i on i.order_id=o.id
  join app_ban_hang.sales_item_costs c on c.order_item_id=i.id
  join app_ban_hang.products p on p.id=i.product_id
  where o.confirmed_at>=d1 and o.confirmed_at<d2 and (brand_filter='all' or p.brand=brand_filter);

  select coalesce(sum(i.quantity*i.unit_sale_price),0),coalesce(sum(i.quantity*c.unit_cost_snapshot),0)
  into refunds,reversed_cost
  from app_ban_hang.sales_orders o
  join app_ban_hang.sales_order_items i on i.order_id=o.id
  join app_ban_hang.sales_item_costs c on c.order_item_id=i.id
  join app_ban_hang.products p on p.id=i.product_id
  where o.cancelled_at>=d1 and o.cancelled_at<d2 and (brand_filter='all' or p.brand=brand_filter);

  select refunds+coalesce(sum(r.refund_amount),0),
         reversed_cost+coalesce(sum(r.quantity*c.unit_cost_snapshot),0),
         coalesce(sum((r.quantity-r.restock_quantity)*c.unit_cost_snapshot),0)
  into refunds,reversed_cost,damage
  from app_ban_hang.sales_returns h
  join app_ban_hang.sales_return_items r on r.return_id=h.id
  join app_ban_hang.sales_order_items sold_item on sold_item.id=r.order_item_id
  join app_ban_hang.sales_item_costs c on c.order_item_id=r.order_item_id
  join app_ban_hang.products p on p.id=sold_item.product_id
  where h.posted_at>=d1 and h.posted_at<d2 and (brand_filter='all' or p.brand=brand_filter);

  select damage+coalesce(sum(-i.quantity_delta*i.fixed_cost_snapshot),0)
  into damage
  from app_ban_hang.inventory_documents h
  join app_ban_hang.inventory_document_items i on i.document_id=h.id
  join app_ban_hang.products p on p.id=i.product_id
  where h.type='damage' and h.posted_at>=d1 and h.posted_at<d2 and (brand_filter='all' or p.brand=brand_filter);

  return jsonb_build_object(
    'revenue',(rev-refunds)::text,
    'refunds',refunds::text,
    'cost',(cost-reversed_cost)::text,
    'profit',(rev-refunds-cost+reversed_cost)::text,
    'damage',damage::text,
    'sold',sold,
    'stock',(select coalesce(sum(b.on_hand),0) from app_ban_hang.inventory_balances b join app_ban_hang.products p on p.id=b.product_id where brand_filter='all' or p.brand=brand_filter),
    'stock_value',(select coalesce(sum(b.on_hand*c.fixed_cost),0)::text from app_ban_hang.inventory_balances b join app_ban_hang.product_costs c on c.product_id=b.product_id join app_ban_hang.products p on p.id=b.product_id where brand_filter='all' or p.brand=brand_filter),
    'inventory',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from (
      select p.sku,p.name,
        coalesce(sum(m.quantity_delta) filter(where m.occurred_at<d1),0) opening,
        coalesce(sum(m.quantity_delta) filter(where m.occurred_at>=d1 and m.quantity_delta>0),0) incoming,
        coalesce(-sum(m.quantity_delta) filter(where m.occurred_at>=d1 and m.quantity_delta<0),0) outgoing,
        coalesce(sum(m.quantity_delta),0) closing
      from app_ban_hang.products p
      left join app_ban_hang.inventory_movements m on m.product_id=p.id and m.occurred_at<d2
      where brand_filter='all' or p.brand=brand_filter
      group by p.id,p.sku,p.name order by p.sku limit 5000
    ) x)
  );
end
$$;

revoke all on function public.app_ban_hang_report(jsonb) from public, anon;
grant execute on function public.app_ban_hang_report(jsonb) to authenticated;
