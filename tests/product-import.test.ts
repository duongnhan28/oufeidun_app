import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
test('catalog import is atomic, idempotent, admin-only and preserves stock/history metadata',async()=>{
 const db=new PGlite(); const admin='10000000-0000-4000-8000-000000000001',staff='10000000-0000-4000-8000-000000000002';
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('app.user_id',true),'')::uuid$$;`);
 await db.exec(readFileSync('supabase/migrations/001_shop.sql','utf8'));
 await db.exec(readFileSync('supabase/migrations/003_glass_brands.sql','utf8'));
 const sql=readFileSync('src/data/demo-product-import.sql','utf8');await db.exec(sql);await db.exec(sql);
 for(const [id,role] of [[admin,'admin'],[staff,'staff']]){await db.query('insert into auth.users values($1)',[id]);await db.query('insert into app_private.app_users(id,display_name,role) values($1,$2,$2)',[id,role]);}
 await db.query("select set_config('app.user_id',$1,false)",[admin]);
 const item={sku:'CAT-ONE',glass_type:'clear',brand:'Apple',glass_brand:'Oufeidun',models:['iPhone 15','OPPO A58/A60'],sale_price:'25000',wholesale_price:'22000',fixed_cost:'10000'};
 const payload={action:'import_products',key:crypto.randomUUID(),items:[item]};
 const write=async(p:unknown)=>(await db.query<{r:any}>('select public.shop_write($1::jsonb) r',[JSON.stringify(p)])).rows[0].r;
 assert.deepEqual(await write(payload),{created:1,updated:0});assert.deepEqual(await write(payload),{created:1,updated:0});
 await db.exec("update app_private.inventory_balances set on_hand=7;update app_private.products set name='Historical name',image_path='keep.png',active=false;");
 assert.deepEqual(await write({...payload,key:crypto.randomUUID(),items:[{...item,sale_price:'30000',wholesale_price:'24000',glass_type:'full_border'}]}),{created:0,updated:1});
 const p=(await db.query<any>('select p.*,b.on_hand,c.fixed_cost from app_private.products p join app_private.inventory_balances b on b.product_id=p.id join app_private.product_costs c on c.product_id=p.id')).rows[0];
 assert.equal(p.on_hand,7);assert.equal(p.name,'Historical name');assert.equal(p.image_path,'keep.png');assert.equal(p.active,false);assert.equal(String(p.sale_price),'30000');assert.equal(String(p.wholesale_price),'24000');assert.equal(p.glass_type,'full_border');
 await assert.rejects(write({...payload,key:crypto.randomUUID(),items:[{...item,sku:'ROLLBACK'}, {...item,sku:'BAD',fixed_cost:'-1'}]}),/VALIDATION/);
 assert.equal((await db.query<any>("select count(*) n from app_private.products where sku='ROLLBACK'")).rows[0].n,0);
 await assert.rejects(write({...payload,key:crypto.randomUUID(),items:[item,item]}),/VALIDATION/);
 const receipt={...payload,key:crypto.randomUUID(),reason:'Excel số lượng',items:[{...item,quantity:3},{...item,sku:'CAT-QTY',quantity:8}]};
 await write(receipt);await write(receipt);
 const balances=(await db.query<any>('select p.sku,b.on_hand from app_private.products p join app_private.inventory_balances b on b.product_id=p.id order by p.sku')).rows;
 assert.deepEqual(balances,[{sku:'CAT-ONE',on_hand:10},{sku:'CAT-QTY',on_hand:8}]);
 assert.equal((await db.query<any>('select count(*) n from app_private.inventory_documents')).rows[0].n,1);
 const lines=(await db.query<any>('select quantity_delta,unit_purchase_price,fixed_cost_snapshot from app_private.inventory_document_items order by quantity_delta')).rows;
 assert.deepEqual(lines.map(l=>[l.quantity_delta,l.unit_purchase_price,String(l.fixed_cost_snapshot)]),[[3,null,'10000'],[8,null,'10000']]);
 await assert.rejects(write({...receipt,key:crypto.randomUUID(),items:[{...item,sku:'AAA-QUANTITY-ROLLBACK',quantity:5},{...item,sku:'ZZZ-BAD-QUANTITY',quantity:-1}]}),/VALIDATION/);
 assert.equal((await db.query<any>("select count(*) n from app_private.products where sku='AAA-QUANTITY-ROLLBACK'")).rows[0].n,0);
 assert.equal((await db.query<any>('select count(*) n from app_private.inventory_documents')).rows[0].n,1);
 await db.query("select set_config('app.user_id',$1,false)",[staff]);await assert.rejects(write({...payload,key:crypto.randomUUID()}),/FORBIDDEN/);
 }finally{await db.close();}
});
