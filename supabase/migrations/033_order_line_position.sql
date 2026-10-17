-- Add selection order without altering existing business values or ownership guards.
alter table app_ban_hang.sales_order_items add column if not exists line_position integer not null default 0 check(line_position>=0);
create index if not exists sales_order_items_position on app_ban_hang.sales_order_items(order_id,line_position,id);

do $migration$
declare definition text; patched text; target text;
begin
 definition:=pg_get_functiondef('public.app_ban_hang_write(jsonb)'::regprocedure);
 if position('-- order_line_position_v1' in definition)=0 then
  if position('-- sale_lines_v2' in definition)=0 then raise exception 'Sale-line save hook missing';end if;
  patched:=replace(definition,'-- sale_lines_v2',$hook$-- order_line_position_v1
  update app_ban_hang.sales_order_items line set line_position=(entry.ordinality-1)::integer
  from jsonb_array_elements(payload->'items') with ordinality as entry(value,ordinality)
  where line.order_id=oid and line.product_id=(entry.value->>'product_id')::uuid
   and line.item_kind=coalesce(entry.value->>'item_kind','sale');
  -- sale_lines_v2$hook$);
  execute patched;
 end if;
 foreach target in array array['public.app_ban_hang_read_before_product_delete(jsonb)','public.app_ban_hang_read(jsonb)','public.app_ban_hang_order_extras()'] loop
  definition:=pg_get_functiondef(target::regprocedure);
  patched:=replace(definition,'order by i.id)','order by i.line_position,i.id)');
  if patched=definition and position('order by i.line_position,i.id)' in definition)=0 then
   if target='public.app_ban_hang_read(jsonb)' and position('app_ban_hang_read_before_product_delete' in definition)>0 then continue;end if;
   raise exception 'Line read hook missing: %',target;
  end if;
  execute patched;
 end loop;
end $migration$;
