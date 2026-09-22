import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
test('glass brands: additive migration, authorization, validation, idempotency and assignment',async()=>{
 const db=new PGlite();const admin=crypto.randomUUID(),staff=crypto.randomUUID();
 async function call(who:string,payload:Record<string,unknown>,read=false):Promise<any>{await db.query("select set_config('app.user_id',$1,false)",[who]);return (await db.query<{r:any}>(`select public.${read?'shop_read':'shop_write'}($1::jsonb) r`,[JSON.stringify(read?payload:{key:crypto.randomUUID(),...payload})])).rows[0].r;}
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('app.user_id',true),'')::uuid$$;`);
  await db.exec(readFileSync('supabase/migrations/001_shop.sql','utf8'));
  for(const [id,role] of [[admin,'admin'],[staff,'staff']]){await db.query('insert into auth.users values($1)',[id]);await db.query('insert into app_private.app_users(id,display_name,role) values($1,$2,$3)',[id,role,role]);}
  const input={action:'product',sku:'IP15',name:'Kính iPhone',glass_type:'clear',models:['iPhone 15'],brand:'Apple',sale_price:'25000',fixed_cost:'10000',active:true};
  const old=await call(admin,input);
  await db.exec(readFileSync('supabase/migrations/003_glass_brands.sql','utf8'));
  let ws=await call(admin,{},true);assert.equal(ws.products[0].id,old.id);assert.equal(ws.products[0].brand,'Apple');assert.equal(ws.products[0].glass_brand_id,null);assert.deepEqual(ws.glass_brands,[]);
  await assert.rejects(call(staff,{action:'glass_brand',name:'Không được'}),/FORBIDDEN/);
  await assert.rejects(call(admin,{action:'glass_brand',name:'   '}));
  const cmd={action:'glass_brand',name:'  Oufeidun   Premium  ',key:crypto.randomUUID()};const b=await call(admin,cmd);assert.equal((await call(admin,cmd)).id,b.id);
  await assert.rejects(call(admin,{action:'glass_brand',name:'oufeidun premium'}),/unique|duplicate/);
  await call(admin,{...input,id:old.id,version:1,glass_brand_id:b.id});
  ws=await call(staff,{},true);assert.equal(ws.glass_brands[0].name,'Oufeidun Premium');assert.equal(ws.products[0].glass_brand_id,b.id);assert.equal('fixed_cost' in ws.products[0],false);
  await assert.rejects(call(admin,{...input,id:old.id,version:2,glass_brand_id:crypto.randomUUID()}),/foreign key/);
  ws=await call(admin,{},true);assert.equal(ws.products[0].version,2);assert.equal(ws.products[0].on_hand,0);
 }finally{await db.close();}
});
