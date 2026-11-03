import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {PGlite} from '@electric-sql/pglite';
test('per-account capabilities keep legacy staff, deny new staff, permit quantity-only receipt without exposing costs',async()=>{
 const db=new PGlite(),admin='10000000-0000-4000-8000-000000000001',staff='10000000-0000-4000-8000-000000000002';
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('app.user_id',true),'')::uuid$$;`);
  for(const f of ['supabase/migrations/001_shop.sql','supabase/migrations/003_glass_brands.sql',...['partial-fulfillment','excel-create-sku','product-import','order-details','catalog-sales','shared-orders','order-line-position','shared-category-price','shared-operations','edit-unused-codes','customer-identity','report-order-date','stock-adjustment','product-renames','staff-permissions'].map(n=>`src/data/demo-${n}.sql`)])await db.exec(readFileSync(f,'utf8'));
  await db.query('insert into auth.users values($1),($2)',[admin,staff]);await db.query("insert into app_private.app_users(id,display_name,role) values($1,'Admin','admin'),($2,'Staff','staff')",[admin,staff]);
  const as=async(id:string)=>db.query("select set_config('app.user_id',$1,false)",[id]);
  const rpc=async(p:any,fn='shop_write')=>(await db.query<any>(`select public.${fn}($1::jsonb) r`,[JSON.stringify(p)])).rows[0].r;
  const write=(p:any)=>rpc({key:crypto.randomUUID(),...p});
  await as(admin);const p=await write({action:'product',sku:'PERM-GLASS',name:'PERM-GLASS',glass_type:'clear',brand:'Apple',models:[],sale_price:'10000',fixed_cost:'1234',active:true});await write({action:'inventory',type:'opening',reason:'test',items:[{product_id:p.id,quantity:10}]});
  await as(staff);await rpc({action:'report',from:'2026-10-01',to:'2026-10-28'},'shop_read');
  await db.query("update app_private.app_users set permissions='{}' where id=$1",[staff]);
  await assert.rejects(rpc({action:'report',from:'2026-10-01',to:'2026-10-28'},'shop_read'),/FORBIDDEN/);
  const receipt={action:'inventory',key:crypto.randomUUID(),type:'receipt',reason:'Staff quantities',items:[{product_id:p.id,quantity:2}]};await assert.rejects(rpc(receipt),/FORBIDDEN/);
  await db.query("update app_private.app_users set permissions='{\"receive_stock\":true}' where id=$1",[staff]);await rpc(receipt);await rpc(receipt);
  assert.equal((await db.query<any>('select on_hand from app_private.inventory_balances where product_id=$1',[p.id])).rows[0].on_hand,12);
  assert.equal((await db.query<any>('select fixed_cost::text value from app_private.product_costs where product_id=$1',[p.id])).rows[0].value,'1234');
  await assert.rejects(write({...receipt,key:crypto.randomUUID(),items:[{product_id:p.id,quantity:1,purchase_price:'0'}]}),/COST_ACCESS_DENIED/);
  await write({...receipt,key:crypto.randomUUID(),items:[{sku:'PERM-NEW',quantity:2}]});
  assert.equal((await db.query<any>("select cost_configured from app_private.products where sku='PERM-NEW'")).rows[0].cost_configured,false);
  await db.query("update app_private.app_users set permissions='{}' where id=$1",[staff]);await assert.rejects(rpc(receipt),/FORBIDDEN/);
  await db.exec(readFileSync('src/data/demo-staff-permissions.sql','utf8'));
  for(const n of ['partial-fulfillment','excel-create-sku','product-import','order-details','catalog-sales','shared-orders','order-line-position','shared-category-price','shared-operations','edit-unused-codes','customer-identity','report-order-date','stock-adjustment','product-renames','staff-permissions'])await db.exec(readFileSync(`src/data/demo-${n}.sql`,'utf8'));
  await as(admin);assert.ok((await rpc({},'shop_read')).products.length);
 }finally{await db.close();}
});
