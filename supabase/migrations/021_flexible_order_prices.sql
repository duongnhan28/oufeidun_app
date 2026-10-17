-- Flexible per-order sale prices and reusable prices for individual wholesale customers.

create table if not exists app_ban_hang.customer_product_prices (
  customer_id uuid not null references app_ban_hang.customers(id),
  product_id uuid not null references app_ban_hang.products(id),
  unit_price numeric(18,0) not null check(unit_price>=0),
  created_by uuid not null references app_ban_hang.app_users(id),
  updated_by uuid not null references app_ban_hang.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(customer_id,product_id)
);
create index if not exists customer_product_prices_product on app_ban_hang.customer_product_prices(product_id);
alter table app_ban_hang.customer_product_prices enable row level security;
revoke all on app_ban_hang.customer_product_prices from public,anon,authenticated;

alter table app_ban_hang.sales_order_items
  add column if not exists price_overridden boolean not null default false,
  add column if not exists price_source text not null default 'retail_default';
alter table app_ban_hang.sales_order_items drop constraint if exists sales_order_items_price_source_check;
alter table app_ban_hang.sales_order_items add constraint sales_order_items_price_source_check
  check(price_source in ('retail_default','wholesale_default','customer_saved','manual','free_item'));

create or replace function public.app_ban_hang_business_extras()
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor app_ban_hang.app_users;
begin
 actor:=app_ban_hang.current_actor();
 return jsonb_build_object(
  'products',coalesce((select jsonb_agg(jsonb_build_object('id',id,'wholesale_price',wholesale_price::text)) from app_ban_hang.products where deleted_at is null),'[]'::jsonb),
  'customers',coalesce((select jsonb_agg(jsonb_build_object('id',id,'customer_type',customer_type,'name',name,'phone',phone,'address',address,'note',note,'active',active,'created_at',created_at,'updated_at',updated_at) order by updated_at desc) from app_ban_hang.customers where active),'[]'::jsonb),
  'customer_prices',coalesce((select jsonb_agg(jsonb_build_object('customer_id',customer_id,'product_id',product_id,'unit_price',unit_price::text)) from app_ban_hang.customer_product_prices),'[]'::jsonb),
  'salespeople',coalesce((select jsonb_agg(jsonb_build_object('id',id,'display_name',display_name,'role',role,'active',active) order by display_name) from app_ban_hang.app_users where active),'[]'::jsonb),
  'orders',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'customer_id',o.customer_id,'fulfillment_status',o.fulfillment_status,'missing_summary',o.missing_summary,'sales_user_id',o.sales_user_id,'sales_name',coalesce(s.display_name,creator.display_name))) from app_ban_hang.sales_orders o join app_ban_hang.app_users creator on creator.id=o.created_by left join app_ban_hang.app_users s on s.id=o.sales_user_id where o.status<>'deleted' and (actor.role='admin' or o.created_by=actor.id)),'[]'::jsonb)
 );
end $$;

create or replace function public.app_ban_hang_order_extras()
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor app_ban_hang.app_users;
begin
 actor:=app_ban_hang.current_actor();
 return coalesce((select jsonb_agg(jsonb_build_object(
   'order_id',o.id,'customer_address',o.customer_address,'customer_type',o.customer_type,
   'paid_amount',coalesce((select sum(pay.amount) from app_ban_hang.sales_payments pay where pay.order_id=o.id),0)::text,
   'payment_status',case when coalesce((select sum(pay.amount) from app_ban_hang.sales_payments pay where pay.order_id=o.id),0)=0 then 'unpaid' when coalesce((select sum(pay.amount) from app_ban_hang.sales_payments pay where pay.order_id=o.id),0)<o.total_amount then 'partial' else 'paid' end,
   'payments',coalesce((select jsonb_agg(jsonb_build_object('id',pay.id,'amount',pay.amount::text,'method',pay.method,'note',pay.note,'paid_at',pay.paid_at,'actor_name',payment_actor.display_name) order by pay.paid_at) from app_ban_hang.sales_payments pay join app_ban_hang.app_users payment_actor on payment_actor.id=pay.created_by where pay.order_id=o.id),'[]'::jsonb),
   'items',coalesce((select jsonb_agg(jsonb_build_object('product_id',i.product_id,'unit_sale_price',i.unit_sale_price::text,'item_kind',i.item_kind,'item_note',i.item_note,'price_overridden',i.price_overridden,'price_source',i.price_source) order by i.id) from app_ban_hang.sales_order_items i where i.order_id=o.id),'[]'::jsonb)
  ) order by o.updated_at desc) from app_ban_hang.sales_orders o where o.status<>'deleted' and (actor.role='admin' or o.created_by=actor.id)),'[]'::jsonb);
end $$;

create or replace function public.app_ban_hang_order_features(payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor app_ban_hang.app_users;
  order_row app_ban_hang.sales_orders;
  item jsonb;
  item_row app_ban_hang.sales_order_items;
  product_row app_ban_hang.products;
  item_kind_value text;
  customer_type_value text;
  suggested_price numeric;
  applied_price numeric;
  price_source_value text;
  overridden_value boolean;
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
    update app_ban_hang.sales_orders set customer_address=trim(coalesce(payload->>'customer_address','')),customer_type=customer_type_value where id=order_row.id;
    select * into order_row from app_ban_hang.sales_orders where id=order_row.id;

    for item in select value from jsonb_array_elements(payload->'items') loop
      item_kind_value:=coalesce(item->>'item_kind','sale');
      select * into item_row from app_ban_hang.sales_order_items where order_id=order_row.id and product_id=(item->>'product_id')::uuid for update;
      select * into product_row from app_ban_hang.products where id=item_row.product_id and deleted_at is null;
      if item_row.id is null or product_row.id is null or item_kind_value not in ('sale','gift','sample') or length(coalesce(item->>'item_note',''))>500 then raise exception 'VALIDATION_ERROR'; end if;

      suggested_price:=product_row.sale_price;
      price_source_value:='retail_default';
      if customer_type_value='wholesale' then
        suggested_price:=product_row.wholesale_price;
        price_source_value:='wholesale_default';
        if order_row.customer_id is not null then
          select unit_price into applied_price from app_ban_hang.customer_product_prices where customer_id=order_row.customer_id and product_id=product_row.id;
          if found then suggested_price:=applied_price;price_source_value:='customer_saved'; end if;
        end if;
      end if;

      overridden_value:=item_kind_value='sale' and coalesce((item->>'price_overridden')::boolean,false);
      if item_kind_value<>'sale' then
        applied_price:=0;price_source_value:='free_item';overridden_value:=false;
      elsif overridden_value then
        if coalesce(item->>'unit_sale_price','')!~'^[0-9]{1,15}$' then raise exception 'VALIDATION_ERROR'; end if;
        applied_price:=(item->>'unit_sale_price')::numeric;price_source_value:='manual';
      else
        applied_price:=suggested_price;
      end if;
      if item_kind_value='sale' and applied_price=0 and coalesce((item->>'zero_price_confirm')::boolean,false) is not true then raise exception 'ZERO_PRICE_CONFIRM_REQUIRED'; end if;

      if item_row.unit_sale_price<>applied_price or item_row.price_overridden<>overridden_value then
        insert into app_ban_hang.audit_logs(actor_id,action,detail) values(actor.id,'order.item_price.update',order_row.id::text||' / '||product_row.sku||': '||item_row.unit_sale_price::text||' -> '||applied_price::text);
      end if;
      update app_ban_hang.sales_order_items set custom_unit_price=applied_price,price_overridden=overridden_value,price_source=price_source_value,quoted_price_version=product_row.price_version,item_kind=item_kind_value,item_note=trim(coalesce(item->>'item_note','')) where id=item_row.id;

      if coalesce((item->>'save_customer_price')::boolean,false) then
        if customer_type_value<>'wholesale' or order_row.customer_id is null or item_kind_value<>'sale' then raise exception 'CUSTOMER_PRICE_REQUIRES_WHOLESALE'; end if;
        insert into app_ban_hang.customer_product_prices(customer_id,product_id,unit_price,created_by,updated_by)
        values(order_row.customer_id,product_row.id,applied_price,actor.id,actor.id)
        on conflict(customer_id,product_id) do update set unit_price=excluded.unit_price,updated_by=excluded.updated_by,updated_at=now();
        insert into app_ban_hang.audit_logs(actor_id,action,detail) values(actor.id,'customer.price.save',order_row.customer_id::text||' / '||product_row.sku||': '||applied_price::text);
      end if;
    end loop;

    update app_ban_hang.sales_orders set total_amount=(select coalesce(sum(quantity*unit_sale_price),0) from app_ban_hang.sales_order_items where order_id=order_row.id),version=version+1,updated_at=now() where id=order_row.id;
    insert into app_ban_hang.audit_logs(actor_id,action,detail) values(actor.id,'order.features.update',order_row.id::text);
    return jsonb_build_object('id',order_row.id);
  elsif payload->>'action'='payment' then
    if order_row.status not in ('confirmed','partially_returned','returned') or coalesce(payload->>'method','') not in ('cash','transfer','cod','cod_transfer','cash_transfer') or coalesce(payload->>'amount','')!~'^[0-9]{1,15}$' or length(coalesce(payload->>'note',''))>500 then raise exception 'VALIDATION_ERROR'; end if;
    amount_value:=(payload->>'amount')::numeric;
    if amount_value<=0 or amount_value+coalesce((select sum(amount) from app_ban_hang.sales_payments where order_id=order_row.id),0)>order_row.total_amount then raise exception 'PAYMENT_EXCEEDS_DUE'; end if;
    insert into app_ban_hang.sales_payments(order_id,amount,method,note,created_by) values(order_row.id,amount_value,payload->>'method',trim(coalesce(payload->>'note','')),actor.id) returning id into payment_id;
    update app_ban_hang.sales_orders set version=version+1,updated_at=now() where id=order_row.id;
    insert into app_ban_hang.audit_logs(actor_id,action,detail) values(actor.id,'order.payment',order_row.id::text||' / '||amount_value::text);
    return jsonb_build_object('id',payment_id);
  end if;
  raise exception 'VALIDATION_ERROR';
end $$;

revoke all on function public.app_ban_hang_business_extras(),public.app_ban_hang_order_extras(),public.app_ban_hang_order_features(jsonb) from public,anon;
grant execute on function public.app_ban_hang_business_extras(),public.app_ban_hang_order_extras(),public.app_ban_hang_order_features(jsonb) to authenticated;
