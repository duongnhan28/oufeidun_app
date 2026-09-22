import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('isolated production migration creates only AppBanHang schema and sample catalog', async () => {
  const db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$select null::uuid$$;
  `);
  const migration = await readFile('supabase/migrations/004_app_ban_hang_isolated.sql', 'utf8');
  const sample = await readFile('supabase/migrations/006_app_ban_hang_sample.sql', 'utf8');
  const deleteProduct = await readFile('supabase/migrations/014_app_ban_hang_delete_product.sql', 'utf8');
  const salesFeedback = await readFile('supabase/migrations/017_app_order_sales_feedback.sql', 'utf8');
  await db.exec(migration);
  await db.exec(sample);
  await db.exec(deleteProduct);
  await db.exec(salesFeedback);

  const schemas = await db.query<{ schema_name: string }>(`
    select schema_name from information_schema.schemata
    where schema_name in ('app_ban_hang','app_private') order by schema_name
  `);
  assert.deepEqual(schemas.rows.map(row => row.schema_name), ['app_ban_hang']);
  const counts = await db.query<{ products: number; brands: number; stock: number }>(`
    select
      (select count(*)::int from app_ban_hang.products) products,
      (select count(*)::int from app_ban_hang.glass_brands) brands,
      (select coalesce(sum(on_hand),0)::int from app_ban_hang.inventory_balances) stock
  `);
  assert.deepEqual(counts.rows[0], { products: 6, brands: 1, stock: 0 });
  const additions = await db.query<{ addresses: number; payments: number }>(`
    select
      count(*) filter(where table_name='sales_orders' and column_name='customer_address')::int addresses,
      count(*) filter(where table_name='sales_payments')::int payments
    from information_schema.columns where table_schema='app_ban_hang'
  `);
  assert.deepEqual(additions.rows[0], { addresses: 1, payments: 7 });
  await db.close();
});
