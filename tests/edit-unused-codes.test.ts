import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

test('unsold SKU can be renamed after receipts and drafts; deleted draft code can be reused without changing history',async()=>{
 const db=new PGlite(),admin='10000000-0000-4000-8000-000000000001',staff='10000000-0000-4000-8000-000000000002';
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('app.user_id',true),'')::uuid$$;`);
 for(const file of ['supabase/migrations/001_shop.sql','supabase/migrations/003_glass_brands.sql','src/data/demo-partial-fulfillment.sql','src/data/demo-excel-create-sku.sql','src/data/demo-product-import.sql','src/data/demo-order-details.sql','src/data/demo-catalog-sales.sql','src/data/demo-shared-orders.sql','src/data/demo-order-line-position.sql','src/data/demo-shared-category-price.sql','src/data/demo-shared-operations.sql'])await db.exec(readFileSync(file,'utf8'));
 for(const [id,role]of [[admin,'admin'],[staff,'staff']]){await db.query('insert into auth.users values($1)',[id]);await db.query('insert into app_private.app_users(id,display_name,role) values($1,$2,$2)',[id,role]);}
 const rpc=async(who:string,fn:string,p:any={})=>{await db.query("select set_config('app.user_id',$1,false)",[who]);return(await db.query<any>(`select public.${fn}($1::jsonb) r`,[JSON.stringify(p)])).rows[0].r;};
 const write=(who:string,p:any)=>rpc(who,'shop_write',{key:crypto.randomUUID(),...p});
 const fields={sku:'OLD-CODE',name:'OLD-CODE',glass_type:'clear',models:[],brand:'Apple',sale_price:'7000',wholesale_price:'6500',fixed_cost:'4651',active:true};
 const product=await write(admin,{action:'product',...fields});
 await write(admin,{action:'inventory',type:'opening',reason:'opening',items:[{product_id:product.id,quantity:10}]});
 await write(admin,{action:'inventory',type:'receipt',reason:'receipt',items:[{product_id:product.id,quantity:3,purchase_price:'4800'}]});
 const draftFields={action:'save_draft',order_code:'894',customer_name:'Customer',customer_phone:'0',items:[{product_id:product.id,quantity:2}]};
 const draft=await write(admin,draftFields);
 const ws=(who=admin)=>rpc(who,'shop_read');
 const order=async(id:string)=>(await ws()).orders.find((o:any)=>o.id===id);
 await write(admin,{action:'delete_draft',id:draft.id,version:(await order(draft.id)).version});
 const before=(await db.query<any>('select row_to_json(o) r from app_private.sales_orders o where id=$1',[draft.id])).rows[0].r;
 const migration=readFileSync('src/data/demo-edit-unused-codes.sql','utf8');await db.exec(migration);await db.exec(migration);
 assert.deepEqual((await db.query<any>('select row_to_json(o) r from app_private.sales_orders o where id=$1',[draft.id])).rows[0].r,before);
 let p=(await ws()).products.find((p:any)=>p.id===product.id);
 await write(staff,{...fields,fixed_cost:undefined,action:'product',id:p.id,version:p.version,sku:'NEW-CODE'});
 const reused=await write(staff,draftFields);assert.notEqual(reused.id,draft.id);
 await assert.rejects(write(admin,draftFields),/unique|duplicate/i);
 p=(await ws()).products.find((p:any)=>p.id===product.id);
 await write(admin,{...fields,action:'product',id:p.id,version:p.version,sku:'WITH-LIVE-DRAFT'});
 const commands={action:'confirm_order',key:crypto.randomUUID(),id:reused.id,version:(await order(reused.id)).version,payment_method:'cash'};
 await rpc(staff,'shop_partial_fulfillment',commands);await rpc(staff,'shop_partial_fulfillment',commands);
 p=(await ws()).products.find((p:any)=>p.id===product.id);assert.equal(p.on_hand,11);assert.equal(p.fixed_cost,'4651');
 assert.equal((await order(reused.id)).items[0].sku_snapshot,'WITH-LIVE-DRAFT');
 await assert.rejects(write(admin,{...fields,id:p.id,version:p.version,action:'product',sku:'SOLD-CANNOT-RENAME'}),/SKU_IMMUTABLE/);
 const snapshots=await db.query<any>('select sku_snapshot from app_private.inventory_document_items where product_id=$1',[p.id]);assert.ok(snapshots.rows.every(i=>i.sku_snapshot==='OLD-CODE'));
 await write(staff,{action:'cancel_order',id:reused.id,reason:'test',refund_method:'cash'});
 await assert.rejects(write(admin,draftFields),/unique|duplicate/i);
 p=(await ws()).products.find((p:any)=>p.id===product.id);await assert.rejects(write(admin,{...fields,id:p.id,version:p.version,action:'product',sku:'CANCELLED-CANNOT-RENAME'}),/SKU_IMMUTABLE/);
 const other=await write(staff,{...draftFields,order_code:'Case-Code'});assert.ok(other.id);await assert.rejects(write(admin,{...draftFields,order_code:'case-code'}),/unique|duplicate/i);
 }finally{await db.close();}
});
