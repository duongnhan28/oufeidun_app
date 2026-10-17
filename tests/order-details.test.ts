import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {orderDateValue,vietnamDateInput} from '../src/lib/order-date';

test('manual Vietnam date validates calendar and roundtrips independent of host time zone',()=>{
 assert.equal(orderDateValue('2026-10-09T00:15'),'2026-10-09T00:15:00+07:00');
 assert.equal(vietnamDateInput('2026-10-08T17:15:00Z'),'2026-10-09T00:15');
 for(const value of ['2026-02-30T12:30','','2026-10-09T25:00','1999-01-01T12:00']) assert.throws(()=>orderDateValue(value));
 const {orderDate}=require('../server/src/order-details.cjs');
 assert.equal(orderDate('2026-10-09T00:15:00+07:00'),'2026-10-09 00:15:00');
 assert.throws(()=>orderDate('2026-02-30T12:30'));
});

test('order details migration: fees once, snapshots, date edits and retry safety',async()=>{
 const db=new PGlite();const actor='10000000-0000-4000-8000-000000000001';
 try {
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('app.user_id',true),'')::uuid$$;`);
 for(const file of ['supabase/migrations/001_shop.sql','supabase/migrations/003_glass_brands.sql','src/data/demo-partial-fulfillment.sql','src/data/demo-order-details.sql','src/data/demo-order-details.sql']) await db.exec(readFileSync(file,'utf8'));
 await db.query('insert into auth.users values($1)',[actor]);await db.query("insert into app_private.app_users(id,display_name,role) values($1,'Admin','admin')",[actor]);await db.query("select set_config('app.user_id',$1,false)",[actor]);
 const write=async(p:any,fn='shop_write')=>(await db.query<any>(`select public.${fn}($1::jsonb) r`,[JSON.stringify(p)])).rows[0].r;
 const p=await write({action:'product',key:crypto.randomUUID(),sku:'DETAIL',name:'Detail',glass_type:'clear',brand:'Apple',models:['iPhone 15','iPhone 16'],sale_price:'25000',fixed_cost:'10000',active:true});
 await write({action:'inventory',key:crypto.randomUUID(),type:'opening',reason:'test',items:[{product_id:p.id,quantity:3}]});
 const save={action:'save_draft',key:crypto.randomUUID(),order_code:'DETAIL-001',customer_name:'An',customer_phone:'123',note:'Giao buổi chiều',ordered_at:'2026-10-09T00:15:00+07:00',extra_cost:'5000',extra_cost_note:'In ấn',items:[{product_id:p.id,quantity:3,custom_name:null}]};
 const order=await write(save);await write(save);
 let row=(await db.query<any>('select * from app_private.sales_orders where id=$1',[order.id])).rows[0];assert.equal(String(row.total_amount),'80000');
 await write({action:'save',order_id:order.id,customer_type:'retail',items:[{product_id:p.id,item_kind:'sale',item_note:'Note dòng'}]},'shop_order_features');
 row=(await db.query<any>('select * from app_private.sales_orders where id=$1',[order.id])).rows[0];assert.equal(String(row.total_amount),'80000');
 const line=(await db.query<any>('select * from app_private.sales_order_items where order_id=$1',[order.id])).rows[0];
 await write({action:'confirm_order',key:crypto.randomUUID(),id:order.id,version:row.version,payment_method:'cash',deliveries:[{order_item_id:line.id,quantity:1}]},'shop_partial_fulfillment');
 row=(await db.query<any>('select * from app_private.sales_orders where id=$1',[order.id])).rows[0];assert.equal(String(row.total_amount),'30000');
 const delivery={action:'deliver_order',key:crypto.randomUUID(),id:order.id,version:row.version,items:[{order_item_id:line.id,quantity:2}],payment_amount:'0'};await write(delivery,'shop_partial_fulfillment');await write(delivery,'shop_partial_fulfillment');
 row=(await db.query<any>('select * from app_private.sales_orders where id=$1',[order.id])).rows[0];assert.equal(String(row.total_amount),'80000');
 const confirmedAt=row.confirmed_at;
 const date={action:'order_date',key:crypto.randomUUID(),id:order.id,version:row.version,ordered_at:'2026-10-08T20:30:00+07:00'};await write(date);await write(date);
 await assert.rejects(write({...date,key:crypto.randomUUID()}),/VERSION_CONFLICT/);
 row=(await db.query<any>('select * from app_private.sales_orders where id=$1',[order.id])).rows[0];assert.equal(String(row.total_amount),'80000');assert.deepEqual(row.confirmed_at,confirmedAt);
 await db.query("update app_private.products set models=array['Changed'] where id=$1",[p.id]);
 const extras=(await db.query<any>('select public.shop_order_extras() r')).rows[0].r[0];assert.equal(extras.extra_cost,'5000');assert.deepEqual(extras.items[0].models_snapshot,['iPhone 15','iPhone 16']);
 await assert.rejects(write({...save,key:crypto.randomUUID(),order_code:'BAD',extra_cost:'-1'}),/VALIDATION/);
 } finally {await db.close();}
});
