-- Share order reads within the store. Mutation ownership and cost permissions stay unchanged.
do $migration$
declare target text; definition text; patched text;
begin
 foreach target in array array['public.shop_read(jsonb)','public.shop_order_extras()','public.shop_business_extras()'] loop
  definition:=pg_get_functiondef(target::regprocedure);
  patched:=replace(definition,'(u.role=''admin'' or o.created_by=u.id)','(true /* shared_order_read */)');
  patched:=replace(patched,'(actor.role=''admin'' or o.created_by=actor.id)','(true /* shared_order_read */)');
  if patched=definition and position('shared_order_read' in definition)=0 then raise exception 'Shared order read predicate missing: %',target; end if;
  execute patched;
 end loop;
end $migration$;
