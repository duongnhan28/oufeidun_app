import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

test('rename aliases preserve drafts/sold snapshots, imports, identities and reserved names',async()=>{
 const db=new PGlite(),actor='10000000-0000-4000-8000-000000000001';
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('app.user_id',true),'')::uuid$$;`);
  for(const f of ['supabase/migrations/001_shop.sql','supabase/migrations/003_glass_brands.sql',...['partial-fulfillment','excel-create-sku','product-import','order-details','catalog-sales','shared-orders','order-line-position','shared-category-price','shared-operations','edit-unused-codes','customer-identity','report-order-date','stock-adjustment','product-renames'].map(n=>`src/data/demo-${n}.sql`)])await db.exec(readFileSync(f,'utf8'));
  await db.query('insert into auth.users values($1)',[actor]);await db.query("insert into app_private.app_users(id,display_name,role) values($1,'Admin','admin')",[actor]);await db.query("select set_config('app.user_id',$1,false)",[actor]);
  const rpc=async(p:any,fn='shop_write')=>(await db.query<any>(`select public.${fn}($1::jsonb) r`,[JSON.stringify(p)])).rows[0].r;
  const write=(p:any)=>rpc({key:crypto.randomUUID(),...p});const ws=()=>rpc({},'shop_read');
  const fields={name:'RM13',glass_type:'clear',brand:'Apple',models:[],sale_price:'10000',fixed_cost:'1234',active:true};
  const p=await write({action:'product',...fields,sku:'RM13'});await write({action:'inventory',type:'opening',reason:'test',items:[{product_id:p.id,quantity:20}]});
  const draft=await write({action:'save_draft',order_code:'OLD-DRAFT',customer_name:'An',customer_phone:'0',items:[{product_id:p.id,quantity:2}]});
  const order=async(id:string)=>(await ws()).orders.find((o:any)=>o.id===id);
  const rename=async(sku:string)=>{const product=(await ws()).products.find((x:any)=>x.id===p.id);return write({action:'product',...fields,id:p.id,version:product.version,sku});};
  await rename('RM13 (REDMI13)');await rename('NEW-REDMI13');
  let product=(await ws()).products.find((x:any)=>x.id===p.id);assert.deepEqual(new Set(product.sku_aliases),new Set(['RM13','RM13 (REDMI13)']));assert.equal(product.on_hand,20);
  let o=await order(draft.id);assert.equal(o.items[0].sku_snapshot,'RM13');
  await write({action:'save_draft',id:o.id,version:o.version,order_code:'OLD-DRAFT',customer_name:'An',customer_phone:'0',items:[{product_id:p.id,quantity:7,selected_sku:'RM13 (REDMI13)'}]});
  o=await order(o.id);assert.equal(o.items[0].sku_snapshot,'RM13');assert.equal(o.items[0].quantity,7);
  await rpc({action:'confirm_order',key:crypto.randomUUID(),id:o.id,version:o.version,payment_method:'cash'},'shop_partial_fulfillment');
  await rename('LATEST-REDMI13');o=await order(o.id);assert.equal(o.items[0].sku_snapshot,'RM13');assert.equal(o.total_amount,'70000');
  await assert.rejects(write({action:'product',...fields,sku:'RM13'}),/SKU_ALIAS_CONFLICT/);
  const receipt={action:'inventory',key:crypto.randomUUID(),type:'receipt',reason:'old Excel',items:[{sku:'RM13 (REDMI13)',quantity:3,purchase_price:'1000'}]};await rpc(receipt);await rpc(receipt);
  product=(await ws()).products.find((x:any)=>x.id===p.id);assert.equal(product.on_hand,16);assert.equal(product.sku,'LATEST-REDMI13');assert.equal(product.fixed_cost,'1234');
  await assert.rejects(write({action:'inventory',type:'receipt',reason:'duplicate aliases',items:[{sku:'RM13',quantity:1,purchase_price:'1000'},{sku:'LATEST-REDMI13',quantity:1,purchase_price:'1000'}]}),/VALIDATION_ERROR/);
  const row={sku:'RM13',glass_type:'clear',brand:'Apple',models:[],sale_price:'10000',wholesale_price:'9000',fixed_cost:'1234',glass_brand:'',quantity:0};
  await write({action:'import_products',items:[row]});assert.equal((await ws()).products.filter((x:any)=>x.id===p.id).length,1);
  await assert.rejects(write({action:'import_products',items:[row,{...row,sku:'LATEST-REDMI13'}]}),/VALIDATION_ERROR/);
  await db.exec(readFileSync('src/data/demo-product-renames.sql','utf8'));assert.equal((await order(o.id)).items[0].sku_snapshot,'RM13');
 }finally{await db.close();}
});
