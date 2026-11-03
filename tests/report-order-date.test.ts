import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {reportTotals} from '../src/lib/report-totals';
import {reportSheets} from '../src/lib/report-sheets';

test('report display and Excel include fees exactly once, including legacy APIs',()=>{
 for(const fields of [
  {revenue:'65000',product_revenue:'60000',other_charges:'5000'},
  {revenue:'60000',other_charges:'5000'},
 ]){
  const report:any={...fields,stock:0,inventory:[],order_count:8};
  assert.deepEqual(reportTotals(report),{products:60000n,fees:5000n,revenue:65000n});
  for(const costAccess of [true,false]){
   const rows=reportSheets(report,costAccess)[0].rows;
   assert.deepEqual(rows.find(r=>r[0]==='Doanh thu'),['Doanh thu',65000]);
   assert.deepEqual(rows.find(r=>r[0]==='Tổng giá trị gồm chi phí khác'),['Tổng giá trị gồm chi phí khác',65000]);
  }
 }
});

test('demo report: eight sold orders, future draft, business dates, payments and returns',async()=>{
 const db=new PGlite();const actor='10000000-0000-4000-8000-000000000001',staff='10000000-0000-4000-8000-000000000002';
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('app.user_id',true),'')::uuid$$;`);
  for(const file of ['supabase/migrations/001_shop.sql','supabase/migrations/003_glass_brands.sql',
   ...['partial-fulfillment','order-details','catalog-sales','shared-orders','order-line-position','shared-category-price','shared-operations','report-order-date','report-order-date'].map(n=>`src/data/demo-${n}.sql`)])await db.exec(readFileSync(file,'utf8'));
  for(const [id,role]of [[actor,'admin'],[staff,'staff']]){await db.query('insert into auth.users values($1)',[id]);await db.query('insert into app_private.app_users(id,display_name,role) values($1,$2,$3)',[id,role,role]);}
  await db.query("select set_config('app.user_id',$1,false)",[actor]);
  const rpc=async(fn:string,p:any)=>(await db.query<any>(`select public.${fn}($1::jsonb) r`,[JSON.stringify(p)])).rows[0].r;
  const write=(p:any)=>rpc('shop_write',{key:crypto.randomUUID(),...p});
  const read=(from='2040-10-22',to=from)=>rpc('shop_read',{action:'report',from,to});
  const product=await write({action:'product',sku:'REPORT-DATE',name:'Report',glass_type:'clear',brand:'Apple',models:[],sale_price:'10000',fixed_cost:'1000',active:true});
  await write({action:'inventory',type:'opening',reason:'test',items:[{product_id:product.id,quantity:30}]});
  const orders:any[]=[];
  for(let index=0;index<8;index++){
   const draft=await write({action:'save_draft',order_code:`REPORT-${index}`,ordered_at:`2040-10-22T${index===0?'00:00':'23:59'}:00+07:00`,extra_cost:index===2?'5000':'0',customer_name:'Synthetic',customer_phone:'0',items:[{product_id:product.id,quantity:1,item_kind:index<2?'sample':'sale'}]});
   if(index<2)await rpc('shop_order_features',{action:'save',order_id:draft.id,customer_type:'retail',items:[{product_id:product.id,item_kind:'sample'}]});
   const row=(await db.query<any>('select * from app_private.sales_orders where id=$1',[draft.id])).rows[0];
   await rpc('shop_partial_fulfillment',{action:'confirm_order',key:crypto.randomUUID(),id:draft.id,version:row.version,payment_method:'cash'});orders.push(draft);
  }
  const future=await write({action:'save_draft',order_code:'REPORT-FUTURE',ordered_at:'2040-10-23T00:00:00+07:00',extra_cost:'90000',customer_name:'Future draft',customer_phone:'0',items:[{product_id:product.id,quantity:1}]});
  let report=await read();assert.equal(report.order_count,8);assert.equal(report.revenue,'65000');assert.equal(report.product_revenue,'60000');assert.equal(report.cost,'8000');assert.equal(report.profit,'57000');assert.equal(report.sold,8);
  assert.equal((await read('2040-10-23')).revenue,'0');
  await rpc('shop_order_features',{action:'payment',order_id:orders[2].id,amount:'1000',method:'cash'});
  await rpc('shop_order_features',{action:'payment',order_id:orders[3].id,amount:'10000',method:'transfer'});
  assert.equal((await read()).revenue,'65000');
  const version=async(id:string)=>(await db.query<any>('select version from app_private.sales_orders where id=$1',[id])).rows[0].version;
  await rpc('shop_partial_fulfillment',{action:'confirm_order',key:crypto.randomUUID(),id:future.id,version:await version(future.id),payment_method:'cash'});
  assert.equal((await read()).revenue,'65000');assert.equal((await read('2040-10-23')).revenue,'100000');assert.equal((await read('2040-10-22','2040-10-23')).revenue,'165000');
  await write({action:'order_date',id:orders[3].id,version:await version(orders[3].id),ordered_at:'2040-10-23T00:00:00+07:00'});
  assert.equal((await read()).revenue,'55000');assert.equal((await read()).order_count,7);
  await db.query("select set_config('app.user_id',$1,false)",[staff]);report=await read();assert.equal(report.revenue,'55000');assert.ok(!('cost'in report)&&!('profit'in report));
  await db.query("select set_config('app.user_id',$1,false)",[actor]);
  const returnedOrder=orders[4];const item=(await db.query<any>('select id from app_private.sales_order_items where order_id=$1',[returnedOrder.id])).rows[0];
  await write({action:'return_order',id:returnedOrder.id,version:await version(returnedOrder.id),reason:'Synthetic return',refund_method:'cash',items:[{order_item_id:item.id,quantity:1,restock_quantity:1}]});
  assert.equal((await read()).revenue,'45000');
  await write({action:'cancel_order',id:orders[5].id,version:await version(orders[5].id),reason:'Synthetic cancel',refund_method:'cash'});
  assert.equal((await read()).revenue,'35000');assert.equal((await read()).order_count,6);
 }finally{await db.close();}
});
