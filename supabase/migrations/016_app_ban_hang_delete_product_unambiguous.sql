-- Avoid all PL/pgSQL variable/column ambiguity in the product deletion RPC.
create or replace function public.app_ban_hang_delete_product(payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor app_ban_hang.app_users;
  product_row app_ban_hang.products;
  balance_row app_ban_hang.inventory_balances;
  old_request app_ban_hang.mutation_requests;
  v_request_key uuid;
  v_product_id uuid;
  v_result jsonb;
begin
  actor:=app_ban_hang.current_actor();
  if actor.role<>'admin' then raise exception 'FORBIDDEN'; end if;
  perform app_ban_hang.only_keys(payload,array['action','key','id','version']);
  if payload->>'action'<>'delete_product' then raise exception 'VALIDATION_ERROR'; end if;
  begin
    v_request_key:=(payload->>'key')::uuid;
    v_product_id:=(payload->>'id')::uuid;
  exception when others then raise exception 'VALIDATION_ERROR'; end;

  insert into app_ban_hang.mutation_requests(actor_id,request_key,payload)
  values(actor.id,v_request_key,payload) on conflict do nothing;
  select * into old_request from app_ban_hang.mutation_requests request_row
  where request_row.actor_id=actor.id and request_row.request_key=v_request_key for update;
  if old_request.payload<>payload then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  if old_request.result is not null then return old_request.result; end if;

  select * into product_row from app_ban_hang.products product_record
  where product_record.id=v_product_id and product_record.deleted_at is null for update;
  if product_row.id is null then raise exception 'PRODUCT_NOT_FOUND'; end if;
  if product_row.version is distinct from (payload->>'version')::integer then raise exception 'VERSION_CONFLICT'; end if;
  select * into balance_row from app_ban_hang.inventory_balances balance_record
  where balance_record.product_id=v_product_id for update;
  if balance_row.on_hand<>0 then raise exception 'PRODUCT_HAS_STOCK'; end if;
  if exists(select 1 from app_ban_hang.sales_order_items item join app_ban_hang.sales_orders order_row on order_row.id=item.order_id where item.product_id=v_product_id and order_row.status='draft') then
    raise exception 'PRODUCT_IN_USE';
  end if;

  update app_ban_hang.products set active=false,deleted_at=now(),version=version+1 where id=v_product_id;
  insert into app_ban_hang.audit_logs(actor_id,action,detail) values(actor.id,'product.delete',product_row.sku);
  v_result:=jsonb_build_object('id',v_product_id);
  update app_ban_hang.mutation_requests request_row set result=v_result
  where request_row.actor_id=actor.id and request_row.request_key=v_request_key;
  return v_result;
end
$$;

revoke all on function public.app_ban_hang_delete_product(jsonb) from public,anon;
grant execute on function public.app_ban_hang_delete_product(jsonb) to authenticated;
