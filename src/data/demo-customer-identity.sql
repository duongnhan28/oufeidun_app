-- LOCAL demo parity. This migration is not deployed to Supabase online.
alter table app_private.customers add column if not exists identity_key text generated always as
 (case when trim(phone)<>'' and replace(trim(phone),'0','')=''
 then 'unknown:'||phone||':'||lower(trim(name)) else 'phone:'||phone end) stored;
create unique index if not exists customers_identity_unique on app_private.customers(identity_key);
alter table app_private.customers drop constraint if exists customers_phone_key;

create or replace function public.shop_customer(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u app_private.app_users; cid uuid; old app_private.customers; n text; p text;
begin
 u:=app_private.current_actor();
 if u.role not in ('admin','staff') then raise exception 'FORBIDDEN';end if;
 if payload->>'action'='delete' then
  update app_private.customers set active=false where id=(payload->>'id')::uuid returning id into cid;
 else
  n:=trim(coalesce(payload->>'name',''));p:=trim(coalesce(payload->>'phone',''));
  if length(n) not between 1 and 200 or length(p) not between 1 and 30 or coalesce(payload->>'customer_type','') not in ('retail','wholesale') or length(coalesce(payload->>'address',''))>500 or length(coalesce(payload->>'note',''))>1000 then raise exception 'VALIDATION_ERROR';end if;
  cid:=nullif(payload->>'id','')::uuid;
  if cid is not null then
   select * into old from app_private.customers where id=cid for update;
   if not found then raise exception 'CUSTOMER_NOT_FOUND';end if;
   if coalesce((payload->>'from_order')::boolean,false) and replace(p,'0','')='' and (old.phone<>p or lower(trim(old.name))<>lower(n)) then cid:=null;end if;
  end if;
  if cid is not null then
   begin
    update app_private.customers set name=n,phone=p,customer_type=payload->>'customer_type',address=coalesce(payload->>'address',''),note=coalesce(payload->>'note',''),active=true,updated_at=now() where id=cid;
   exception when unique_violation then raise exception 'CUSTOMER_PHONE_EXISTS';end;
  else
   insert into app_private.customers(name,phone,customer_type,address,note) values(n,p,payload->>'customer_type',coalesce(payload->>'address',''),coalesce(payload->>'note',''))
   on conflict(identity_key) do update set name=excluded.name,customer_type=excluded.customer_type,address=excluded.address,note=excluded.note,active=true,updated_at=now() returning id into cid;
  end if;
 end if;
 return jsonb_build_object('id',cid);
end $$;

do $$declare def text;begin
 def:=pg_get_functiondef('app_private.save_sale_details(uuid,jsonb,jsonb)'::regprocedure);
 if position('''from_order''' in def)=0 then
  def:=replace(def,'''id'',payload->>''customer_id'',','''from_order'',true,''id'',payload->>''customer_id'',');
  execute def;
 end if;
end $$;

insert into app_private.customers(name,phone,customer_type,address,note,active)
select r.customer_name,r.customer_phone,r.customer_type,r.customer_address,'',true from (
 select o.*,row_number() over(partition by o.customer_phone,lower(trim(o.customer_name)) order by o.updated_at desc,o.id) rn
 from app_private.sales_orders o join app_private.customers c on c.id=o.customer_id
 join (select customer_id from app_private.sales_orders where status<>'deleted' and trim(customer_phone)<>'' and replace(trim(customer_phone),'0','')=''
  group by customer_id having count(distinct lower(trim(customer_name)))>1) affected on affected.customer_id=o.customer_id
 where o.status<>'deleted' and c.active and c.phone=o.customer_phone and trim(o.customer_phone)<>'' and replace(trim(o.customer_phone),'0','')=''
 and trim(o.customer_name)<>'' and lower(trim(c.name))<>lower(trim(o.customer_name))
) r where r.rn=1 on conflict(identity_key) do nothing;

update app_private.sales_orders o set customer_id=restored.id
from app_private.customers old,app_private.customers restored
where old.id=o.customer_id and old.active and restored.active and o.status<>'deleted'
and o.customer_id in (select customer_id from app_private.sales_orders where status<>'deleted' and trim(customer_phone)<>'' and replace(trim(customer_phone),'0','')=''
 group by customer_id having count(distinct lower(trim(customer_name)))>1)
and old.phone=o.customer_phone and restored.phone=o.customer_phone
and trim(o.customer_phone)<>'' and replace(trim(o.customer_phone),'0','')=''
and lower(trim(old.name))<>lower(trim(o.customer_name)) and lower(trim(restored.name))=lower(trim(o.customer_name));
