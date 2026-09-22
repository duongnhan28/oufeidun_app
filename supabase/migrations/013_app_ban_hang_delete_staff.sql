-- Soft-delete staff login access while preserving order and audit foreign keys.
alter table app_ban_hang.app_users add column if not exists deleted_at timestamptz;
drop index if exists app_ban_hang.app_users_login_name_unique;
create unique index app_users_login_name_unique on app_ban_hang.app_users(lower(login_name)) where deleted_at is null;

create or replace function public.app_ban_hang_resolve_login(p_login_name text)
returns text language sql stable security definer set search_path='' as $$
  select auth_user.email from app_ban_hang.app_users app_user
  join auth.users auth_user on auth_user.id=app_user.id
  where lower(app_user.login_name)=lower(trim(p_login_name)) and app_user.active
    and app_user.deleted_at is null and auth_user.deleted_at is null limit 1
$$;
revoke all on function public.app_ban_hang_resolve_login(text) from public;
grant execute on function public.app_ban_hang_resolve_login(text) to anon,authenticated;

create or replace function public.app_ban_hang_list_users()
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor app_ban_hang.app_users;
begin
  actor:=app_ban_hang.current_actor();
  if actor.role<>'admin' then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',id,'display_name',display_name,'role',role,'active',active) order by case when role='admin' then 0 else 1 end,created_at) from app_ban_hang.app_users where deleted_at is null),'[]'::jsonb);
end
$$;
revoke all on function public.app_ban_hang_list_users() from public,anon;
grant execute on function public.app_ban_hang_list_users() to authenticated;

create or replace function public.app_ban_hang_manage_staff(payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor app_ban_hang.app_users; action_name text:=coalesce(payload->>'action',''); staff_id uuid;
  target_role text; staff_email text; staff_name text; staff_login_name text;
  staff_password text:=coalesce(payload->>'password','');
begin
  actor:=app_ban_hang.current_actor();
  if actor.role<>'admin' then raise exception 'FORBIDDEN'; end if;
  if action_name='create' then
    perform app_ban_hang.only_keys(payload,array['action','display_name','login_name','password']);
    staff_name:=trim(coalesce(payload->>'display_name','')); staff_login_name:=trim(coalesce(payload->>'login_name',''));
    if length(staff_name)<1 or length(staff_name)>100 or length(staff_login_name)<3 or length(staff_login_name)>50 or length(staff_password)<12 or length(staff_password)>128 then raise exception 'VALIDATION_ERROR'; end if;
    if exists(select 1 from app_ban_hang.app_users where lower(login_name)=lower(staff_login_name) and deleted_at is null) then raise exception 'ACCOUNT_EXISTS'; end if;
    staff_id:=gen_random_uuid(); staff_email:='staff-'||replace(staff_id::text,'-','')||'@appbanhang.local';
    insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,confirmation_token,recovery_token,email_change_token_new,email_change,phone,phone_change,phone_change_token,email_change_token_current,reauthentication_token,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_sso_user,is_anonymous)
    values('00000000-0000-0000-0000-000000000000',staff_id,'authenticated','authenticated',staff_email,extensions.crypt(staff_password,extensions.gen_salt('bf')),now(),'','','','',null,'','','','','{"provider":"email","providers":["email"]}'::jsonb,jsonb_build_object('email_verified',true),now(),now(),false,false);
    insert into auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at) values(staff_id::text,staff_id,jsonb_build_object('sub',staff_id::text,'email',staff_email,'email_verified',true,'phone_verified',false),'email',now(),now());
    insert into app_ban_hang.app_users(id,display_name,login_name,role,active) values(staff_id,staff_name,staff_login_name,'staff',true);
    insert into app_ban_hang.audit_logs(actor_id,action,detail) values(actor.id,'staff.create',staff_id::text);
    return jsonb_build_object('id',staff_id);
  elsif action_name='profile' then
    perform app_ban_hang.only_keys(payload,array['action','display_name']); staff_name:=trim(coalesce(payload->>'display_name',''));
    if length(staff_name)<1 or length(staff_name)>100 then raise exception 'VALIDATION_ERROR'; end if;
    update app_ban_hang.app_users set display_name=staff_name where id=actor.id and role='admin';
    insert into app_ban_hang.audit_logs(actor_id,action,detail) values(actor.id,'admin.profile',staff_name);
    return jsonb_build_object('id',actor.id);
  elsif action_name='reset' then
    perform app_ban_hang.only_keys(payload,array['action','id','password']);
    if length(staff_password)<12 or length(staff_password)>128 then raise exception 'VALIDATION_ERROR'; end if;
    begin staff_id:=(payload->>'id')::uuid; exception when others then raise exception 'VALIDATION_ERROR'; end;
    select role into target_role from app_ban_hang.app_users where id=staff_id and deleted_at is null;
    if target_role is null or (target_role<>'staff' and staff_id<>actor.id) then raise exception 'FORBIDDEN'; end if;
    update auth.users set encrypted_password=extensions.crypt(staff_password,extensions.gen_salt('bf')),updated_at=now() where id=staff_id and deleted_at is null;
    if not found then raise exception 'ACCOUNT_NOT_FOUND'; end if;
    delete from auth.sessions where user_id=staff_id; delete from app_ban_hang.active_sessions where user_id=staff_id;
    insert into app_ban_hang.audit_logs(actor_id,action,detail) values(actor.id,case when staff_id=actor.id then 'admin.password.reset' else 'staff.password.reset' end,staff_id::text);
    return jsonb_build_object('id',staff_id,'self',staff_id=actor.id);
  elsif action_name='delete' then
    perform app_ban_hang.only_keys(payload,array['action','id']);
    begin staff_id:=(payload->>'id')::uuid; exception when others then raise exception 'VALIDATION_ERROR'; end;
    select display_name,role into staff_name,target_role from app_ban_hang.app_users where id=staff_id and deleted_at is null for update;
    if target_role is null then raise exception 'ACCOUNT_NOT_FOUND'; end if;
    if target_role<>'staff' or staff_id=actor.id then raise exception 'FORBIDDEN'; end if;
    delete from auth.sessions where user_id=staff_id; delete from app_ban_hang.active_sessions where user_id=staff_id; delete from auth.identities where user_id=staff_id;
    update auth.users set email='deleted-'||replace(staff_id::text,'-','')||'@appbanhang.local',encrypted_password=extensions.crypt(gen_random_uuid()::text,extensions.gen_salt('bf')),updated_at=now() where id=staff_id;
    update app_ban_hang.app_users set active=false,deleted_at=now() where id=staff_id;
    insert into app_ban_hang.audit_logs(actor_id,action,detail) values(actor.id,'staff.delete',staff_name);
    return jsonb_build_object('id',staff_id);
  end if;
  raise exception 'VALIDATION_ERROR';
end
$$;
revoke all on function public.app_ban_hang_manage_staff(jsonb) from public,anon;
grant execute on function public.app_ban_hang_manage_staff(jsonb) to authenticated;
