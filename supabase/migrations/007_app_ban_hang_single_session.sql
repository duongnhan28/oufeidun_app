-- One active AppBanHang session per account. Auth data remains managed by Supabase Auth.
create table app_ban_hang.active_sessions (
  user_id uuid primary key references app_ban_hang.app_users(id) on delete cascade,
  auth_session_id uuid not null,
  device_id uuid not null,
  claimed_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
alter table app_ban_hang.active_sessions enable row level security;
revoke all on app_ban_hang.active_sessions from public,anon,authenticated;

create or replace function app_ban_hang.current_session_id() returns uuid
language plpgsql stable security definer set search_path='' as $$
declare sid uuid;
begin
  sid:=nullif(auth.jwt()->>'session_id','')::uuid;
  if sid is null then raise exception 'SESSION_REQUIRED'; end if;
  return sid;
end $$;

create or replace function public.app_ban_hang_claim_session(p_device_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); sid uuid:=app_ban_hang.current_session_id(); row app_ban_hang.active_sessions; account app_ban_hang.app_users;
begin
  if p_device_id is null then raise exception 'VALIDATION_ERROR'; end if;
  select * into account from app_ban_hang.app_users where id=uid for share;
  if account.id is null then raise exception 'UNAUTHENTICATED'; end if;
  if not account.active then raise exception 'ACCOUNT_DISABLED'; end if;
  insert into app_ban_hang.active_sessions(user_id,auth_session_id,device_id)
  values(uid,sid,p_device_id) on conflict(user_id) do nothing;
  select * into row from app_ban_hang.active_sessions where user_id=uid for update;
  if row.auth_session_id<>sid and row.last_seen_at>now()-interval '90 seconds' then
    raise exception 'SESSION_ALREADY_ACTIVE';
  end if;
  update app_ban_hang.active_sessions
  set auth_session_id=sid,device_id=p_device_id,claimed_at=case when auth_session_id=sid then claimed_at else now() end,last_seen_at=now()
  where user_id=uid;
  return jsonb_build_object('ok',true);
end $$;

create or replace function public.app_ban_hang_touch_session() returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); sid uuid:=app_ban_hang.current_session_id();
begin
  update app_ban_hang.active_sessions set last_seen_at=now()
  where user_id=uid and auth_session_id=sid;
  if not found then raise exception 'SESSION_REPLACED'; end if;
  return jsonb_build_object('ok',true);
end $$;

create or replace function public.app_ban_hang_release_session() returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); sid uuid:=app_ban_hang.current_session_id();
begin
  delete from app_ban_hang.active_sessions where user_id=uid and auth_session_id=sid;
  return jsonb_build_object('ok',true);
end $$;

create or replace function app_ban_hang.current_actor() returns app_ban_hang.app_users
language plpgsql security definer set search_path='' as $$
declare u app_ban_hang.app_users; sid uuid:=app_ban_hang.current_session_id();
begin
  select * into u from app_ban_hang.app_users where id=auth.uid() for share;
  if u.id is null then raise exception 'UNAUTHENTICATED'; end if;
  if not u.active then raise exception 'ACCOUNT_DISABLED'; end if;
  update app_ban_hang.active_sessions set last_seen_at=now()
  where user_id=u.id and auth_session_id=sid;
  if not found then raise exception 'SESSION_REQUIRED'; end if;
  return u;
end $$;

create or replace function public.can_access_app_ban_hang_images(write_access boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(
   select 1 from app_ban_hang.app_users u
   join app_ban_hang.active_sessions s on s.user_id=u.id
   where u.id=auth.uid() and u.active
     and s.auth_session_id=nullif(auth.jwt()->>'session_id','')::uuid
     and (not write_access or u.role='admin')
 )
$$;

revoke all on function app_ban_hang.current_session_id() from public,anon,authenticated;
revoke all on function public.app_ban_hang_claim_session(uuid),public.app_ban_hang_touch_session(),public.app_ban_hang_release_session() from public,anon;
grant execute on function public.app_ban_hang_claim_session(uuid),public.app_ban_hang_touch_session(),public.app_ban_hang_release_session() to authenticated;
