-- Short orders remain drafts until stock is complete.

alter table app_ban_hang.sales_orders
  add constraint sales_orders_short_requires_summary
  check (fulfillment_status <> 'short' or length(trim(missing_summary)) > 0)
  not valid;

create or replace function app_ban_hang.block_short_order_confirmation()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.fulfillment_status='short' and length(trim(new.missing_summary))=0 then
    raise exception 'MISSING_SUMMARY_REQUIRED';
  end if;
  if new.status='confirmed' and new.fulfillment_status='short' then
    raise exception 'ORDER_STILL_SHORT';
  end if;
  return new;
end $$;

drop trigger if exists sales_orders_block_short_confirmation on app_ban_hang.sales_orders;
create trigger sales_orders_block_short_confirmation
before insert or update of status,fulfillment_status on app_ban_hang.sales_orders
for each row execute function app_ban_hang.block_short_order_confirmation();
