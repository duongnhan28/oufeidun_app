alter table app_ban_hang.sales_orders add column if not exists ordered_at timestamptz,
 add column if not exists extra_cost numeric(18,0) not null default 0,
 add column if not exists extra_cost_note text not null default '';
alter table app_ban_hang.sales_order_items add column if not exists models_snapshot jsonb;
update app_ban_hang.sales_orders set ordered_at=coalesce(confirmed_at,created_at) where ordered_at is null;

create or replace function app_ban_hang.order_date(value text) returns timestamptz language plpgsql set search_path='' as $$
declare d timestamptz; wall text;
begin
 if value is null or value !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\+07:00)?$' then raise exception 'INVALID_ORDER_DATE'; end if;
 wall:=regexp_replace(value,'\+07:00$','');
 if length(wall)=16 then wall:=wall||':00'; end if;
 d:=(wall||'+07:00')::timestamptz;
 if substring(wall,1,4)<'2000' or substring(wall,1,4)>'2100' or to_char(d at time zone 'Asia/Ho_Chi_Minh','YYYY-MM-DD"T"HH24:MI:SS')<>wall then raise exception 'INVALID_ORDER_DATE'; end if;
 return d;
end $$;

do $patch$
declare def text;
 save_details text:=$branch$
  -- order_details_v1
  if payload ? 'extra_cost' and coalesce(payload->>'extra_cost','') !~ '^[0-9]{1,15}$' then raise exception 'VALIDATION_ERROR'; end if;
  if length(coalesce(payload->>'extra_cost_note',''))>1000 then raise exception 'VALIDATION_ERROR'; end if;
  update app_ban_hang.sales_orders set ordered_at=case when payload ? 'ordered_at' then app_ban_hang.order_date(payload->>'ordered_at') else coalesce(ordered_at,created_at) end,
   extra_cost=case when payload ? 'extra_cost' then (payload->>'extra_cost')::numeric else extra_cost end,
   extra_cost_note=coalesce(payload->>'extra_cost_note',extra_cost_note) where id=oid;
  update app_ban_hang.sales_orders set total_amount=(select coalesce(sum(quantity*unit_sale_price),0) from app_ban_hang.sales_order_items where order_id=oid)+extra_cost where id=oid;
  result:=jsonb_build_object('id',oid); detail:=oid::text;
 elsif act='order_date' then
  perform app_ban_hang.only_keys(payload,array['action','key','id','version','ordered_at']);
  select * into o from app_ban_hang.sales_orders where id=(payload->>'id')::uuid for update;
  if o.id is null or (u.role<>'admin' and o.created_by<>u.id) then raise exception 'FORBIDDEN'; end if;
  if o.status not in ('draft','confirmed','partially_returned','returned') then raise exception 'INVALID_ORDER_STATE'; end if;
  if o.version is distinct from (payload->>'version')::integer then raise exception 'VERSION_CONFLICT'; end if;
  update app_ban_hang.sales_orders set ordered_at=app_ban_hang.order_date(payload->>'ordered_at'),version=version+1,updated_at=now() where id=o.id;
  result:=jsonb_build_object('id',o.id); detail:=o.id::text;
$branch$;
begin
 select pg_get_functiondef('public.app_ban_hang_write(jsonb)'::regprocedure) into def;
 if position('-- order_details_v1' in def)=0 then
  def:=replace(def,'''save_draft'',''confirm_order'',''delete_draft''','''save_draft'',''confirm_order'',''delete_draft'',''order_date''');
  def:=replace(def,'''note'',''order_code''','''note'',''order_code'',''ordered_at'',''extra_cost'',''extra_cost_note''');
  def:=replace(def,'''customer_phone'',''note'']','''customer_phone'',''note'',''ordered_at'',''extra_cost'',''extra_cost_note'']');
  if position('result:=jsonb_build_object(''id'',oid); detail:=oid::text;' in def)=0 then raise exception 'Missing save marker'; end if;
  def:=regexp_replace(def,'result:=jsonb_build_object\(''id'',oid\); detail:=oid::text;',save_details);
  execute def;
 end if;
 select pg_get_functiondef('public.app_ban_hang_order_features(jsonb)'::regprocedure) into def;
 if position(')+extra_cost' in def)=0 then
  def:=replace(def,'where order_id=o.id),version=','where order_id=o.id)+extra_cost,version=');
  def:=replace(def,'where order_id=order_row.id),version=','where order_id=order_row.id)+extra_cost,version=');
  execute def;
 end if;
 select pg_get_functiondef('public.app_ban_hang_partial_fulfillment(jsonb)'::regprocedure) into def;
 def:=replace(def,'total_amount=total,fulfillment_status=','total_amount=total+o.extra_cost,fulfillment_status=');
 def:=replace(def,'product_name_snapshot=coalesce(i.custom_name,p.name) where id=i.id','product_name_snapshot=coalesce(i.custom_name,p.name),models_snapshot=to_jsonb(p.models) where id=i.id');
 execute def;
 select pg_get_functiondef('public.app_ban_hang_order_extras()'::regprocedure) into def;
 if position('''extra_cost''' in def)=0 then
  def:=replace(def,'''order_id'',o.id,','''order_id'',o.id,''ordered_at'',o.ordered_at,''extra_cost'',o.extra_cost::text,''extra_cost_note'',o.extra_cost_note,');
  def:=replace(def,'''item_note'',i.item_note,','''item_note'',i.item_note,''models_snapshot'',i.models_snapshot,');
  execute def;
 end if;
 select pg_get_functiondef('public.app_ban_hang_read(jsonb)'::regprocedure) into def;
 if position('''other_charges''' in def)=0 then
  def:=replace(def,'''revenue'',','''other_charges'',(select coalesce(sum(o.extra_cost),0)::text from app_ban_hang.sales_orders o where o.confirmed_at>=d1 and o.confirmed_at<d2 and o.status<>''cancelled'' and (coalesce(payload->>''brand'',''all'')=''all'' or exists(select 1 from app_ban_hang.sales_order_items i join app_ban_hang.products p on p.id=i.product_id where i.order_id=o.id and p.brand=payload->>''brand''))),''revenue'',');
  execute def;
 end if;
 if to_regprocedure('public.app_ban_hang_report(jsonb)') is not null then
  select pg_get_functiondef('public.app_ban_hang_report(jsonb)'::regprocedure) into def;
  if position('''other_charges''' in def)=0 then
   def:=replace(def,'''revenue'',','''other_charges'',(select coalesce(sum(o.extra_cost),0)::text from app_ban_hang.sales_orders o where o.confirmed_at>=d1 and o.confirmed_at<d2 and o.status<>''cancelled'' and (coalesce(payload->>''brand'',''all'')=''all'' or exists(select 1 from app_ban_hang.sales_order_items i join app_ban_hang.products p on p.id=i.product_id where i.order_id=o.id and p.brand=payload->>''brand''))),''revenue'',');
   execute def;
  end if;
 end if;
end $patch$;
