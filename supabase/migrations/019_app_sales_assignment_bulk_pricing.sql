-- Sales assignment, customer filtering support and bulk price groups.

alter table app_ban_hang.products drop constraint if exists products_glass_type_check;
alter table app_ban_hang.products add constraint products_glass_type_check
  check(glass_type in ('clear','privacy','matte','other','full_border','premium_borderless'));

alter table app_ban_hang.sales_orders
  add column if not exists sales_user_id uuid references app_ban_hang.app_users(id);
update app_ban_hang.sales_orders set sales_user_id=created_by where sales_user_id is null;
create index if not exists orders_sales_user on app_ban_hang.sales_orders(sales_user_id,created_at desc);

create or replace function public.app_ban_hang_business_extras()
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor app_ban_hang.app_users;
begin
 actor:=app_ban_hang.current_actor();
 return jsonb_build_object(
  'products',coalesce((select jsonb_agg(jsonb_build_object('id',id,'wholesale_price',wholesale_price::text)) from app_ban_hang.products where deleted_at is null),'[]'::jsonb),
  'customers',coalesce((select jsonb_agg(jsonb_build_object('id',id,'customer_type',customer_type,'name',name,'phone',phone,'address',address,'note',note,'active',active,'created_at',created_at,'updated_at',updated_at) order by updated_at desc) from app_ban_hang.customers where active),'[]'::jsonb),
  'salespeople',coalesce((select jsonb_agg(jsonb_build_object('id',id,'display_name',display_name,'role',role,'active',active) order by display_name) from app_ban_hang.app_users where active),'[]'::jsonb),
  'orders',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'customer_id',o.customer_id,'fulfillment_status',o.fulfillment_status,'missing_summary',o.missing_summary,'sales_user_id',o.sales_user_id,'sales_name',coalesce(s.display_name,creator.display_name))) from app_ban_hang.sales_orders o join app_ban_hang.app_users creator on creator.id=o.created_by left join app_ban_hang.app_users s on s.id=o.sales_user_id where o.status<>'deleted' and (actor.role='admin' or o.created_by=actor.id)),'[]'::jsonb)
 );
end $$;

create or replace function public.app_ban_hang_order_business(payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor app_ban_hang.app_users; order_row app_ban_hang.sales_orders; selected_sales uuid;
begin
 actor:=app_ban_hang.current_actor();
 select * into order_row from app_ban_hang.sales_orders where id=(payload->>'order_id')::uuid for update;
 if order_row.id is null or (actor.role<>'admin' and order_row.created_by<>actor.id) then raise exception 'FORBIDDEN'; end if;
 selected_sales:=coalesce(nullif(payload->>'sales_user_id','')::uuid,actor.id);
 if not exists(select 1 from app_ban_hang.app_users where id=selected_sales and active) then raise exception 'INVALID_SALES_USER'; end if;
 update app_ban_hang.sales_orders set
  customer_id=nullif(payload->>'customer_id','')::uuid,
  sales_user_id=selected_sales,
  fulfillment_status=coalesce(payload->>'fulfillment_status','complete'),
  missing_summary=trim(coalesce(payload->>'missing_summary','')),
  updated_at=now()
 where id=order_row.id;
 return jsonb_build_object('id',order_row.id);
end $$;

create or replace function public.app_ban_hang_bulk_price(payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor app_ban_hang.app_users; group_type text; retail numeric; wholesale numeric; cost numeric; changed integer;
begin
 actor:=app_ban_hang.current_actor(); if actor.role<>'admin' then raise exception 'FORBIDDEN'; end if;
 group_type:=payload->>'glass_type';
 if group_type not in ('clear','privacy','matte','other','full_border','premium_borderless')
   or coalesce(payload->>'sale_price','') !~ '^[0-9]{1,15}$'
   or coalesce(payload->>'wholesale_price','') !~ '^[0-9]{1,15}$'
   or coalesce(payload->>'fixed_cost','') !~ '^[0-9]{1,15}$' then raise exception 'VALIDATION_ERROR'; end if;
 retail:=(payload->>'sale_price')::numeric; wholesale:=(payload->>'wholesale_price')::numeric; cost:=(payload->>'fixed_cost')::numeric;
 update app_ban_hang.product_costs pc set fixed_cost=cost
 where exists(select 1 from app_ban_hang.products p where p.id=pc.product_id and p.glass_type=group_type and p.active and p.deleted_at is null);
 update app_ban_hang.products set sale_price=retail,wholesale_price=wholesale,
   price_version=price_version+case when sale_price<>retail or wholesale_price<>wholesale then 1 else 0 end,
   version=version+1
 where glass_type=group_type and active and deleted_at is null;
 get diagnostics changed=row_count;
 insert into app_ban_hang.audit_logs(actor_id,action,detail) values(actor.id,'product.bulk_price',group_type||': lẻ '||retail||'; sỉ '||wholesale||'; vốn '||cost||'; '||changed||' mã');
 return jsonb_build_object('updated',changed);
end $$;

create or replace function public.app_ban_hang_detailed_report(payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor app_ban_hang.app_users; d1 timestamptz; d2 timestamptz; brand_filter text:=coalesce(nullif(trim(payload->>'brand'),''),'all');
begin
 actor:=app_ban_hang.current_actor(); if actor.role<>'admin' then raise exception 'FORBIDDEN'; end if;
 d1:=(payload->>'from')::date::timestamp at time zone 'Asia/Ho_Chi_Minh'; d2:=((payload->>'to')::date+1)::timestamp at time zone 'Asia/Ho_Chi_Minh';
 if d2<=d1 or d2-d1>interval '366 days' then raise exception 'VALIDATION_ERROR'; end if;
 return jsonb_build_object(
  'order_count',(select count(distinct o.id) from app_ban_hang.sales_orders o join app_ban_hang.sales_order_items i on i.order_id=o.id join app_ban_hang.products p on p.id=i.product_id where o.confirmed_at>=d1 and o.confirmed_at<d2 and o.status<>'cancelled' and (brand_filter='all' or p.brand=brand_filter)),
  'sales',coalesce((select jsonb_agg(to_jsonb(x) order by x.revenue desc) from (
    select p.sku,p.name,c.unit_cost_snapshot::text unit_cost,i.unit_sale_price::text sale_price,sum(i.quantity-coalesce(returned.quantity,0))::int quantity,
      sum((i.quantity-coalesce(returned.quantity,0))*c.unit_cost_snapshot)::text total_cost,sum((i.quantity-coalesce(returned.quantity,0))*i.unit_sale_price)::text revenue,
      sum((i.quantity-coalesce(returned.quantity,0))*(i.unit_sale_price-c.unit_cost_snapshot))::text profit
    from app_ban_hang.sales_orders o join app_ban_hang.sales_order_items i on i.order_id=o.id join app_ban_hang.sales_item_costs c on c.order_item_id=i.id join app_ban_hang.products p on p.id=i.product_id
    left join lateral (select sum(ri.quantity) quantity from app_ban_hang.sales_return_items ri join app_ban_hang.sales_returns rh on rh.id=ri.return_id where ri.order_item_id=i.id and rh.posted_at<d2) returned on true
    where o.confirmed_at>=d1 and o.confirmed_at<d2 and o.status<>'cancelled' and (brand_filter='all' or p.brand=brand_filter)
    group by p.id,p.sku,p.name,c.unit_cost_snapshot,i.unit_sale_price
  ) x),'[]'::jsonb),
  'movements',coalesce((select jsonb_agg(to_jsonb(x) order by x.occurred_at desc) from (
    select m.occurred_at,p.sku,p.name,m.movement_type,m.quantity_delta,m.balance_after,coalesce(sales_person.display_name,a.display_name) sales,
      case when m.sale_order_item_id is null then null else 'DH-'||lpad(o.order_no::text,5,'0') end order_no
    from app_ban_hang.inventory_movements m join app_ban_hang.products p on p.id=m.product_id join app_ban_hang.app_users a on a.id=m.actor_id
    left join app_ban_hang.sales_order_items si on si.id=m.sale_order_item_id left join app_ban_hang.sales_orders o on o.id=si.order_id
    left join app_ban_hang.app_users sales_person on sales_person.id=o.sales_user_id
    where m.occurred_at>=d1 and m.occurred_at<d2 and (brand_filter='all' or p.brand=brand_filter) limit 10000
  ) x),'[]'::jsonb)
 );
end $$;

revoke all on function public.app_ban_hang_business_extras(),public.app_ban_hang_order_business(jsonb),public.app_ban_hang_bulk_price(jsonb),public.app_ban_hang_detailed_report(jsonb) from public,anon;
grant execute on function public.app_ban_hang_business_extras(),public.app_ban_hang_order_business(jsonb),public.app_ban_hang_bulk_price(jsonb),public.app_ban_hang_detailed_report(jsonb) to authenticated;
