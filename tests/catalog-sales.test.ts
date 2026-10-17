import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {categoryKey,availableForLine,reservedQuantity,matchingCustomers,productUnit,quantitySummary,searchCategoryLabels} from '../src/lib/catalog';
test('glass and accessory units remain distinct in mixed totals; premium matte is hidden only from search',()=>{
 assert.equal(productUnit({glass_type:'other'}),'sản phẩm');for(const glass_type of ['clear','full_border','privacy','matte','premium_borderless'])assert.equal(productUnit({glass_type}),'tấm');
 assert.equal(quantitySummary([{quantity:10,unit:'tấm'},{quantity:2,unit:'sản phẩm'},{quantity:1,unit:'tấm'}]),'11 tấm · 2 sản phẩm');assert.equal(quantitySummary([]),'0 tấm');assert.equal(searchCategoryLabels.matte,undefined);
});
test('legacy full-border categories match and mixed sale/gift stock is shared',()=>{
 assert.equal(categoryKey('full_border'),categoryKey('clear'));
 const items:any=[{product_id:'p',quantity:4,item_kind:'sale'},{product_id:'p',quantity:2,item_kind:'gift'}];
 assert.equal(reservedQuantity(items,'p'),6);assert.equal(availableForLine(items,items[1],5),1);
});
test('customer suggestions handle large lists, accents, formatted phones, inactive and empty results',()=>{
 const customers:any=Array.from({length:200},(_,i)=>({id:String(i),name:`Nguyễn Khách ${i}`,phone:`090 ${String(i).padStart(7,'0')}`,active:true}));
 assert.equal(matchingCustomers(customers,'').length,3);assert.equal(matchingCustomers(customers,'nguyen').length,3);assert.equal(matchingCustomers(customers,'nguyen khach 199')[0].id,'199');assert.equal(matchingCustomers(customers,'0900000199')[0].id,'199');assert.equal(matchingCustomers(customers,'không tồn tại').length,0);customers[199].active=false;assert.equal(matchingCustomers(customers,'0900000199').length,0);
});
test('atomic draft keeps sale/gift/sample, persists wholesale, rolls back invalid Sales and prevents overselling',async()=>{
 const db=new PGlite(),actor='10000000-0000-4000-8000-000000000001';
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('app.user_id',true),'')::uuid$$;`);
 for(const file of ['supabase/migrations/001_shop.sql','supabase/migrations/003_glass_brands.sql','src/data/demo-partial-fulfillment.sql','src/data/demo-product-import.sql','src/data/demo-order-details.sql','src/data/demo-catalog-sales.sql','src/data/demo-catalog-sales.sql'])await db.exec(readFileSync(file,'utf8'));
 await db.query('insert into auth.users values($1)',[actor]);await db.query("insert into app_private.app_users(id,display_name,role) values($1,'Admin','admin')",[actor]);await db.query("select set_config('app.user_id',$1,false)",[actor]);
 const write=async(payload:any,fn='shop_write')=>(await db.query<any>(`select public.${fn}($1::jsonb) r`,[JSON.stringify(payload)])).rows[0].r;
 const p=await write({action:'product',key:crypto.randomUUID(),sku:'MIXED',name:'MIXED',glass_type:'clear',brand:'Apple',models:[],sale_price:'25000',wholesale_price:'22000',fixed_cost:'10000',active:true});
 await write({product_id:p.id,wholesale_price:'20000'},'shop_set_wholesale_price');
 const details={customer_id:null,customer_type:'wholesale',customer_address:'abc',sales_user_id:actor,fulfillment_status:'complete',missing_summary:''};
 const payload={action:'save_draft',key:crypto.randomUUID(),order_code:'MIXED-1',customer_name:'An',customer_phone:'123',note:'optional',sale_details:details,items:[{product_id:p.id,quantity:10,custom_name:null,item_kind:'sale',unit_sale_price:'19000',price_overridden:true,save_customer_price:true},{product_id:p.id,quantity:1,custom_name:null,item_kind:'gift'},{product_id:p.id,quantity:1,custom_name:null,item_kind:'sample'}]};
 const o=await write(payload);await write(payload);
 const row=(await db.query<any>('select * from app_private.sales_orders where id=$1',[o.id])).rows[0];assert.equal(String(row.total_amount),'190000');
 const lines=(await db.query<any>('select * from app_private.sales_order_items where order_id=$1 order by item_kind',[o.id])).rows;
 assert.equal(lines.length,3);assert.equal(String(lines.find((i:any)=>i.item_kind==='gift').unit_sale_price),'0');
 assert.equal(String((await db.query<any>('select unit_price from app_private.customer_product_prices')).rows[0].unit_price),'19000');
 await assert.rejects(write({...payload,key:crypto.randomUUID(),order_code:'BAD',sale_details:{...details,sales_user_id:'10000000-0000-4000-8000-000000000099'}}),/INVALID_SALES/);
 assert.equal((await db.query<any>("select count(*) n from app_private.sales_orders where order_code='BAD'")).rows[0].n,0);
 await write({action:'inventory',key:crypto.randomUUID(),type:'opening',reason:'test',items:[{product_id:p.id,quantity:11}]});
 const confirm={action:'confirm_order',key:crypto.randomUUID(),id:o.id,version:row.version,payment_method:'cash',deliveries:lines.map((i:any)=>({order_item_id:i.id,quantity:i.quantity}))};
 await assert.rejects(write(confirm,'shop_partial_fulfillment'),/INSUFFICIENT_STOCK/);
 assert.equal((await db.query<any>('select on_hand from app_private.inventory_balances where product_id=$1',[p.id])).rows[0].on_hand,11);
 await write({action:'inventory',key:crypto.randomUUID(),type:'receipt',reason:'test',items:[{product_id:p.id,quantity:1,purchase_price:'10000'}]});
 await write(confirm,'shop_partial_fulfillment');await write(confirm,'shop_partial_fulfillment');
 assert.equal((await db.query<any>('select on_hand from app_private.inventory_balances where product_id=$1',[p.id])).rows[0].on_hand,0);
 }finally{await db.close();}
});
