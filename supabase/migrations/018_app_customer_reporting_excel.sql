-- Customer directory, default wholesale prices and detailed management reports.
-- All objects stay inside the isolated app_ban_hang schema.

alter table app_ban_hang.products
  add column if not exists wholesale_price numeric(18,0);
update app_ban_hang.products set wholesale_price=sale_price where wholesale_price is null;
alter table app_ban_hang.products alter column wholesale_price set not null;
alter table app_ban_hang.products drop constraint if exists products_wholesale_price_check;
alter table app_ban_hang.products add constraint products_wholesale_price_check check(wholesale_price>=0);

create table if not exists app_ban_hang.customers (
  id uuid primary key default gen_random_uuid(),
  customer_type text not null default 'retail' check(customer_type in ('retail','wholesale')),
  name text not null check(length(trim(name)) between 1 and 200),
  phone text not null check(length(trim(phone)) between 1 and 30),
  address text not null default '' check(length(address)<=500),
  note text not null default '' check(length(note)<=1000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(phone)
);
revoke all on app_ban_hang.customers from public,anon,authenticated;

alter table app_ban_hang.sales_orders
  add column if not exists customer_id uuid references app_ban_hang.customers(id),
  add column if not exists fulfillment_status text not null default 'complete',
  add column if not exists missing_summary text not null default '';
alter table app_ban_hang.sales_orders drop constraint if exists sales_orders_fulfillment_status_check;
alter table app_ban_hang.sales_orders add constraint sales_orders_fulfillment_status_check check(fulfillment_status in ('complete','short'));
create index if not exists orders_customer on app_ban_hang.sales_orders(customer_id,created_at desc);

create or replace function public.app_ban_hang_business_extras()
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor app_ban_hang.app_users;
begin
 actor:=app_ban_hang.current_actor();
 return jsonb_build_object(
  'products',coalesce((select jsonb_agg(jsonb_build_object('id',id,'wholesale_price',wholesale_price::text)) from app_ban_hang.products where deleted_at is null),'[]'::jsonb),
  'customers',coalesce((select jsonb_agg(jsonb_build_object('id',id,'customer_type',customer_type,'name',name,'phone',phone,'address',address,'note',note,'active',active,'created_at',created_at,'updated_at',updated_at) order by updated_at desc) from app_ban_hang.customers where active),'[]'::jsonb),
  'orders',coalesce((select jsonb_agg(jsonb_build_object('id',id,'customer_id',customer_id,'fulfillment_status',fulfillment_status,'missing_summary',missing_summary)) from app_ban_hang.sales_orders where status<>'deleted' and (actor.role='admin' or created_by=actor.id)),'[]'::jsonb)
 );
end $$;

create or replace function public.app_ban_hang_customer(payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor app_ban_hang.app_users; customer_id uuid; row_customer app_ban_hang.customers;
begin
 actor:=app_ban_hang.current_actor();
 if payload->>'action'='delete' then
  if actor.role<>'admin' then raise exception 'FORBIDDEN'; end if;
  customer_id:=(payload->>'id')::uuid;
  update app_ban_hang.customers set active=false,updated_at=now() where id=customer_id returning * into row_customer;
  if row_customer.id is null then raise exception 'VALIDATION_ERROR'; end if;
  insert into app_ban_hang.audit_logs(actor_id,action,detail) values(actor.id,'customer.delete',row_customer.name||' / '||row_customer.phone);
 else
  if length(trim(coalesce(payload->>'name',''))) not between 1 and 200 or length(trim(coalesce(payload->>'phone',''))) not between 1 and 30 or coalesce(payload->>'customer_type','') not in ('retail','wholesale') then raise exception 'VALIDATION_ERROR'; end if;
  customer_id:=(payload->>'id')::uuid;
  insert into app_ban_hang.customers(id,customer_type,name,phone,address,note,active)
  values(coalesce(customer_id,gen_random_uuid()),payload->>'customer_type',trim(payload->>'name'),trim(payload->>'phone'),trim(coalesce(payload->>'address','')),trim(coalesce(payload->>'note','')),true)
  on conflict(phone) do update set customer_type=excluded.customer_type,name=excluded.name,address=excluded.address,note=excluded.note,active=true,updated_at=now()
  returning * into row_customer;
  insert into app_ban_hang.audit_logs(actor_id,action,detail) values(actor.id,'customer.save',row_customer.name||' / '||row_customer.phone);
 end if;
 return jsonb_build_object('id',row_customer.id);
end $$;

create or replace function public.app_ban_hang_order_business(payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor app_ban_hang.app_users; order_row app_ban_hang.sales_orders;
begin
 actor:=app_ban_hang.current_actor();
 select * into order_row from app_ban_hang.sales_orders where id=(payload->>'order_id')::uuid for update;
 if order_row.id is null or (actor.role<>'admin' and order_row.created_by<>actor.id) then raise exception 'FORBIDDEN'; end if;
 update app_ban_hang.sales_orders set
  customer_id=nullif(payload->>'customer_id','')::uuid,
  fulfillment_status=coalesce(payload->>'fulfillment_status','complete'),
  missing_summary=trim(coalesce(payload->>'missing_summary','')),
  updated_at=now()
 where id=order_row.id;
 return jsonb_build_object('id',order_row.id);
end $$;

create or replace function public.app_ban_hang_set_wholesale_price(payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor app_ban_hang.app_users; product_id uuid; price numeric;
begin
 actor:=app_ban_hang.current_actor(); if actor.role<>'admin' then raise exception 'FORBIDDEN'; end if;
 product_id:=(payload->>'product_id')::uuid; price:=(payload->>'wholesale_price')::numeric;
 if price<0 or price>999999999999999 then raise exception 'VALIDATION_ERROR'; end if;
 update app_ban_hang.products set wholesale_price=price,price_version=price_version+1,version=version+1 where id=product_id;
 if not found then raise exception 'VALIDATION_ERROR'; end if;
 return jsonb_build_object('id',product_id);
end $$;

create or replace function public.app_ban_hang_detailed_report(payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor app_ban_hang.app_users; d1 timestamptz; d2 timestamptz; brand_filter text:=coalesce(nullif(trim(payload->>'brand'),''),'all');
begin
 actor:=app_ban_hang.current_actor(); if actor.role<>'admin' then raise exception 'FORBIDDEN'; end if;
 d1:=(payload->>'from')::date::timestamp at time zone 'Asia/Ho_Chi_Minh';
 d2:=((payload->>'to')::date+1)::timestamp at time zone 'Asia/Ho_Chi_Minh';
 if d2<=d1 or d2-d1>interval '366 days' then raise exception 'VALIDATION_ERROR'; end if;
 return jsonb_build_object(
  'order_count',(select count(distinct o.id) from app_ban_hang.sales_orders o join app_ban_hang.sales_order_items i on i.order_id=o.id join app_ban_hang.products p on p.id=i.product_id where o.confirmed_at>=d1 and o.confirmed_at<d2 and o.status<>'cancelled' and (brand_filter='all' or p.brand=brand_filter)),
  'sales',coalesce((select jsonb_agg(to_jsonb(x) order by x.revenue desc) from (
    select p.sku,p.name,c.unit_cost_snapshot::text unit_cost,i.unit_sale_price::text sale_price,
      sum(i.quantity-coalesce(returned.quantity,0))::int quantity,
      sum((i.quantity-coalesce(returned.quantity,0))*c.unit_cost_snapshot)::text total_cost,
      sum((i.quantity-coalesce(returned.quantity,0))*i.unit_sale_price)::text revenue,
      sum((i.quantity-coalesce(returned.quantity,0))*(i.unit_sale_price-c.unit_cost_snapshot))::text profit
    from app_ban_hang.sales_orders o join app_ban_hang.sales_order_items i on i.order_id=o.id join app_ban_hang.sales_item_costs c on c.order_item_id=i.id join app_ban_hang.products p on p.id=i.product_id
    left join lateral (select sum(ri.quantity) quantity from app_ban_hang.sales_return_items ri join app_ban_hang.sales_returns rh on rh.id=ri.return_id where ri.order_item_id=i.id and rh.posted_at<d2) returned on true
    where o.confirmed_at>=d1 and o.confirmed_at<d2 and o.status<>'cancelled' and (brand_filter='all' or p.brand=brand_filter)
    group by p.id,p.sku,p.name,c.unit_cost_snapshot,i.unit_sale_price
  ) x),'[]'::jsonb),
  'movements',coalesce((select jsonb_agg(to_jsonb(x) order by x.occurred_at desc) from (
    select m.occurred_at,p.sku,p.name,m.movement_type,m.quantity_delta,m.balance_after,a.display_name sales,
      case when m.sale_order_item_id is null then null else 'DH-'||lpad(o.order_no::text,5,'0') end order_no
    from app_ban_hang.inventory_movements m join app_ban_hang.products p on p.id=m.product_id join app_ban_hang.app_users a on a.id=m.actor_id
    left join app_ban_hang.sales_order_items si on si.id=m.sale_order_item_id left join app_ban_hang.sales_orders o on o.id=si.order_id
    where m.occurred_at>=d1 and m.occurred_at<d2 and (brand_filter='all' or p.brand=brand_filter) limit 10000
  ) x),'[]'::jsonb)
 );
end $$;

revoke all on function public.app_ban_hang_business_extras(),public.app_ban_hang_customer(jsonb),public.app_ban_hang_order_business(jsonb),public.app_ban_hang_set_wholesale_price(jsonb),public.app_ban_hang_detailed_report(jsonb) from public,anon;
grant execute on function public.app_ban_hang_business_extras(),public.app_ban_hang_customer(jsonb),public.app_ban_hang_order_business(jsonb),public.app_ban_hang_set_wholesale_price(jsonb),public.app_ban_hang_detailed_report(jsonb) to authenticated;
