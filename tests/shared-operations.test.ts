import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {reportSheets} from '../src/lib/report-sheets';

test('shared operations: staff edits and confirms foreign orders, preserves costs, cannot receive stock or read costs',async()=>{
 const db=new PGlite();
 const admin='10000000-0000-4000-8000-000000000001',staff='10000000-0000-4000-8000-000000000002';
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('app.user_id',true),'')::uuid$$;`);
  for(const f of ['supabase/migrations/001_shop.sql','supabase/migrations/003_glass_brands.sql','src/data/demo-partial-fulfillment.sql','src/data/demo-excel-create-sku.sql','src/data/demo-product-import.sql','src/data/demo-order-details.sql','src/data/demo-catalog-sales.sql','src/data/demo-shared-orders.sql','src/data/demo-order-line-position.sql','src/data/demo-shared-category-price.sql','src/data/demo-shared-operations.sql','src/data/demo-shared-operations.sql'])await db.exec(readFileSync(f,'utf8'));
  for(const [id,role]of [[admin,'admin'],[staff,'staff']]){await db.query('insert into auth.users values($1)',[id]);await db.query('insert into app_private.app_users(id,display_name,role) values($1,$2,$3)',[id,role,role]);}
  const rpc=async(who:string,fn:string,p:any={})=>{await db.query("select set_config('app.user_id',$1,false)",[who]);return(await db.query<any>(`select public.${fn}($1::jsonb) r`,[JSON.stringify(p)])).rows[0].r;};
  const write=(who:string,p:any)=>rpc(who,'shop_write',{key:crypto.randomUUID(),...p});
  const fields={sku:'PARITY',name:'PARITY',glass_type:'clear',brand:'Apple',models:[],sale_price:'10000',wholesale_price:'9000',active:true};
  const product=await write(admin,{action:'product',...fields,fixed_cost:'3217'});
  await write(admin,{action:'inventory',type:'opening',reason:'test',items:[{product_id:product.id,quantity:10}]});
  let ws=await rpc(staff,'shop_read');assert.equal(ws.users.length,2);assert.equal(ws.me.role,'staff');
  const current=ws.products.find((p:any)=>p.id===product.id);
  await write(staff,{action:'product',...fields,id:product.id,version:current.version,sale_price:'12000'});
  const cost=async()=> (await db.query<any>('select fixed_cost::text cost from app_private.product_costs where product_id=$1',[product.id])).rows[0].cost;
  assert.equal(await cost(),'3217');
  await assert.rejects(write(staff,{action:'product',...fields,fixed_cost:'0'}),/COST_ACCESS_DENIED/);
  const created=await write(staff,{action:'product',...fields,sku:'STAFF-NEW'});assert.ok(created.id);
  for(const type of ['receipt','opening'])await assert.rejects(write(staff,{action:'inventory',type,reason:'bypass',items:[{product_id:product.id,quantity:1}]}),/FORBIDDEN/);
  await assert.rejects(write(staff,{action:'import_products',items:[]}),/FORBIDDEN/);
  await rpc(staff,'shop_bulk_price',{glass_type:'clear',price_field:'sale_price',unit_price:'15000'});assert.equal(await cost(),'3217');
  await rpc(staff,'shop_bulk_price',{glass_type:'clear',sale_price:'16000',wholesale_price:'14000'});assert.equal(await cost(),'3217');
  const order=await write(admin,{action:'save_draft',order_code:'ADMIN-PARITY',customer_name:'Khach',customer_phone:'123',items:[{product_id:product.id,quantity:2}]});
  const version=async()=> (await db.query<any>('select version from app_private.sales_orders where id=$1',[order.id])).rows[0].version;
  await write(staff,{action:'save_draft',id:order.id,version:await version(),order_code:'ADMIN-PARITY',customer_name:'Edited',customer_phone:'123',items:[{product_id:product.id,quantity:2}]});
  const confirm={action:'confirm_order',key:crypto.randomUUID(),id:order.id,version:await version(),payment_method:'cash'};
  await rpc(staff,'shop_partial_fulfillment',confirm);await rpc(staff,'shop_partial_fulfillment',confirm);
  await rpc(staff,'shop_order_features',{action:'payment',order_id:order.id,amount:'1000',method:'cash'});
  ws=await rpc(staff,'shop_read');assert.equal(ws.products.find((p:any)=>p.id===product.id).on_hand,8);
  assert.doesNotMatch(JSON.stringify(ws),/fixed_cost|unit_cost|3217|password_hash/);
  const report=await rpc(staff,'shop_read',{action:'report',from:'2026-01-01',to:'2026-12-31'});
  assert.doesNotMatch(JSON.stringify(report),/"cost"|"profit"|stock_value|3217/);
  assert.ok('revenue' in report);assert.ok('cost' in await rpc(admin,'shop_read',{action:'report',from:'2026-01-01',to:'2026-12-31'}));
 }finally{await db.close();}
});

test('staff report Excel excludes cost and inferred profit even with an unfiltered input',()=>{
 const r:any={revenue:'20000',cost:'7654321',profit:'8765432',stock_value:'9876543',stock:2,order_count:1,other_charges:'0',order_value:'20000',sales:[{sku:'SKU',unit_cost:'7654321',unit_sale_price:'10000',quantity:2,total_cost:'7654321',revenue:'20000',profit:'8765432'}],inventory:[],movements:[]};
 const sheets=JSON.stringify(reportSheets(r,false));assert.doesNotMatch(sheets,/7654321|8765432|9876543|Giá vốn|Lãi gộp/);assert.match(sheets,/20000/);
});
