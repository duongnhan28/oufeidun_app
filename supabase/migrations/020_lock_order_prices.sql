-- Derive every order price from the product price table. Client accounts cannot
-- submit an arbitrary sale price; gifts and samples remain zero-value stock lines.
create or replace function public.app_ban_hang_order_features(payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor app_ban_hang.app_users;
  order_row app_ban_hang.sales_orders;
  item jsonb;
  item_row app_ban_hang.sales_order_items;
  item_kind_value text;
  customer_type_value text;
  applied_price numeric;
  amount_value numeric;
  payment_id uuid;
begin
  actor:=app_ban_hang.current_actor();
  select * into order_row from app_ban_hang.sales_orders where id=(payload->>'order_id')::uuid for update;
  if order_row.id is null or (actor.role<>'admin' and order_row.created_by<>actor.id) then raise exception 'FORBIDDEN'; end if;

  if payload->>'action'='save' then
    if order_row.status<>'draft' or jsonb_typeof(payload->'items')<>'array' then raise exception 'INVALID_ORDER_STATE'; end if;
    customer_type_value:=coalesce(payload->>'customer_type','retail');
    if length(coalesce(payload->>'customer_address',''))>500 or customer_type_value not in ('retail','wholesale') then raise exception 'VALIDATION_ERROR'; end if;

    update app_ban_hang.sales_orders set
      customer_address=trim(coalesce(payload->>'customer_address','')),
      customer_type=customer_type_value
    where id=order_row.id;

    for item in select value from jsonb_array_elements(payload->'items') loop
      item_kind_value:=coalesce(item->>'item_kind','sale');
      select * into item_row from app_ban_hang.sales_order_items
      where order_id=order_row.id and product_id=(item->>'product_id')::uuid for update;
      if item_row.id is null or item_kind_value not in ('sale','gift','sample') or length(coalesce(item->>'item_note',''))>500 then raise exception 'VALIDATION_ERROR'; end if;

      if item_kind_value='sale' then
        select case when customer_type_value='wholesale' then p.wholesale_price else p.sale_price end
        into applied_price from app_ban_hang.products p where p.id=item_row.product_id and p.deleted_at is null;
        if applied_price is null then raise exception 'VALIDATION_ERROR'; end if;
      else
        applied_price:=0;
      end if;

      update app_ban_hang.sales_order_items set
        custom_unit_price=applied_price,
        item_kind=item_kind_value,
        item_note=trim(coalesce(item->>'item_note',''))
      where id=item_row.id;
    end loop;

    update app_ban_hang.sales_orders set
      total_amount=(select coalesce(sum(quantity*unit_sale_price),0) from app_ban_hang.sales_order_items where order_id=order_row.id),
      version=version+1,
      updated_at=now()
    where id=order_row.id;
    insert into app_ban_hang.audit_logs(actor_id,action,detail) values(actor.id,'order.features.update',order_row.id::text);
    return jsonb_build_object('id',order_row.id);

  elsif payload->>'action'='payment' then
    if order_row.status not in ('confirmed','partially_returned','returned')
      or coalesce(payload->>'method','') not in ('cash','transfer','cod','cod_transfer','cash_transfer')
      or coalesce(payload->>'amount','')!~'^[0-9]{1,15}$'
      or length(coalesce(payload->>'note',''))>500 then raise exception 'VALIDATION_ERROR'; end if;
    amount_value:=(payload->>'amount')::numeric;
    if amount_value<=0 or amount_value+coalesce((select sum(amount) from app_ban_hang.sales_payments where order_id=order_row.id),0)>order_row.total_amount then raise exception 'PAYMENT_EXCEEDS_DUE'; end if;
    insert into app_ban_hang.sales_payments(order_id,amount,method,note,created_by)
    values(order_row.id,amount_value,payload->>'method',trim(coalesce(payload->>'note','')),actor.id)
    returning id into payment_id;
    update app_ban_hang.sales_orders set version=version+1,updated_at=now() where id=order_row.id;
    insert into app_ban_hang.audit_logs(actor_id,action,detail) values(actor.id,'order.payment',order_row.id::text||' / '||amount_value::text);
    return jsonb_build_object('id',payment_id);
  end if;
  raise exception 'VALIDATION_ERROR';
end $$;

revoke all on function public.app_ban_hang_order_features(jsonb) from public,anon;
grant execute on function public.app_ban_hang_order_features(jsonb) to authenticated;
