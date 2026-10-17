-- Read-only visibility is shared within the store. Write ownership checks are unchanged.
do $migration$
declare target text; definition text; patched text;
begin
 foreach target in array array['public.app_ban_hang_read_before_product_delete(jsonb)','public.app_ban_hang_read(jsonb)','public.app_ban_hang_order_extras()','public.app_ban_hang_business_extras()'] loop
  definition:=pg_get_functiondef(target::regprocedure);
  patched:=replace(definition,'(u.role=''admin'' or o.created_by=u.id)','(true /* shared_order_read */)');
  patched:=replace(patched,'(actor.role=''admin'' or o.created_by=actor.id)','(true /* shared_order_read */)');
  if patched=definition and position('shared_order_read' in definition)=0 then
   if target='public.app_ban_hang_read(jsonb)' and position('app_ban_hang_read_before_product_delete' in definition)>0 then continue; end if;
   raise exception 'Shared order read predicate missing: %',target;
  end if;
  execute patched;
 end loop;
end $migration$;
