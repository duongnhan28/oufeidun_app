-- Customer/order enhancements: wholesale prices, gifts/samples, addresses and installment payments.
alter table app_ban_hang.sales_orders
  add column if not exists customer_address text not null default '',
  add column if not exists customer_type text not null default 'retail';
alter table app_ban_hang.sales_orders drop constraint if exists sales_orders_customer_type_check;
alter table app_ban_hang.sales_orders add constraint sales_orders_customer_type_check check(customer_type in ('retail','wholesale'));
alter table app_ban_hang.sales_orders drop constraint if exists sales_orders_payment_method_check;
alter table app_ban_hang.sales_orders add constraint sales_orders_payment_method_check check(payment_method is null or payment_method in ('cash','transfer','cod','cod_transfer','cash_transfer'));

alter table app_ban_hang.sales_order_items
  add column if not exists custom_unit_price numeric(18,0),
  add column if not exists item_kind text not null default 'sale',
  add column if not exists item_note text not null default '';
alter table app_ban_hang.sales_order_items drop constraint if exists sales_order_items_custom_unit_price_check;
alter table app_ban_hang.sales_order_items add constraint sales_order_items_custom_unit_price_check check(custom_unit_price is null or custom_unit_price>=0);
alter table app_ban_hang.sales_order_items drop constraint if exists sales_order_items_item_kind_check;
alter table app_ban_hang.sales_order_items add constraint sales_order_items_item_kind_check check(item_kind in ('sale','gift','sample'));

create table if not exists app_ban_hang.sales_payments (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references app_ban_hang.sales_orders(id),
 amount numeric(18,0) not null check(amount>0), method text not null check(method in ('cash','transfer','cod','cod_transfer','cash_transfer')),
 note text not null default '' check(length(note)<=500), created_by uuid not null references app_ban_hang.app_users(id),
 paid_at timestamptz not null default now()
);
alter table app_ban_hang.sales_payments drop constraint if exists sales_payments_method_check;
alter table app_ban_hang.sales_payments add constraint sales_payments_method_check check(method in ('cash','transfer','cod','cod_transfer','cash_transfer'));
create index if not exists sales_payments_order on app_ban_hang.sales_payments(order_id,paid_at);
alter table app_ban_hang.sales_payments enable row level security;

create or replace function app_ban_hang.preserve_order_item_price() returns trigger language plpgsql set search_path='' as $$
begin
 if new.item_kind in ('gift','sample') then new.custom_unit_price:=0;new.unit_sale_price:=0;
 elsif new.custom_unit_price is not null then new.unit_sale_price:=new.custom_unit_price;
 end if;
 return new;
end $$;
drop trigger if exists preserve_order_item_price on app_ban_hang.sales_order_items;
create trigger preserve_order_item_price before insert or update on app_ban_hang.sales_order_items for each row execute function app_ban_hang.preserve_order_item_price();

create or replace function public.app_ban_hang_order_extras() returns jsonb language plpgsql security definer set search_path='' as $$
declare u app_ban_hang.app_users;
begin
 u:=app_ban_hang.current_actor();
 return coalesce((select jsonb_agg(jsonb_build_object(
   'order_id',o.id,'customer_address',o.customer_address,'customer_type',o.customer_type,
   'paid_amount',coalesce((select sum(pay.amount) from app_ban_hang.sales_payments pay where pay.order_id=o.id),0)::text,
   'payment_status',case when coalesce((select sum(pay.amount) from app_ban_hang.sales_payments pay where pay.order_id=o.id),0)=0 then 'unpaid' when coalesce((select sum(pay.amount) from app_ban_hang.sales_payments pay where pay.order_id=o.id),0)<o.total_amount then 'partial' else 'paid' end,
   'payments',coalesce((select jsonb_agg(jsonb_build_object('id',pay.id,'amount',pay.amount::text,'method',pay.method,'note',pay.note,'paid_at',pay.paid_at,'actor_name',actor.display_name) order by pay.paid_at) from app_ban_hang.sales_payments pay join app_ban_hang.app_users actor on actor.id=pay.created_by where pay.order_id=o.id),'[]'::jsonb),
   'items',coalesce((select jsonb_agg(jsonb_build_object('product_id',i.product_id,'unit_sale_price',i.unit_sale_price::text,'item_kind',i.item_kind,'item_note',i.item_note) order by i.id) from app_ban_hang.sales_order_items i where i.order_id=o.id),'[]'::jsonb)
  ) order by o.updated_at desc) from app_ban_hang.sales_orders o where o.status<>'deleted' and (u.role='admin' or o.created_by=u.id)),'[]'::jsonb);
end $$;

create or replace function public.app_ban_hang_order_features(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u app_ban_hang.app_users; o app_ban_hang.sales_orders; item jsonb; item_row app_ban_hang.sales_order_items; amount_value numeric; payment_id uuid;
begin
 u:=app_ban_hang.current_actor();
 select * into o from app_ban_hang.sales_orders where id=(payload->>'order_id')::uuid for update;
 if o.id is null or (u.role<>'admin' and o.created_by<>u.id) then raise exception 'FORBIDDEN'; end if;
 if payload->>'action'='save' then
  if o.status<>'draft' or jsonb_typeof(payload->'items')<>'array' then raise exception 'INVALID_ORDER_STATE'; end if;
  if length(coalesce(payload->>'customer_address',''))>500 or coalesce(payload->>'customer_type','retail') not in ('retail','wholesale') then raise exception 'VALIDATION_ERROR'; end if;
  update app_ban_hang.sales_orders set customer_address=trim(coalesce(payload->>'customer_address','')),customer_type=coalesce(payload->>'customer_type','retail') where id=o.id;
  for item in select value from jsonb_array_elements(payload->'items') loop
   select * into item_row from app_ban_hang.sales_order_items where order_id=o.id and product_id=(item->>'product_id')::uuid for update;
   if item_row.id is null or coalesce(item->>'item_kind','sale') not in ('sale','gift','sample') or coalesce(item->>'unit_sale_price','')!~'^[0-9]{1,15}$' or length(coalesce(item->>'item_note',''))>500 then raise exception 'VALIDATION_ERROR'; end if;
   update app_ban_hang.sales_order_items set custom_unit_price=(item->>'unit_sale_price')::numeric,item_kind=coalesce(item->>'item_kind','sale'),item_note=trim(coalesce(item->>'item_note','')) where id=item_row.id;
  end loop;
  update app_ban_hang.sales_orders set total_amount=(select coalesce(sum(quantity*unit_sale_price),0) from app_ban_hang.sales_order_items where order_id=o.id),version=version+1,updated_at=now() where id=o.id;
  insert into app_ban_hang.audit_logs(actor_id,action,detail) values(u.id,'order.features.update',o.id::text);
  return jsonb_build_object('id',o.id);
 elsif payload->>'action'='payment' then
  if o.status not in ('confirmed','partially_returned','returned') or coalesce(payload->>'method','') not in ('cash','transfer','cod','cod_transfer','cash_transfer') or coalesce(payload->>'amount','')!~'^[0-9]{1,15}$' or length(coalesce(payload->>'note',''))>500 then raise exception 'VALIDATION_ERROR'; end if;
  amount_value:=(payload->>'amount')::numeric;
  if amount_value<=0 or amount_value+coalesce((select sum(amount) from app_ban_hang.sales_payments where order_id=o.id),0)>o.total_amount then raise exception 'PAYMENT_EXCEEDS_DUE'; end if;
  insert into app_ban_hang.sales_payments(order_id,amount,method,note,created_by) values(o.id,amount_value,payload->>'method',trim(coalesce(payload->>'note','')),u.id) returning id into payment_id;
  update app_ban_hang.sales_orders set version=version+1,updated_at=now() where id=o.id;
  insert into app_ban_hang.audit_logs(actor_id,action,detail) values(u.id,'order.payment',o.id::text||' / '||amount_value::text);
  return jsonb_build_object('id',payment_id);
 end if;
 raise exception 'VALIDATION_ERROR';
end $$;

revoke all on function public.app_ban_hang_order_extras(),public.app_ban_hang_order_features(jsonb) from public,anon;
grant execute on function public.app_ban_hang_order_extras(),public.app_ban_hang_order_features(jsonb) to authenticated;
