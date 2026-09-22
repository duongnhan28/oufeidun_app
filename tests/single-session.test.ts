import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('one account can hold only one active AppBanHang session', async () => {
  const db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('app.user_id',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql as $$select coalesce(nullif(current_setting('app.jwt',true),''),'{}')::jsonb$$;
  `);
  await db.exec(await readFile('supabase/migrations/004_app_ban_hang_isolated.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/007_app_ban_hang_single_session.sql', 'utf8'));
  const user = '10000000-0000-4000-8000-000000000099';
  const first = '20000000-0000-4000-8000-000000000001';
  const second = '20000000-0000-4000-8000-000000000002';
  await db.query('insert into auth.users values($1)', [user]);
  await db.query("insert into app_ban_hang.app_users(id,display_name,role) values($1,'Admin','admin')", [user]);
  await db.query("select set_config('app.user_id',$1,false)", [user]);
  await db.query("select set_config('app.jwt',$1,false)", [JSON.stringify({ session_id: first })]);
  await db.query('select public.app_ban_hang_claim_session($1)', [crypto.randomUUID()]);
  await db.query("select set_config('app.jwt',$1,false)", [JSON.stringify({ session_id: second })]);
  await assert.rejects(
    db.query('select public.app_ban_hang_claim_session($1)', [crypto.randomUUID()]),
    /SESSION_ALREADY_ACTIVE/,
  );
  await db.query("select set_config('app.jwt',$1,false)", [JSON.stringify({ session_id: first })]);
  await db.query('select public.app_ban_hang_release_session()');
  await db.query("select set_config('app.jwt',$1,false)", [JSON.stringify({ session_id: second })]);
  await db.query('select public.app_ban_hang_claim_session($1)', [crypto.randomUUID()]);
  const workspace = await db.query<{ data: { me: { id: string } } }>('select public.app_ban_hang_read($1::jsonb) data', ['{}']);
  assert.equal(workspace.rows[0].data.me.id, user);
  await db.close();
});
