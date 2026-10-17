-- Operational parity without granting the Admin role or access to cost data.
create or replace function app_private.visible_data(role_name text, value jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
begin
 if role_name='admin' or value is null then return value; end if;
 if jsonb_typeof(value)='array' then
  return coalesce((select jsonb_agg(app_private.visible_data(role_name,v) order by n) from jsonb_array_elements(value) with ordinality a(v,n)),'[]');
 elsif jsonb_typeof(value)='object' then
  return coalesce((select jsonb_object_agg(k,app_private.visible_data(role_name,v)) from jsonb_each(value) a(k,v)
   where k<>all(array['fixed_cost','unit_cost','unit_cost_snapshot','fixed_cost_snapshot','unit_purchase_price','purchase_price','cost','total_cost','profit','stock_value','damage'])),'{}');
 end if;
 return value;
end $$;
revoke all on function app_private.visible_data(text,jsonb) from public,anon,authenticated;

do $migration$
declare target text; def text;
begin
 foreach target in array array['public.shop_write(jsonb)','public.shop_order_features(jsonb)','public.shop_order_business(jsonb)','public.shop_partial_fulfillment(jsonb)','public.shop_customer(jsonb)','public.shop_set_wholesale_price(jsonb)','public.shop_bulk_price(jsonb)','public.shop_read(jsonb)'] loop
  def:=replace(pg_get_functiondef(target::regprocedure),E'\r\n',E'\n');
  if position('shared_operations_v1' in def)>0 then continue; end if;
  def:=replace(def,'(o.created_by<>u.id and u.role<>''admin'')','false');
  def:=replace(def,'(u.role<>''admin'' and o.created_by<>u.id)','false');
  if target='public.shop_write(jsonb)' then
   def:=regexp_replace(def,'if act not in \([^;]+and u.role<>''admin'' then raise exception ''FORBIDDEN''; end if;',
    $guard$-- shared_operations_v1
 if u.role<>'admin' then
  if act='import_products' or (act='inventory' and payload->>'type' in ('receipt','opening')) then raise exception 'FORBIDDEN'; end if;
  if payload ? 'fixed_cost' or exists(select 1 from jsonb_array_elements(coalesce(payload->'items','[]')) item where item ? 'purchase_price' or item ? 'fixed_cost') then raise exception 'COST_ACCESS_DENIED'; end if;
 end if;$guard$);
   if position('shared_operations_v1' in def)=0 then raise exception 'Missing operation guard'; end if;
   def:=replace(def,'insert into app_private.product_costs values(pid,(payload->>''fixed_cost'')::numeric);',
    'insert into app_private.product_costs values(pid,case when u.role=''admin'' then (payload->>''fixed_cost'')::numeric else 0 end);');
   def:=replace(def,'update app_private.product_costs set fixed_cost=(payload->>''fixed_cost'')::numeric where product_id=pid;',
    'update app_private.product_costs set fixed_cost=case when u.role=''admin'' then (payload->>''fixed_cost'')::numeric else fixed_cost end where product_id=pid;');
  elsif target='public.shop_read(jsonb)' then
   def:=replace(def,'if u.role<>''admin'' then raise exception ''FORBIDDEN''; end if;','');
   def:=replace(def,'''users'',case when u.role=''admin'' then','''users'',case when true then');
   def:=replace(def,'''logs'',case when u.role=''admin'' then','''logs'',case when true then');
   def:=replace(def,'on a.id=l.actor_id order by l.created_at desc','on a.id=l.actor_id where l.action in (''confirm_order'',''deliver_order'') or (l.action=''inventory'' and (l.detail like ''receipt:%'' or l.detail like ''opening:%'')) order by l.created_at desc');
   def:=replace(def,'return jsonb_build_object(','result:=jsonb_build_object(');
   def:=replace(def,E' end if;\n if act=''history''',E' return app_private.visible_data(u.role,result);\n end if;\n if act=''history''');
   def:=replace(def,'return result;','return app_private.visible_data(u.role,result);');
  else
   def:=replace(def,'if u.role<>''admin'' then raise exception ''FORBIDDEN'';end if;','');
   def:=replace(def,'if actor.role<>''admin'' then raise exception ''FORBIDDEN''; end if;',
    'if actor.role<>''admin'' and payload ? ''fixed_cost'' then raise exception ''COST_ACCESS_DENIED''; end if;');
   if target='public.shop_bulk_price(jsonb)' then
    def:=replace(def,'coalesce(payload->>''fixed_cost'','''') !~ ''^[0-9]{1,15}$''','(actor.role=''admin'' and coalesce(payload->>''fixed_cost'','''') !~ ''^[0-9]{1,15}$'')');
    def:=replace(def,'where c.product_id=p.id and p.active','where actor.role=''admin'' and c.product_id=p.id and p.active');
   end if;
  end if;
  if position('shared_operations_v1' in def)=0 then def:=replace(def,'AS $function$',E'AS $function$\n-- shared_operations_v1\n'); end if;
  execute def;
 end loop;
end $migration$;
