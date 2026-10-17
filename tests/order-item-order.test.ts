import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {orderItemsForDisplay} from '../src/lib/order-item-order';
import {allocateDelivery,availableForLine} from '../src/lib/catalog';

test('sale selection order pairs gifts and puts samples last without mutating prices or stock allocation',()=>{
 const products:any=[{id:'p',sku:'IP 12',on_hand:5},{id:'a',sku:'AAA',on_hand:2}];
 const rows:any=[{id:'sample',product_id:'p',item_kind:'sample',quantity:1,delivered_quantity:0,unit_sale_price:'0'},
  {id:'gift',product_id:'p',item_kind:'gift',quantity:2,delivered_quantity:1,unit_sale_price:'0'},
  {id:'sale',product_id:'p',item_kind:'sale',quantity:4,delivered_quantity:1,unit_sale_price:'25000'},
  {id:'a',product_id:'a',item_kind:'sale',quantity:1,unit_sale_price:'10000'}];
 const before=structuredClone(rows),allocation=allocateDelivery(rows,products),available=rows.map((row:any)=>availableForLine(rows,row,5));
 const displayed=orderItemsForDisplay(rows,products);
 assert.deepEqual(displayed,[rows[2],rows[1],rows[3],rows[0]]);assert.notEqual(displayed,rows);for(const item of displayed)assert.ok(rows.includes(item));
 assert.deepEqual(rows,before);assert.deepEqual(allocateDelivery(rows,products),allocation);assert.deepEqual(rows.map((row:any)=>availableForLine(rows,row,5)),available);
 assert.equal(displayed.reduce((total,row)=>total+row.quantity*Number(row.unit_sale_price),0),110000);
 assert.deepEqual(orderItemsForDisplay([]),[]);
 const legacy=[{sku:'Z',kind:'gift'},{sku:'IP 12'},{sku_snapshot:null},{sku:'IP 2',kind:'sample'}];assert.deepEqual(orderItemsForDisplay(legacy),[legacy[1],legacy[2],legacy[0],legacy[3]]);
});

test('orphan gifts follow sale groups; samples are last even when sold, with stable order and no SKU sorting',()=>{
 const rows=[{sku:'SAMPLE-ONLY',kind:'sample'},{sku:'A55',kind:'gift'},{sku:'IP15',kind:'gift'},{sku:'IP15',kind:'sale'},{sku:'IP12',kind:'sample'},{sku:'IP12',kind:'sale'},{sku:'IP12',kind:'gift'},{sku:'NO-SALE',kind:'gift'}];
 const expected=[rows[3],rows[2],rows[5],rows[6],rows[1],rows[7],rows[0],rows[4]];
 assert.deepEqual(orderItemsForDisplay(rows),expected);assert.deepEqual(orderItemsForDisplay(expected),expected);
 assert.deepEqual(orderItemsForDisplay(rows.filter(row=>row.kind!=='sale')),[rows[1],rows[2],rows[6],rows[7],rows[0],rows[4]]);
 const legacy=[{sku_snapshot:' ip 12 ',item_kind:'gift'},{sku_snapshot:'IP 12',item_kind:'sale'}];assert.deepEqual(orderItemsForDisplay(legacy),[legacy[1],legacy[0]]);
});

test('product IDs control gift pairing; anonymous gifts and repeated sales never duplicate or lose lines',()=>{
 const rows=[{product_id:'a',sku:'SAME',item_kind:'gift'},{product_id:'b',sku:'SAME',item_kind:'sale'},{item_kind:'gift'},{product_id:'a',item_kind:'sale'},{product_id:'a',item_kind:'sale'},{product_id:'a',item_kind:'gift'},{item_kind:'sample'}];
 const expected=[rows[1],rows[3],rows[0],rows[5],rows[4],rows[2],rows[6]];
 assert.deepEqual(orderItemsForDisplay(rows),expected);assert.equal(new Set(orderItemsForDisplay(rows)).size,rows.length);
 assert.deepEqual(orderItemsForDisplay([{sku:'ZERO',unit_sale_price:'0'}]),[{sku:'ZERO',unit_sale_price:'0'}]);
});

test('PostgreSQL saved positions survive retries, edits and migration reruns without changing legacy data',async()=>{
 const db=new PGlite(),actor='10000000-0000-4000-8000-000000000001';
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('app.user_id',true),'')::uuid$$;`);
 for(const file of ['supabase/migrations/001_shop.sql','supabase/migrations/003_glass_brands.sql','src/data/demo-partial-fulfillment.sql','src/data/demo-product-import.sql','src/data/demo-order-details.sql','src/data/demo-catalog-sales.sql','src/data/demo-shared-orders.sql'])await db.exec(readFileSync(file,'utf8'));
 await db.query('insert into auth.users values($1)',[actor]);await db.query("insert into app_private.app_users(id,display_name,role) values($1,'Admin','admin')",[actor]);await db.query("select set_config('app.user_id',$1,false)",[actor]);
 const write=async(p:any)=>(await db.query<any>('select public.shop_write($1::jsonb) r',[JSON.stringify(p)])).rows[0].r;
 const products=[];for(const sku of ['Z-LAST','A-FIRST','M-MIDDLE'])products.push(await write({action:'product',key:crypto.randomUUID(),sku,name:sku,glass_type:'clear',brand:'Apple',models:[],sale_price:'10000',fixed_cost:'5000',active:true}));
 const input=[{product_id:products[0].id,quantity:2,item_kind:'sale'},{product_id:products[2].id,quantity:1,item_kind:'sample'},{product_id:products[1].id,quantity:1,item_kind:'sale'},{product_id:products[0].id,quantity:1,item_kind:'gift'}];
 const payload={action:'save_draft',key:crypto.randomUUID(),order_code:'SELECT-ORDER',customer_name:'Khách',customer_phone:'123',sale_details:{customer_type:'retail',sales_user_id:actor,fulfillment_status:'complete',missing_summary:''},items:input};
 const legacy=await write({...payload,order_code:'LEGACY'});
 const read=async(id:string)=>((await db.query<any>("select public.shop_read('{}'::jsonb) r")).rows[0].r.orders as any[]).find(row=>row.id===id);
 const legacyBefore=await read(legacy.id);
 const migration=readFileSync('src/data/demo-order-line-position.sql','utf8');await db.exec(migration);await db.exec(migration);
 assert.deepEqual(await read(legacy.id),legacyBefore,'Migration must not rewrite historical business values or IDs');
 const saved=await write({...payload,key:crypto.randomUUID()});const view=await read(saved.id);
 const expected=async(items:any[])=>{const all=(await db.query<any>('select id,product_id,item_kind from app_private.sales_order_items where order_id=$1',[saved.id])).rows;return items.map(item=>all.find(row=>row.product_id===item.product_id&&row.item_kind===item.item_kind).id);};
 assert.deepEqual(view.items.map((row:any)=>row.id),await expected(input));
 const changed=[input[0],input[3],input[1],input[2]],edit={...payload,key:crypto.randomUUID(),id:saved.id,version:view.version,items:changed};await write(edit);const once=await read(saved.id);await write(edit);assert.deepEqual(await read(saved.id),once);
 assert.deepEqual(once.items.map((row:any)=>row.id),await expected(changed));assert.equal(once.total_amount,'30000');
 await db.exec(migration);assert.deepEqual(await read(saved.id),once);
 await assert.rejects(write({...edit,key:crypto.randomUUID()}),/VERSION_CONFLICT/);assert.deepEqual(await read(saved.id),once);
 }finally{await db.close();}
});
