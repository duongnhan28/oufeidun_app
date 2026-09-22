import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('admin safely deletes an empty glass SKU while preserving stock and draft rules', async () => {
  const db = new PGlite();
  const admin = crypto.randomUUID();
  const staff = crypto.randomUUID();
  const call = async (actor: string, payload: Record<string, unknown>, read = false) => {
    await db.query("select set_config('app.user_id',$1,false)", [actor]);
    const body = read ? payload : { key: crypto.randomUUID(), ...payload };
    return (await db.query<{ result: any }>(`select public.${read ? 'shop_read' : 'shop_write'}($1::jsonb) result`, [JSON.stringify(body)])).rows[0].result;
  };

  try {
    await db.exec("create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('app.user_id',true),'')::uuid$$;");
    await db.exec(readFileSync('supabase/migrations/001_shop.sql', 'utf8'));
    for (const [id, role] of [[admin, 'admin'], [staff, 'staff']]) {
      await db.query('insert into auth.users values($1)', [id]);
      await db.query('insert into app_private.app_users(id,display_name,role) values($1,$2,$3)', [id, role, role]);
    }

    const product = await call(admin, { action: 'product', sku: 'DEL-0', name: 'Kính được xóa', glass_type: 'clear', models: [], brand: 'Khác', sale_price: '10000', fixed_cost: '5000', active: true });
    await assert.rejects(call(staff, { action: 'delete_product', id: product.id, version: 1 }), /FORBIDDEN/);
    const deleteCommand = { action: 'delete_product', key: crypto.randomUUID(), id: product.id, version: 1 };
    await db.query("select set_config('app.user_id',$1,false)", [admin]);
    const first = (await db.query<{ result: any }>('select public.shop_write($1::jsonb) result', [JSON.stringify(deleteCommand)])).rows[0].result;
    const repeated = (await db.query<{ result: any }>('select public.shop_write($1::jsonb) result', [JSON.stringify(deleteCommand)])).rows[0].result;
    assert.deepEqual(repeated, first);
    const workspace = await call(admin, {}, true);
    assert.equal(workspace.products.some((item: { id: string }) => item.id === product.id), false);
    assert.equal(workspace.logs[0].action, 'product.delete');

    const stocked = await call(admin, { action: 'product', sku: 'DEL-STOCK', name: 'Kính còn tồn', glass_type: 'clear', models: [], brand: 'Khác', sale_price: '10000', fixed_cost: '5000', active: true });
    await call(admin, { action: 'inventory', type: 'opening', reason: 'Tồn kiểm thử', items: [{ product_id: stocked.id, quantity: 1 }] });
    await assert.rejects(call(admin, { action: 'delete_product', id: stocked.id, version: 1 }), /PRODUCT_HAS_STOCK/);

    const drafted = await call(admin, { action: 'product', sku: 'DEL-DRAFT', name: 'Kính trong nháp', glass_type: 'clear', models: [], brand: 'Khác', sale_price: '10000', fixed_cost: '5000', active: true });
    await call(admin, { action: 'save_draft', id: null, items: [{ product_id: drafted.id, quantity: 1, custom_name: null }], customer_name: '', customer_phone: '', note: '' });
    await assert.rejects(call(admin, { action: 'delete_product', id: drafted.id, version: 1 }), /PRODUCT_IN_USE/);
  } finally {
    await db.close();
  }
});
