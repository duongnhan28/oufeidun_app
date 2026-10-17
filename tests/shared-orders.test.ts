import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
test('shared order reads include other creators, fees and payments while foreign writes and costs remain blocked',async()=>{
 const db=new PGlite();const admin='10000000-0000-4000-8000-000000000001',staff='10000000-0000-4000-8000-000000000002',other='10000000-0000-4000-8000-000000000003';
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('app.user_id',true),'')::uuid$$;`);
 for(const file of ['supabase/migrations/001_shop.sql','supabase/migrations/003_glass_brands.sql','src/data/demo-partial-fulfillment.sql','src/data/demo-product-import.sql','src/data/demo-order-details.sql','src/data/demo-catalog-sales.sql','src/data/demo-shared-orders.sql','src/data/demo-shared-orders.sql'])await db.exec(readFileSync(file,'utf8'));
 for(const [id,role] of [[admin,'admin'],[staff,'staff'],[other,'staff']]){await db.query('insert into auth.users values($1)',[id]);await db.query('insert into app_private.app_users(id,display_name,role) values($1,$2,$3)',[id,role,role]);}
 const rpc=async(who:string,fn:string,payload?:any)=>{await db.query("select set_config('app.user_id',$1,false)",[who]);return (await db.query<any>(`select public.${fn}(${payload===undefined?'':'$1::jsonb'}) r`,payload===undefined?[]:[JSON.stringify(payload)])).rows[0].r;};
 const write=(who:string,p:any)=>rpc(who,'shop_write',{key:crypto.randomUUID(),...p});
 const product=await write(admin,{action:'product',sku:'SHARED',name:'SHARED',glass_type:'clear',brand:'Apple',models:[],sale_price:'10000',fixed_cost:'3000',active:true});
 await write(admin,{action:'inventory',type:'opening',reason:'test',items:[{product_id:product.id,quantity:10}]});
 const draft=(who:string,code:string)=>write(who,{action:'save_draft',order_code:code,customer_name:code,customer_phone:'123',note:'Ghi chú chung',extra_cost:'5000',sale_details:{customer_type:'retail',customer_address:'HCM',sales_user_id:who,fulfillment_status:'complete',missing_summary:''},items:[{product_id:product.id,quantity:1,item_kind:'sale'}]});
 const a=await draft(admin,'ADMIN-DRAFT'),sold=await draft(admin,'ADMIN-SOLD'),s=await draft(staff,'STAFF-DRAFT'),o=await draft(other,'OTHER-DRAFT'),deleted=await draft(admin,'DELETED');
 const version=async(id:string)=>(await db.query<any>('select version from app_private.sales_orders where id=$1',[id])).rows[0].version;
 await write(admin,{action:'delete_draft',id:deleted.id,version:await version(deleted.id)});
 await rpc(admin,'shop_partial_fulfillment',{action:'confirm_order',key:crypto.randomUUID(),id:sold.id,version:await version(sold.id),payment_method:'cash'});
 await rpc(admin,'shop_order_features',{action:'payment',order_id:sold.id,amount:'5000',method:'cash',note:'Thu chung'});
 const workspace=await rpc(staff,'shop_read',{});assert.deepEqual(new Set(workspace.orders.map((row:any)=>row.id)),new Set([a.id,sold.id,s.id,o.id]));assert.deepEqual(workspace.users,[]);assert.deepEqual(workspace.logs,[]);assert.doesNotMatch(JSON.stringify(workspace),/fixed_cost|unit_cost_snapshot|password_hash/);
 const extras=await rpc(staff,'shop_order_extras');const sale=extras.find((row:any)=>row.order_id===sold.id);assert.equal(sale.extra_cost,'5000');assert.equal(sale.customer_address,'HCM');assert.equal(sale.paid_amount,'5000');assert.equal(sale.deliveries.length,1);
 const business=await rpc(staff,'shop_business_extras');assert.ok(business.orders.some((row:any)=>row.id===a.id));
 for(const action of ['delete_draft','confirm_order','order_date','save_draft']){const fields=action==='order_date'?{ordered_at:'2026-10-15T12:00:00+07:00'}:action==='save_draft'?{order_code:'ADMIN-DRAFT',items:[{product_id:product.id,quantity:1}]}:action==='confirm_order'?{payment_method:'cash'}:{};await assert.rejects(write(staff,{action,id:a.id,version:await version(a.id),...fields}),/FORBIDDEN/);}
 await assert.rejects(rpc(staff,'shop_order_features',{action:'payment',order_id:sold.id,amount:'1',method:'cash'}),/FORBIDDEN/);
 await assert.rejects(rpc(staff,'shop_read',{action:'report',from:'2026-10-01',to:'2026-10-31'}),/FORBIDDEN/);
 assert.ok((await rpc(admin,'shop_read',{})).orders.some((row:any)=>row.id===s.id));
 await write(staff,{action:'delete_draft',id:s.id,version:await version(s.id)});
 }finally{await db.close();}
});
