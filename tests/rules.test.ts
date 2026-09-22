import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
test('Postgres grants, defaults, immutable order names and time-based report reversals',async t=>{
 const db=new PGlite();const admin=crypto.randomUUID(),staff=crypto.randomUUID();
 async function call(who:string,payload:Record<string,unknown>,read=false):Promise<any>{await db.query("select set_config('app.user_id',$1,false)",[who]);const r=await db.query<{r:any}>(`select public.${read?'shop_read':'shop_write'}($1::jsonb) r`,[JSON.stringify(read?payload:{key:crypto.randomUUID(),...payload})]);return r.rows[0].r;}
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('app.user_id',true),'')::uuid$$;`);
  await db.exec(readFileSync('supabase/migrations/001_shop.sql','utf8'));
  for(const [id,role]of[[admin,'admin'],[staff,'staff']]){await db.query('insert into auth.users values($1)',[id]);await db.query('insert into app_private.app_users(id,display_name,role) values($1,$2,$3)',[id,role,role]);}
  await t.test('direct private-table reads and anonymous RPC are denied',async()=>{
   await db.exec('set role authenticated');await assert.rejects(db.query('select * from app_private.product_costs'),/permission denied/);await db.exec('reset role');
   await db.exec('set role anon');await assert.rejects(db.query("select public.shop_read('{}')"),/permission denied/);await db.exec('reset role');
  });
  const {id:pid}=await call(admin,{action:'product',sku:'TEST',name:'Tên gốc',glass_type:'clear',models:[],sale_price:'25000',fixed_cost:'10000',active:true});
  await call(admin,{action:'inventory',type:'opening',reason:'Ban đầu',items:[{product_id:pid,quantity:3}]});
  const {id:oid}=await call(staff,{action:'save_draft',items:[{product_id:pid,quantity:2,custom_name:'Tên riêng'}]});
  let state=await call(staff,{},true);let order=state.orders[0];
  await t.test('blank name rejected; null restores catalog name without stock changes',async()=>{
   await assert.rejects(call(staff,{action:'save_draft',id:oid,version:order.version,items:[{product_id:pid,quantity:2,custom_name:'  '}]}));
   await call(staff,{action:'save_draft',id:oid,version:order.version,items:[{product_id:pid,quantity:2,custom_name:null}]});
   state=await call(staff,{},true);order=state.orders[0];assert.equal(order.items[0].custom_name,null);assert.equal(state.products[0].on_hand,3);
  });
  await call(staff,{action:'confirm_order',id:oid,version:order.version,payment_method:'cash'});
  await t.test('confirmed order cannot be edited even by admin',async()=>{await assert.rejects(call(admin,{action:'save_draft',id:oid,version:order.version+1,items:[{product_id:pid,quantity:2,custom_name:'Sai'}]}),/INVALID_ORDER_STATE/);});
  state=await call(admin,{},true);order=state.orders[0];
  await call(admin,{action:'return_order',id:oid,reason:'Trả một phần',refund_method:'cash',items:[{order_item_id:order.items[0].id,quantity:1,restock_quantity:0}]});
  await t.test('over-return rejected and reports use original cost with damage separate',async()=>{
   await assert.rejects(call(admin,{action:'return_order',id:oid,reason:'Quá số lượng',refund_method:'cash',items:[{order_item_id:order.items[0].id,quantity:2,restock_quantity:2}]}),/RETURN_EXCEEDS_SOLD/);
   const r=await db.query<{day:string}>("select to_char(now() at time zone 'Asia/Ho_Chi_Minh','YYYY-MM-DD') as day");const day=r.rows[0].day;
   const report=await call(admin,{action:'report',from:day,to:day},true);assert.equal(report.revenue,'25000');assert.equal(report.cost,'10000');assert.equal(report.profit,'15000');assert.equal(report.damage,'10000');
   await db.query("update app_private.sales_orders set confirmed_at=confirmed_at-interval '1 day' where id=$1",[oid]);
   const next=await call(admin,{action:'report',from:day,to:day},true);assert.equal(next.revenue,'-25000');assert.equal(next.cost,'-10000');
  });
  await t.test('exchange links one new draft; opening cannot be repeated',async()=>{
   const s=await call(admin,{},true);const ret=s.orders[0].returns[0];const a=await call(admin,{action:'exchange',return_id:ret.id});const b=await call(admin,{action:'exchange',return_id:ret.id});assert.equal(a.id,b.id);
   await assert.rejects(call(admin,{action:'inventory',type:'opening',reason:'Lặp',items:[{product_id:pid,quantity:2}]}),/OPENING_EXISTS/);
  });
 }finally{await db.close();}
});
