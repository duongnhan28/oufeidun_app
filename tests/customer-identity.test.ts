import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

test('unknown-phone customers survive autosave, recovery, rerun and manual edits without changing orders',async()=>{
 const db=new PGlite(),actor='10000000-0000-4000-8000-000000000001';
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('app.user_id',true),'')::uuid$$;`);
  for(const file of ['supabase/migrations/001_shop.sql','supabase/migrations/003_glass_brands.sql','src/data/demo-partial-fulfillment.sql','src/data/demo-product-import.sql','src/data/demo-order-details.sql','src/data/demo-catalog-sales.sql'])await db.exec(readFileSync(file,'utf8'));
  await db.query('insert into auth.users values($1)',[actor]);await db.query("insert into app_private.app_users(id,display_name,role) values($1,'Admin','admin')",[actor]);await db.query("select set_config('app.user_id',$1,false)",[actor]);
  const rpc=async(payload:any,fn='shop_customer')=>(await db.query<any>(`select public.${fn}($1::jsonb) r`,[JSON.stringify(payload)])).rows[0].r;
  const p=await rpc({action:'product',key:crypto.randomUUID(),sku:'CUSTOMER-TEST',name:'CUSTOMER-TEST',glass_type:'clear',brand:'Apple',models:[],sale_price:'5000',fixed_cost:'1000',active:true},'shop_write');
  const names=['An','Ân','Châu'],ids=[];
  for(const name of names){
   const o=await rpc({action:'save_draft',key:crypto.randomUUID(),order_code:`OLD-${name}`,customer_name:name,customer_phone:'0',items:[{product_id:p.id,quantity:1}],sale_details:{customer_type:'retail',customer_address:`Địa chỉ ${name}`,fulfillment_status:'complete'}},'shop_write');ids.push(o.id);
  }
  assert.equal((await db.query<any>('select count(*) n from app_private.customers')).rows[0].n,1,'reproduce old overwrite');
  const snapshot=async()=>(await db.query<any>('select id,customer_name,customer_phone,customer_address,total_amount,version,updated_at from app_private.sales_orders order by id')).rows;
  const before=await snapshot();const migration=readFileSync('src/data/demo-customer-identity.sql','utf8');
  await db.exec(migration);await db.exec(migration);
  const customers=(await db.query<any>('select * from app_private.customers order by name')).rows;
  assert.deepEqual(customers.map(c=>c.name).sort(),[...names].sort());assert.equal(new Set(customers.map(c=>c.id)).size,3);
  assert.deepEqual(await snapshot(),before);
  const linked=(await db.query<any>('select o.customer_name,c.name from app_private.sales_orders o join app_private.customers c on c.id=o.customer_id')).rows;
  assert.ok(linked.every(r=>r.customer_name===r.name));
  const an=customers.find(c=>c.name==='An');
  const same=await rpc({name:'An',phone:'0',customer_type:'retail',address:'Mới'});assert.equal(same.id,an.id);
  const next=await rpc({id:an.id,from_order:true,name:'Dũng',phone:'0',customer_type:'retail'});assert.notEqual(next.id,an.id);
  assert.equal((await db.query<any>('select name from app_private.customers where id=$1',[an.id])).rows[0].name,'An');
  await rpc({id:an.id,name:'An sửa',phone:'0',customer_type:'retail'});
  assert.equal((await db.query<any>('select name from app_private.customers where id=$1',[an.id])).rows[0].name,'An sửa');
  await db.exec(migration);
  assert.equal((await db.query<any>("select count(*) n from app_private.customers where name='An'")).rows[0].n,0,'recovery must not undo an intentional profile rename');
  const real=await rpc({name:'Có SĐT',phone:'0901234567',customer_type:'wholesale'});
  assert.equal((await rpc({name:'Có SĐT sửa',phone:'0901234567',customer_type:'wholesale'})).id,real.id);
  await assert.rejects(rpc({id:an.id,name:'Không ghi đè',phone:'0901234567',customer_type:'retail'}),/CUSTOMER_PHONE_EXISTS/);
  await db.query("update app_private.app_users set role='staff' where id=$1",[actor]);
  const staff=await rpc({name:'Nhân viên thêm',phone:'0',customer_type:'retail'});assert.ok(staff.id);
 }finally{await db.close();}
});
