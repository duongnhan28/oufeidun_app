-- Display names and login names are separate business fields.
drop trigger if exists sync_staff_login_name on app_ban_hang.app_users;
drop function if exists app_ban_hang.sync_staff_login_name();

create or replace function public.app_ban_hang_manage_staff(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor app_ban_hang.app_users;
  action_name text := coalesce(payload->>'action', '');
  staff_id uuid;
  staff_email text;
  staff_name text;
  staff_login_name text;
  staff_password text := coalesce(payload->>'password', '');
begin
  actor := app_ban_hang.current_actor();
  if actor.role <> 'admin' then raise exception 'FORBIDDEN'; end if;

  if action_name = 'create' then
    perform app_ban_hang.only_keys(payload, array['action','display_name','login_name','password']);
    staff_name := trim(coalesce(payload->>'display_name', ''));
    staff_login_name := trim(coalesce(payload->>'login_name', ''));
    if length(staff_name) < 1 or length(staff_name) > 100 then raise exception 'VALIDATION_ERROR'; end if;
    if length(staff_login_name) < 3 or length(staff_login_name) > 50 then raise exception 'VALIDATION_ERROR'; end if;
    if length(staff_password) < 12 or length(staff_password) > 128 then raise exception 'VALIDATION_ERROR'; end if;
    if exists(select 1 from app_ban_hang.app_users where lower(login_name) = lower(staff_login_name)) then raise exception 'ACCOUNT_EXISTS'; end if;

    staff_id := gen_random_uuid();
    staff_email := 'staff-' || replace(staff_id::text, '-', '') || '@appbanhang.local';
    insert into auth.users(
      instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
      confirmation_token,recovery_token,email_change_token_new,email_change,
      phone,phone_change,phone_change_token,email_change_token_current,reauthentication_token,
      raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_sso_user,is_anonymous
    ) values (
      '00000000-0000-0000-0000-000000000000',staff_id,'authenticated','authenticated',staff_email,
      extensions.crypt(staff_password,extensions.gen_salt('bf')),now(),
      '','','','',null,'','','','',
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('email_verified',true),now(),now(),false,false
    );
    insert into auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at)
    values(staff_id::text,staff_id,jsonb_build_object('sub',staff_id::text,'email',staff_email,'email_verified',true,'phone_verified',false),'email',now(),now());
    insert into app_ban_hang.app_users(id,display_name,login_name,role,active)
    values(staff_id,staff_name,staff_login_name,'staff',true);
    insert into app_ban_hang.audit_logs(actor_id,action,detail) values(actor.id,'staff.create',staff_id::text);
    return jsonb_build_object('id',staff_id);
  end if;

  if action_name = 'reset' then
    perform app_ban_hang.only_keys(payload, array['action','id','password']);
    if length(staff_password) < 12 or length(staff_password) > 128 then raise exception 'VALIDATION_ERROR'; end if;
    begin staff_id := (payload->>'id')::uuid; exception when others then raise exception 'VALIDATION_ERROR'; end;
    if not exists(select 1 from app_ban_hang.app_users where id=staff_id and role='staff') then raise exception 'FORBIDDEN'; end if;
    update auth.users set encrypted_password=extensions.crypt(staff_password,extensions.gen_salt('bf')),updated_at=now() where id=staff_id and deleted_at is null;
    if not found then raise exception 'ACCOUNT_NOT_FOUND'; end if;
    delete from auth.sessions where user_id=staff_id;
    delete from app_ban_hang.active_sessions where user_id=staff_id;
    insert into app_ban_hang.audit_logs(actor_id,action,detail) values(actor.id,'staff.password.reset',staff_id::text);
    return jsonb_build_object('id',staff_id);
  end if;

  raise exception 'VALIDATION_ERROR';
end
$$;

revoke all on function public.app_ban_hang_manage_staff(jsonb) from public, anon;
grant execute on function public.app_ban_hang_manage_staff(jsonb) to authenticated;
