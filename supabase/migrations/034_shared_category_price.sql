-- Update one catalog price tier without touching cost/customer prices/orders.
create or replace function public.app_ban_hang_bulk_price(payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor app_ban_hang.app_users; group_type text; tier text; amount numeric; changed integer;
begin
 actor:=app_ban_hang.current_actor();
 if actor.role<>'admin' then raise exception 'FORBIDDEN'; end if;
 group_type:=payload->>'glass_type';
 if coalesce(group_type,'') not in ('clear','privacy','matte','other','full_border','premium_borderless') then raise exception 'VALIDATION_ERROR'; end if;
 if payload ? 'price_field' then
   tier:=payload->>'price_field';
   if coalesce(tier,'') not in ('sale_price','wholesale_price') or coalesce(payload->>'unit_price','') !~ '^[0-9]{1,15}$' then raise exception 'VALIDATION_ERROR'; end if;
   amount:=(payload->>'unit_price')::numeric;
   update app_ban_hang.products set
     sale_price=case when tier='sale_price' then amount else sale_price end,
     wholesale_price=case when tier='wholesale_price' then amount else wholesale_price end,
     price_version=price_version+case when (tier='sale_price' and sale_price<>amount) or (tier='wholesale_price' and wholesale_price<>amount) then 1 else 0 end,
     version=version+1
   where active and deleted_at is null and (glass_type=group_type or (group_type in ('clear','full_border') and glass_type in ('clear','full_border')));
   get diagnostics changed=row_count;
 else
   if coalesce(payload->>'sale_price','') !~ '^[0-9]{1,15}$' or coalesce(payload->>'wholesale_price','') !~ '^[0-9]{1,15}$' or coalesce(payload->>'fixed_cost','') !~ '^[0-9]{1,15}$' then raise exception 'VALIDATION_ERROR'; end if;
   update app_ban_hang.product_costs c set fixed_cost=(payload->>'fixed_cost')::numeric from app_ban_hang.products p
   where c.product_id=p.id and p.active and p.deleted_at is null and (p.glass_type=group_type or (group_type in ('clear','full_border') and p.glass_type in ('clear','full_border')));
   update app_ban_hang.products set sale_price=(payload->>'sale_price')::numeric,wholesale_price=(payload->>'wholesale_price')::numeric,
     price_version=price_version+case when sale_price<>(payload->>'sale_price')::numeric or wholesale_price<>(payload->>'wholesale_price')::numeric then 1 else 0 end,version=version+1
   where active and deleted_at is null and (glass_type=group_type or (group_type in ('clear','full_border') and glass_type in ('clear','full_border')));
   get diagnostics changed=row_count;
 end if;
 insert into app_ban_hang.audit_logs(actor_id,action,detail) values(actor.id,'product.bulk_price',group_type||': '||coalesce(tier,'all')||'; '||coalesce(amount::text,payload->>'sale_price')||'; '||changed||' mã');
 return jsonb_build_object('updated',changed);
end $$;
revoke all on function public.app_ban_hang_bulk_price(jsonb) from public,anon;
grant execute on function public.app_ban_hang_bulk_price(jsonb) to authenticated;

