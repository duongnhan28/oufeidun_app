-- User-entered order codes. The numeric identity remains an internal legacy key.

alter table app_ban_hang.sales_orders add column if not exists order_code text;
update app_ban_hang.sales_orders
set order_code='DH-'||lpad(order_no::text,5,'0')
where order_code is null;
create unique index if not exists sales_orders_order_code_unique
  on app_ban_hang.sales_orders(lower(order_code));

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
  'orders',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'order_no',coalesce(o.order_code,'DH-'||lpad(o.order_no::text,5,'0')),'customer_id',o.customer_id,'fulfillment_status',o.fulfillment_status,'missing_summary',o.missing_summary,'sales_user_id',o.sales_user_id,'sales_name',coalesce(s.display_name,creator.display_name))) from app_ban_hang.sales_orders o join app_ban_hang.app_users creator on creator.id=o.created_by left join app_ban_hang.app_users s on s.id=o.sales_user_id where o.status<>'deleted' and (actor.role='admin' or o.created_by=actor.id)),'[]'::jsonb)
 );
end $$;

create or replace function public.app_ban_hang_order_business(payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor app_ban_hang.app_users; order_row app_ban_hang.sales_orders; selected_sales uuid; code text;
begin
 actor:=app_ban_hang.current_actor();
 select * into order_row from app_ban_hang.sales_orders where id=(payload->>'order_id')::uuid for update;
 if order_row.id is null or (actor.role<>'admin' and order_row.created_by<>actor.id) then raise exception 'FORBIDDEN'; end if;
 code:=trim(coalesce(payload->>'order_code',''));
 if length(code) not between 1 and 50 then raise exception 'ORDER_CODE_REQUIRED'; end if;
 if exists(select 1 from app_ban_hang.sales_orders where lower(order_code)=lower(code) and id<>order_row.id) then raise exception 'ORDER_CODE_EXISTS'; end if;
 selected_sales:=coalesce(nullif(payload->>'sales_user_id','')::uuid,actor.id);
 if not exists(select 1 from app_ban_hang.app_users where id=selected_sales and active) then raise exception 'INVALID_SALES_USER'; end if;
 update app_ban_hang.sales_orders set
  order_code=code,
  customer_id=nullif(payload->>'customer_id','')::uuid,
  sales_user_id=selected_sales,
  fulfillment_status=coalesce(payload->>'fulfillment_status','complete'),
  missing_summary=trim(coalesce(payload->>'missing_summary','')),
  updated_at=now()
 where id=order_row.id;
 return jsonb_build_object('id',order_row.id);
end $$;

revoke all on function public.app_ban_hang_business_extras(),public.app_ban_hang_order_business(jsonb) from public,anon;
grant execute on function public.app_ban_hang_business_extras(),public.app_ban_hang_order_business(jsonb) to authenticated;
