alter table app_private.sales_orders
  add column if not exists fulfillment_status text not null default 'complete',
  add column if not exists missing_summary text not null default '';

alter table app_private.sales_order_items
  add column if not exists delivered_quantity integer not null default 0;

alter table app_private.sales_order_items drop constraint if exists sales_order_items_delivered_quantity_check;
alter table app_private.sales_order_items add constraint sales_order_items_delivered_quantity_check
  check(delivered_quantity >= 0 and delivered_quantity <= quantity);

drop index if exists app_private.move_sale_once;

create table if not exists app_private.order_delivery_batches(
 id uuid primary key default gen_random_uuid(),order_id uuid not null references app_private.sales_orders(id),sequence_no integer not null,
 delivery_kind text not null check(delivery_kind in ('initial','supplement')),delivered_by uuid not null references app_private.app_users(id),delivered_at timestamptz not null default now(),unique(order_id,sequence_no)
);
create table if not exists app_private.order_delivery_items(
 batch_id uuid not null references app_private.order_delivery_batches(id),order_item_id uuid not null references app_private.sales_order_items(id),quantity integer not null check(quantity>0),unit_price_snapshot numeric(18,0) not null,primary key(batch_id,order_item_id)
);

create or replace function public.shop_order_extras() returns jsonb language plpgsql security definer set search_path='' as $$
declare u app_private.app_users;
begin
 u:=app_private.current_actor();
 return coalesce((select jsonb_agg(jsonb_build_object(
   'order_id',o.id,'customer_address',o.customer_address,'customer_type',o.customer_type,
   'fulfillment_status',o.fulfillment_status,'missing_summary',o.missing_summary,
   'deliveries',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'sequence_no',b.sequence_no,'delivery_kind',b.delivery_kind,'delivered_at',b.delivered_at,'actor_name',a.display_name,'total_quantity',(select coalesce(sum(di.quantity),0) from app_private.order_delivery_items di where di.batch_id=b.id),'total_amount',(select coalesce(sum(di.quantity*di.unit_price_snapshot),0)::text from app_private.order_delivery_items di where di.batch_id=b.id),'items',coalesce((select jsonb_agg(jsonb_build_object('order_item_id',di.order_item_id,'product_id',i.product_id,'sku',i.sku_snapshot,'name',coalesce(i.product_name_snapshot,i.custom_name),'quantity',di.quantity,'unit_price',di.unit_price_snapshot::text,'amount',(di.quantity*di.unit_price_snapshot)::text) order by i.id) from app_private.order_delivery_items di join app_private.sales_order_items i on i.id=di.order_item_id where di.batch_id=b.id),'[]'::jsonb)) order by b.sequence_no) from app_private.order_delivery_batches b join app_private.app_users a on a.id=b.delivered_by where b.order_id=o.id),'[]'::jsonb),
   'paid_amount',coalesce((select sum(p.amount) from app_private.sales_payments p where p.order_id=o.id),0)::text,
   'payment_status',case when coalesce((select sum(p.amount) from app_private.sales_payments p where p.order_id=o.id),0)=0 then 'unpaid' when coalesce((select sum(p.amount) from app_private.sales_payments p where p.order_id=o.id),0)<o.total_amount then 'partial' else 'paid' end,
   'payments',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'amount',p.amount::text,'method',p.method,'note',p.note,'paid_at',p.paid_at,'actor_name',a.display_name) order by p.paid_at) from app_private.sales_payments p join app_private.app_users a on a.id=p.created_by where p.order_id=o.id),'[]'::jsonb),
   'items',coalesce((select jsonb_agg(jsonb_build_object('product_id',i.product_id,'unit_sale_price',i.unit_sale_price::text,'item_kind',i.item_kind,'item_note',i.item_note,'delivered_quantity',i.delivered_quantity,'missing_quantity',greatest(i.quantity-i.delivered_quantity,0)) order by i.id) from app_private.sales_order_items i where i.order_id=o.id),'[]'::jsonb)
  ) order by o.updated_at desc) from app_private.sales_orders o where o.status<>'deleted' and (u.role='admin' or o.created_by=u.id)),'[]'::jsonb);
end $$;

create or replace function public.shop_order_business(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u app_private.app_users; o app_private.sales_orders;
begin
 u:=app_private.current_actor();
 select * into o from app_private.sales_orders where id=(payload->>'order_id')::uuid for update;
 if o.id is null or (u.role<>'admin' and o.created_by<>u.id) or o.status<>'draft' then raise exception 'FORBIDDEN'; end if;
 if coalesce(payload->>'fulfillment_status','complete') not in ('complete','short') then raise exception 'VALIDATION_ERROR'; end if;
 if coalesce(payload->>'fulfillment_status','complete')='short' and length(trim(coalesce(payload->>'missing_summary','')))=0 then raise exception 'MISSING_SUMMARY_REQUIRED'; end if;
 update app_private.sales_orders set fulfillment_status=coalesce(payload->>'fulfillment_status','complete'),missing_summary=trim(coalesce(payload->>'missing_summary','')) where id=o.id;
 return jsonb_build_object('id',o.id);
end $$;

create or replace function public.shop_partial_fulfillment(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
<<write_block>>
declare
 u app_private.app_users; o app_private.sales_orders; i app_private.sales_order_items; p app_private.products;
 oldreq app_private.mutation_requests; el jsonb; qty integer; remaining integer; total numeric:=0; batch_id uuid; next_sequence integer;
 payment numeric:=0; paid numeric:=0;
 incomplete boolean:=false; result jsonb; act text:=payload->>'action'; key uuid:=(payload->>'key')::uuid;
begin
 u:=app_private.current_actor();
 if key is null then raise exception 'VALIDATION_ERROR'; end if;
 insert into app_private.mutation_requests(actor_id,request_key,payload) values(u.id,key,payload) on conflict do nothing;
 select * into oldreq from app_private.mutation_requests where actor_id=u.id and request_key=key for update;
 if oldreq.payload<>payload then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
 if oldreq.result is not null then return oldreq.result; end if;
 select * into o from app_private.sales_orders where id=(payload->>'id')::uuid for update;
 if o.id is null or (u.role<>'admin' and o.created_by<>u.id) then raise exception 'FORBIDDEN'; end if;

 if act='confirm_order' then
  if o.status<>'draft' or o.version is distinct from (payload->>'version')::integer then raise exception 'VERSION_CONFLICT'; end if;
  if coalesce(payload->>'payment_method','') not in ('cash','transfer','cod','cod_transfer','cash_transfer') then raise exception 'VALIDATION_ERROR'; end if;
  insert into app_private.order_delivery_batches(order_id,sequence_no,delivery_kind,delivered_by) values(o.id,1,'initial',u.id) returning id into batch_id;
  for i in select * from app_private.sales_order_items where order_id=o.id order by product_id for update loop
   select * into p from app_private.products where id=i.product_id for share;
   if p.id is null or not p.active or p.price_version<>i.quoted_price_version then raise exception 'PRICE_CHANGED'; end if;
   select (d.value->>'quantity')::integer into qty from jsonb_array_elements(coalesce(payload->'deliveries','[]'::jsonb)) d where d.value->>'order_item_id'=i.id::text;
   qty:=coalesce(qty,i.quantity);
   if qty<0 or qty>i.quantity then raise exception 'DELIVERY_EXCEEDS_ORDERED'; end if;
   if qty>(select on_hand from app_private.inventory_balances where product_id=i.product_id) then raise exception 'INSUFFICIENT_STOCK'; end if;
   if qty>0 then perform app_private.move_stock(i.product_id,-qty,'sale',u.id,null,i.id); end if;
   if qty>0 then insert into app_private.order_delivery_items(batch_id,order_item_id,quantity,unit_price_snapshot) values(batch_id,i.id,qty,i.unit_sale_price); end if;
   update app_private.sales_order_items set delivered_quantity=qty,sku_snapshot=p.sku,product_name_snapshot=coalesce(i.custom_name,p.name) where id=i.id;
   insert into app_private.sales_item_costs(order_item_id,unit_cost_snapshot) select i.id,fixed_cost from app_private.product_costs where product_id=i.product_id on conflict(order_item_id) do update set unit_cost_snapshot=excluded.unit_cost_snapshot;
   total:=total+qty*i.unit_sale_price;
   if qty<i.quantity then incomplete:=true; end if;
  end loop;
  incomplete:=incomplete or (o.fulfillment_status='short' and length(trim(o.missing_summary))>0);
  update app_private.sales_orders set status='confirmed',confirmed_by=u.id,confirmed_at=now(),payment_method=payload->>'payment_method',total_amount=total,fulfillment_status=case when incomplete then 'short' else 'complete' end,missing_summary=case when incomplete then missing_summary else '' end,version=version+1,updated_at=now() where id=o.id;
  result:=jsonb_build_object('id',o.id,'complete',not incomplete);
 elsif act='deliver_order' then
  if o.status<>'confirmed' or o.fulfillment_status<>'short' or o.version is distinct from (payload->>'version')::integer then raise exception 'INVALID_ORDER_STATE'; end if;
  if jsonb_typeof(payload->'items')<>'array' or jsonb_array_length(payload->'items')<1 then raise exception 'VALIDATION_ERROR'; end if;
  select coalesce(max(sequence_no),0)+1 into next_sequence from app_private.order_delivery_batches where order_id=o.id;
  insert into app_private.order_delivery_batches(order_id,sequence_no,delivery_kind,delivered_by) values(o.id,next_sequence,'supplement',u.id) returning id into batch_id;
  for el in select value from jsonb_array_elements(payload->'items') loop
   select * into i from app_private.sales_order_items where id=(el->>'order_item_id')::uuid and order_id=o.id for update;
   if i.id is null or coalesce(el->>'quantity','')!~'^[1-9][0-9]*$' then raise exception 'VALIDATION_ERROR'; end if;
   qty:=(el->>'quantity')::integer; remaining:=i.quantity-i.delivered_quantity;
   if qty>remaining then raise exception 'DELIVERY_EXCEEDS_ORDERED'; end if;
   if qty>(select on_hand from app_private.inventory_balances where product_id=i.product_id) then raise exception 'INSUFFICIENT_STOCK'; end if;
   perform app_private.move_stock(i.product_id,-qty,'sale',u.id,null,i.id);
   insert into app_private.order_delivery_items(batch_id,order_item_id,quantity,unit_price_snapshot) values(batch_id,i.id,qty,i.unit_sale_price);
   update app_private.sales_order_items set delivered_quantity=delivered_quantity+qty where id=i.id;
   total:=total+qty*i.unit_sale_price;
  end loop;
  if coalesce(payload->>'payment_amount','0')!~'^[0-9]{1,18}$' then raise exception 'VALIDATION_ERROR'; end if;
  payment:=coalesce(payload->>'payment_amount','0')::numeric;
  select coalesce(sum(amount),0) into paid from app_private.sales_payments where order_id=o.id;
  if paid+payment>o.total_amount+total then raise exception 'PAYMENT_EXCEEDS_DUE'; end if;
  if payment>0 then
   if coalesce(payload->>'payment_method','') not in ('cash','transfer','cod','cod_transfer','cash_transfer') then raise exception 'VALIDATION_ERROR'; end if;
   insert into app_private.sales_payments(order_id,amount,method,note,created_by) values(o.id,payment,payload->>'payment_method','Thu tiền khi giao bổ sung',u.id);
   insert into app_private.audit_logs(actor_id,action,detail) values(u.id,'order.payment',o.id::text || ' / ' || payment::text);
  end if;
  select exists(select 1 from app_private.sales_order_items where order_id=o.id and delivered_quantity<quantity) into incomplete;
  update app_private.sales_orders set total_amount=total_amount+total,fulfillment_status=case when incomplete then 'short' else 'complete' end,missing_summary=case when incomplete then missing_summary else '' end,version=version+1,updated_at=now() where id=o.id;
  result:=jsonb_build_object('id',o.id,'delivered_amount',total::text,'complete',not incomplete);
elsif act='resolve_shortage' then
  if o.status<>'confirmed' or o.fulfillment_status<>'short' then raise exception 'INVALID_ORDER_STATE'; end if;
  if o.version is distinct from (payload->>'version')::integer then raise exception 'VERSION_CONFLICT'; end if;
  if exists(select 1 from app_private.sales_order_items where order_id=o.id and delivered_quantity<quantity) then raise exception 'DELIVERY_INCOMPLETE'; end if;
  insert into app_private.audit_logs(actor_id,action,detail) values(u.id,'shortage.resolved',o.id::text || ' / ' || o.missing_summary);
  update app_private.sales_orders set fulfillment_status='complete',missing_summary='',version=version+1,updated_at=now() where id=o.id;
  result:=jsonb_build_object('id',o.id);
 else raise exception 'VALIDATION_ERROR'; end if;
 insert into app_private.audit_logs(actor_id,action,detail) values(u.id,act,o.id::text);
 update app_private.mutation_requests set result=write_block.result where actor_id=u.id and request_key=key;
 return result;
end $$;
