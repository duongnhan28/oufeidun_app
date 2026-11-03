-- Preserve deleted draft codes as history, but release their unique reservation.
do $migration$
declare constraint_name text; definition text;
begin
 for constraint_name in select conname from pg_constraint where conrelid='app_private.sales_orders'::regclass and contype='u' and pg_get_constraintdef(oid)='UNIQUE (order_code)' loop
  execute format('alter table app_private.sales_orders drop constraint %I',constraint_name);
 end loop;
 create unique index if not exists sales_orders_live_order_code_unique on app_private.sales_orders(lower(order_code)) where status<>'deleted';
 definition:=pg_get_functiondef('public.shop_write(jsonb)'::regprocedure);
 definition:=replace(definition,
  '(exists(select 1 from app_private.inventory_movements where product_id=pid) or exists(select 1 from app_private.sales_order_items where product_id=pid))',
  '(exists(select 1 from app_private.sales_order_items item join app_private.sales_orders sold on sold.id=item.order_id where item.product_id=pid and (sold.confirmed_at is not null or sold.status not in (''draft'',''deleted''))))');
 execute definition;
end $migration$;
