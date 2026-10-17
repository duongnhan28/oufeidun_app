import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

for (const target of ['demo','supabase']) test(`${target}: shared category price preserves tiers, costs, customers, history and permissions`,async()=>{
 const db=new PGlite(),admin='10000000-0000-4000-8000-000000000001',staff='10000000-0000-4000-8000-000000000002';
 const schema=target==='demo'?'app_private':'app_ban_hang',prefix=target==='demo'?'shop_':'app_ban_hang_';
 try {
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('app.user_id',true),'')::uuid$$;`);
  for(const file of ['supabase/migrations/001_shop.sql','supabase/migrations/003_glass_brands.sql','src/data/demo-partial-fulfillment.sql','src/data/demo-product-import.sql','src/data/demo-order-details.sql','src/data/demo-catalog-sales.sql']) {
   let sql=readFileSync(file,'utf8');if(target==='supabase')sql=sql.replaceAll('app_private',schema).replaceAll('shop_',prefix);await db.exec(sql);
  }
  for(const [id,role] of [[admin,'admin'],[staff,'staff']]){await db.query('insert into auth.users values($1)',[id]);await db.query(`insert into ${schema}.app_users(id,display_name,role) values($1,$2,$2)`,[id,role]);}
  await db.query("select set_config('app.user_id',$1,false)",[admin]);
  const rpc=async(fn:string,p:any)=>(await db.query<any>(`select public.${prefix}${fn}($1::jsonb) r`,[JSON.stringify(p)])).rows[0].r;
  const write=(p:any)=>rpc('write',{key:crypto.randomUUID(),...p});
  const products=[];
  for(const [sku,type,active] of [['A','clear',true],['B','full_border',true],['CNT','privacy',true],['OFF','clear',false]])products.push(await write({action:'product',sku,name:sku,glass_type:type,brand:'Apple',models:[],sale_price:'9000',wholesale_price:'8000',fixed_cost:'3000',active}));
  await write({action:'inventory',type:'opening',reason:'test',items:[{product_id:products[0].id,quantity:5}]});
  const draft=await write({action:'save_draft',order_code:'OLD',customer_name:'Khách',customer_phone:'123',sale_details:{customer_type:'wholesale',sales_user_id:admin},items:[{product_id:products[0].id,quantity:1,item_kind:'sale',unit_sale_price:'7000',price_overridden:true,save_customer_price:true}]});
  const version=(await db.query<any>(`select version from ${schema}.sales_orders where id=$1`,[draft.id])).rows[0].version;
  await rpc('partial_fulfillment',{action:'confirm_order',key:crypto.randomUUID(),id:draft.id,version,payment_method:'cash'});
  const snapshot=async()=>(await db.query<any>(`select row_to_json(i) r from ${schema}.sales_order_items i where order_id=$1`,[draft.id])).rows;
  const before=await snapshot();
  const migration=readFileSync(target==='demo'?'src/data/demo-shared-category-price.sql':'supabase/migrations/034_shared_category_price.sql','utf8');await db.exec(migration);await db.exec(migration);
  const price={glass_type:'clear',price_field:'sale_price',unit_price:'15000'};
  assert.equal((await rpc('bulk_price',price)).updated,2);
  const readProducts=async()=>(await db.query<any>(`select p.*,c.fixed_cost from ${schema}.products p join ${schema}.product_costs c on c.product_id=p.id order by sku`)).rows;
  const changed=await readProducts();
  for(const row of changed){assert.equal(String(row.sale_price),['A','B'].includes(row.sku)?'15000':'9000');assert.equal(String(row.wholesale_price),'8000');assert.equal(String(row.fixed_cost),'3000');}
  const versions=changed.map(row=>row.price_version);await rpc('bulk_price',price);assert.deepEqual((await readProducts()).map(row=>row.price_version),versions);
  await rpc('bulk_price',{glass_type:'full_border',price_field:'wholesale_price',unit_price:'12000'});
  const after=await readProducts();assert.equal(String(after.find(p=>p.sku==='A').sale_price),'15000');assert.equal(String(after.find(p=>p.sku==='B').wholesale_price),'12000');
  assert.deepEqual(await snapshot(),before);assert.equal(String((await db.query<any>(`select unit_price from ${schema}.customer_product_prices`)).rows[0].unit_price),'7000');
  for(const bad of [{...price,price_field:'fixed_cost'},{...price,glass_type:'invalid'},{...price,unit_price:'-1'},{...price,unit_price:'1.5'},{...price,unit_price:'1000000000000000'}])await assert.rejects(rpc('bulk_price',bad),/VALIDATION_ERROR/);
  await db.query("select set_config('app.user_id',$1,false)",[staff]);await assert.rejects(rpc('bulk_price',price),/FORBIDDEN/);
  await db.query("select set_config('app.user_id',$1,false)",[admin]);
  await rpc('bulk_price',{glass_type:'privacy',sale_price:'11000',wholesale_price:'10000',fixed_cost:'4000'});
  assert.equal(String((await readProducts()).find(p=>p.sku==='CNT').fixed_cost),'4000');
 } finally {await db.close();}
});
