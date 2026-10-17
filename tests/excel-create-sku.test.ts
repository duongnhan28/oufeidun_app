import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('Excel receipts atomically create SKUs, retain existing prices, reject duplicates and staff', async () => {
 const db=new PGlite();
 const admin='10000000-0000-4000-8000-000000000001', staff='10000000-0000-4000-8000-000000000002';
 try {
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('app.user_id',true),'')::uuid$$;`);
  await db.exec(readFileSync('supabase/migrations/001_shop.sql','utf8'));
  for(const [id,role] of [[admin,'admin'],[staff,'staff']]){await db.query('insert into auth.users values($1)',[id]);await db.query('insert into app_private.app_users(id,display_name,role) values($1,$2,$2)',[id,role]);}
  const receipt=async(items:unknown[],key=crypto.randomUUID(),actor=admin)=>{
   await db.query("select set_config('app.user_id',$1,false)",[actor]);
   return db.query('select public.shop_write($1::jsonb)',[JSON.stringify({action:'inventory',key,type:'receipt',reason:'Excel',items})]);
  };
  const item={sku:' new-1 ',quantity:3,purchase_price:'12000'}; const key=crypto.randomUUID();
  await receipt([item],key); await receipt([item],key);
  const products=()=>db.query<any>('select p.*,b.on_hand,c.fixed_cost from app_private.products p join app_private.inventory_balances b on b.product_id=p.id join app_private.product_costs c on c.product_id=p.id');
  let p=(await products()).rows[0];
  assert.equal(p.sku,'NEW-1'); assert.equal(p.name,'NEW-1'); assert.equal(p.on_hand,3); assert.equal(Number(p.fixed_cost),12000); assert.equal(Number(p.sale_price),0); assert.equal(p.glass_type,'other');
  await db.query('update app_private.products set sale_price=25000,name=$1 where id=$2',['Old internal name',p.id]);
  await receipt([{sku:'NEW-1',quantity:2,purchase_price:'15000'}]);
  p=(await products()).rows[0]; assert.equal(p.on_hand,5); assert.equal(Number(p.sale_price),25000); assert.equal(Number(p.fixed_cost),12000); assert.equal(p.name,'Old internal name');
  await assert.rejects(receipt([{sku:'ROLLBACK',quantity:1,purchase_price:'1'},{sku:'BAD',quantity:0,purchase_price:'1'}]));
  assert.equal((await products()).rows.length,1);
  await assert.rejects(receipt([{sku:'NEW-1',quantity:1,purchase_price:'1'},{product_id:p.id,quantity:1,purchase_price:'1'}]));
  assert.equal((await products()).rows[0].on_hand,5);
  await assert.rejects(receipt([{sku:'STAFF-NEW',quantity:1,purchase_price:'1'}],crypto.randomUUID(),staff),/FORBIDDEN/);
  await assert.rejects(receipt([{sku:'X'.repeat(51),quantity:1,purchase_price:'1'}]));
  await db.query('update app_private.products set deleted_at=now() where id=$1',[p.id]);
  await assert.rejects(receipt([{sku:'NEW-1',quantity:1,purchase_price:'1'}]),/PRODUCT_NOT_FOUND/);
  assert.equal((await products()).rows[0].on_hand,5);
 } finally {await db.close();}
});
