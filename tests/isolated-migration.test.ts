import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('isolated production migration creates only AppBanHang schema and sample catalog', async () => {
  const db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$select null::uuid$$;
  `);
  const migration = await readFile('supabase/migrations/004_app_ban_hang_isolated.sql', 'utf8');
  const sample = await readFile('supabase/migrations/006_app_ban_hang_sample.sql', 'utf8');
  const deleteProduct = await readFile('supabase/migrations/014_app_ban_hang_delete_product.sql', 'utf8');
  const salesFeedback = await readFile('supabase/migrations/017_app_order_sales_feedback.sql', 'utf8');
  const customerReporting = await readFile('supabase/migrations/018_app_customer_reporting_excel.sql', 'utf8');
  const salesAssignment = await readFile('supabase/migrations/019_app_sales_assignment_bulk_pricing.sql', 'utf8');
  const lockedOrderPrices = await readFile('supabase/migrations/020_lock_order_prices.sql', 'utf8');
  const flexibleOrderPrices = await readFile('supabase/migrations/021_flexible_order_prices.sql', 'utf8');
  const manualOrderCode = await readFile('supabase/migrations/022_manual_order_code.sql', 'utf8');
  const shortOrderGuard = await readFile('supabase/migrations/023_block_short_order_confirmation.sql', 'utf8');
  const partialFulfillment = await readFile('supabase/migrations/024_partial_fulfillment.sql', 'utf8');
  await db.exec(migration);
  await db.exec(sample);
  await db.exec(deleteProduct);
  await db.exec(salesFeedback);
  await db.exec(customerReporting);
  await db.exec(salesAssignment);
  await db.exec(lockedOrderPrices);
  await db.exec(flexibleOrderPrices);
  await db.exec(manualOrderCode);
  await db.exec(shortOrderGuard);
  await db.exec(partialFulfillment);
  await db.exec(await readFile('supabase/migrations/025_delivery_payment.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/026_preserve_manual_shortage.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/027_excel_create_sku.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/028_excel_product_catalog.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/028_excel_product_catalog.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/029_excel_catalog_quantity.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/030_order_details.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/030_order_details.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/029_excel_catalog_quantity.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/027_excel_create_sku.sql', 'utf8')); 

  await db.exec(await readFile('supabase/migrations/031_catalog_sale_gift_lines.sql','utf8'));
  await db.exec(await readFile('supabase/migrations/031_catalog_sale_gift_lines.sql','utf8'));

  const schemas = await db.query<{ schema_name: string }>(`
    select schema_name from information_schema.schemata
    where schema_name in ('app_ban_hang','app_private') order by schema_name
  `);
  assert.deepEqual(schemas.rows.map(row => row.schema_name), ['app_ban_hang']);
  const counts = await db.query<{ products: number; brands: number; stock: number }>(`
    select
      (select count(*)::int from app_ban_hang.products) products,
      (select count(*)::int from app_ban_hang.glass_brands) brands,
      (select coalesce(sum(on_hand),0)::int from app_ban_hang.inventory_balances) stock
  `);
  assert.deepEqual(counts.rows[0], { products: 6, brands: 1, stock: 0 });
  const additions = await db.query<{ addresses: number; payments: number }>(`
    select
      count(*) filter(where table_name='sales_orders' and column_name='customer_address')::int addresses,
      count(*) filter(where table_name='sales_payments')::int payments
    from information_schema.columns where table_schema='app_ban_hang'
  `);
  assert.deepEqual(additions.rows[0], { addresses: 1, payments: 7 });
  const business = await db.query<{ customers: number; wholesale: number; fulfillment: number }>(`
    select
      count(*) filter(where table_name='customers')::int customers,
      count(*) filter(where table_name='products' and column_name='wholesale_price')::int wholesale,
      count(*) filter(where table_name='sales_orders' and column_name='fulfillment_status')::int fulfillment
    from information_schema.columns where table_schema='app_ban_hang'
  `);
  assert.deepEqual(business.rows[0], { customers: 9, wholesale: 1, fulfillment: 1 });
  const adminId = '10000000-0000-4000-8000-000000000099';
  await db.exec(`create or replace function auth.uid() returns uuid language sql as $$select nullif(current_setting('app.user_id',true),'')::uuid$$;`);
  await db.query('insert into auth.users(id) values($1)', [adminId]);
  await db.query("insert into app_ban_hang.app_users(id,display_name,role) values($1,'Admin test','admin')", [adminId]);
  await db.query("select set_config('app.user_id',$1,false)", [adminId]);
  const customer = await db.query<{ result: { id: string } }>("select public.app_ban_hang_customer($1::jsonb) result", [JSON.stringify({ name: 'Đại lý thử', phone: '0900000099', customer_type: 'wholesale', address: 'TP.HCM' })]);
  assert.ok(customer.rows[0].result.id);
  const extras = await db.query<{ result: { customers: unknown[]; products: { wholesale_price: string }[] } }>('select public.app_ban_hang_business_extras() result');
  assert.equal(extras.rows[0].result.customers.length, 1);
  assert.equal((extras.rows[0].result as any).salespeople.length, 1);
  assert.equal(extras.rows[0].result.products[0].wholesale_price, '25000');
  const report = await db.query<{ result: { order_count: number; sales: unknown[]; movements: unknown[] } }>("select public.app_ban_hang_detailed_report($1::jsonb) result", [JSON.stringify({ from: '2026-01-01', to: '2026-01-31', brand: 'all' })]);
  assert.equal(report.rows[0].result.order_count, 0);
  assert.deepEqual(report.rows[0].result.sales, []);
  const productId = (await db.query<{ id: string }>('select id from app_ban_hang.products order by sku limit 1')).rows[0].id;
  const draft = await db.query<{ result: { id: string } }>('select public.app_ban_hang_write($1::jsonb) result',[JSON.stringify({action:'save_draft',key:crypto.randomUUID(),items:[{product_id:productId,quantity:1,custom_name:null}],customer_name:'Khách test',customer_phone:'0900111222',note:''})]);
  await db.query('select public.app_ban_hang_order_business($1::jsonb)',[JSON.stringify({order_id:draft.rows[0].result.id,order_code:'803',customer_id:customer.rows[0].result.id,sales_user_id:adminId,fulfillment_status:'short',missing_summary:'Thiếu 2 miếng'})]);
  const assigned = await db.query<{ result: { orders: { id: string; sales_name: string; fulfillment_status: string }[] } }>('select public.app_ban_hang_business_extras() result');
  const assignedOrder=assigned.rows[0].result.orders.find(order=>order.id===draft.rows[0].result.id);
  assert.equal(assignedOrder?.sales_name,'Admin test');
  assert.equal(assignedOrder?.fulfillment_status,'short');
  assert.equal((assignedOrder as any)?.order_no,'803');
  const productType = (await db.query<{ glass_type: string }>('select glass_type from app_ban_hang.products where id=$1',[productId])).rows[0].glass_type;
  const bulk = await db.query<{ result: { updated: number } }>('select public.app_ban_hang_bulk_price($1::jsonb) result',[JSON.stringify({glass_type:productType,sale_price:'31000',wholesale_price:'28000',fixed_cost:'11000'})]);
  assert.ok(bulk.rows[0].result.updated > 0);
  const priced = await db.query<{ sale_price: string; wholesale_price: string; fixed_cost: string }>('select p.sale_price::text,p.wholesale_price::text,c.fixed_cost::text from app_ban_hang.products p join app_ban_hang.product_costs c on c.product_id=p.id where p.id=$1',[productId]);
  assert.deepEqual(priced.rows[0],{sale_price:'31000',wholesale_price:'28000',fixed_cost:'11000'});
  await db.query('select public.app_ban_hang_order_features($1::jsonb)',[JSON.stringify({action:'save',order_id:draft.rows[0].result.id,customer_address:'',customer_type:'wholesale',items:[{product_id:productId,unit_sale_price:'19000',price_overridden:true,save_customer_price:true,item_kind:'sale',item_note:''}]})]);
  const lockedPrice = await db.query<{ unit_sale_price: string }>('select unit_sale_price::text from app_ban_hang.sales_order_items where order_id=$1 and product_id=$2',[draft.rows[0].result.id,productId]);
  assert.equal(lockedPrice.rows[0].unit_sale_price,'19000');
  const savedCustomerPrice = await db.query<{ unit_price: string }>('select unit_price::text from app_ban_hang.customer_product_prices where customer_id=$1 and product_id=$2',[customer.rows[0].result.id,productId]);
  assert.equal(savedCustomerPrice.rows[0].unit_price,'19000');
  const flexibleExtras = await db.query<{ result: { customer_prices: { unit_price: string }[] } }>('select public.app_ban_hang_business_extras() result');
  assert.equal(flexibleExtras.rows[0].result.customer_prices[0].unit_price,'19000');

  await db.query('select public.app_ban_hang_write($1::jsonb)',[JSON.stringify({action:'inventory',key:crypto.randomUUID(),type:'opening',reason:'Tồn kiểm thử giao thiếu',items:[{product_id:productId,quantity:2,purchase_price:null,stock_version:0}]})]);
  const partialDraft = await db.query<{ result: { id: string } }>('select public.app_ban_hang_write($1::jsonb) result',[JSON.stringify({action:'save_draft',key:crypto.randomUUID(),items:[{product_id:productId,quantity:3,custom_name:null}],customer_name:'Khách giao thiếu',customer_phone:'0900111999',note:''})]);
  await db.query('select public.app_ban_hang_order_business($1::jsonb)',[JSON.stringify({order_id:partialDraft.rows[0].result.id,order_code:'SHORT-01',customer_id:'',sales_user_id:adminId,fulfillment_status:'short',missing_summary:'Thiếu 1 miếng'})]);
  const partialVersion=(await db.query<{ version: number }>('select version from app_ban_hang.sales_orders where id=$1',[partialDraft.rows[0].result.id])).rows[0].version;
  const partialItem=(await db.query<{ id: string }>('select id from app_ban_hang.sales_order_items where order_id=$1',[partialDraft.rows[0].result.id])).rows[0];
  await db.query('select public.app_ban_hang_partial_fulfillment($1::jsonb)',[JSON.stringify({action:'confirm_order',key:crypto.randomUUID(),id:partialDraft.rows[0].result.id,version:partialVersion,payment_method:'cash',deliveries:[{order_item_id:partialItem.id,quantity:2}]})]);
  const firstDelivery=await db.query<{ delivered_quantity:number; quantity:number; total_amount:string; fulfillment_status:string; version:number }>('select i.delivered_quantity,i.quantity,o.total_amount::text,o.fulfillment_status,o.version from app_ban_hang.sales_order_items i join app_ban_hang.sales_orders o on o.id=i.order_id where i.id=$1',[partialItem.id]);
  assert.deepEqual(firstDelivery.rows[0],{delivered_quantity:2,quantity:3,total_amount:'62000',fulfillment_status:'short',version:partialVersion+1});
  await db.query('select public.app_ban_hang_write($1::jsonb)',[JSON.stringify({action:'inventory',key:crypto.randomUUID(),type:'receipt',reason:'Nhập hàng giao bổ sung',items:[{product_id:productId,quantity:1,purchase_price:'11000',stock_version:2}]})]);
  await db.query('select public.app_ban_hang_partial_fulfillment($1::jsonb)',[JSON.stringify({action:'deliver_order',key:crypto.randomUUID(),id:partialDraft.rows[0].result.id,version:partialVersion+1,items:[{order_item_id:partialItem.id,quantity:1}]})]);
  const completed=await db.query<{ delivered_quantity:number; total_amount:string; fulfillment_status:string }>('select i.delivered_quantity,o.total_amount::text,o.fulfillment_status from app_ban_hang.sales_order_items i join app_ban_hang.sales_orders o on o.id=i.order_id where i.id=$1',[partialItem.id]);
  assert.deepEqual(completed.rows[0],{delivered_quantity:3,total_amount:'93000',fulfillment_status:'complete'});
  await db.query('select public.app_ban_hang_write($1::jsonb)',[JSON.stringify({action:'inventory',key:crypto.randomUUID(),type:'receipt',reason:'Test ghi chú thiếu',items:[{product_id:productId,quantity:1,purchase_price:'11000'}]})]);
  const manual = (await db.query<{ result:{id:string} }>('select public.app_ban_hang_write($1::jsonb) result',[JSON.stringify({action:'save_draft',key:crypto.randomUUID(),items:[{product_id:productId,quantity:1}],customer_name:'An',customer_phone:'1234567890'})])).rows[0].result;
  await db.query('select public.app_ban_hang_order_business($1::jsonb)',[JSON.stringify({order_id:manual.id,order_code:'A12',sales_user_id:adminId,fulfillment_status:'short',missing_summary:'sam a21 thiếu 100 tấm / sam 71 thiếu 1000 tấm'})]);
  const manualVersion = (await db.query<{version:number}>('select version from app_ban_hang.sales_orders where id=$1',[manual.id])).rows[0].version;
  await db.query('select public.app_ban_hang_partial_fulfillment($1::jsonb)',[JSON.stringify({action:'confirm_order',key:crypto.randomUUID(),id:manual.id,version:manualVersion,payment_method:'cash'})]);
  const manualOrder = (await db.query<{fulfillment_status:string; missing_summary:string; version:number; total_amount:string}>('select fulfillment_status,missing_summary,version,total_amount::text from app_ban_hang.sales_orders where id=$1',[manual.id])).rows[0];
  assert.equal(manualOrder.fulfillment_status,'short');
  assert.match(manualOrder.missing_summary,/sam a21/);
  await db.query('select public.app_ban_hang_partial_fulfillment($1::jsonb)',[JSON.stringify({action:'resolve_shortage',key:crypto.randomUUID(),id:manual.id,version:manualOrder.version})]);
  assert.equal((await db.query<{fulfillment_status:string}>('select fulfillment_status from app_ban_hang.sales_orders where id=$1',[manual.id])).rows[0].fulfillment_status,'complete');
  const feeDraft=(await db.query<any>('select public.app_ban_hang_write($1::jsonb) result',[JSON.stringify({action:'save_draft',key:crypto.randomUUID(),ordered_at:'2026-10-09T00:15:00+07:00',extra_cost:'5000',extra_cost_note:'In ấn',items:[{product_id:productId,quantity:1}],customer_name:'Fee',customer_phone:'123',note:'Giao chiều'})])).rows[0].result;
  await db.query('select public.app_ban_hang_order_features($1::jsonb)',[JSON.stringify({action:'save',order_id:feeDraft.id,customer_type:'retail',customer_address:'HCM',items:[{product_id:productId,item_kind:'sale',item_note:'Note dòng'}]})]);
  const fee=(await db.query<any>('select extra_cost::text,extra_cost_note,total_amount::text,ordered_at,version from app_ban_hang.sales_orders where id=$1',[feeDraft.id])).rows[0];
  assert.equal(fee.extra_cost,'5000');assert.equal(fee.extra_cost_note,'In ấn');assert.equal(fee.total_amount,'36000');
  await db.query('select public.app_ban_hang_write($1::jsonb)',[JSON.stringify({action:'order_date',key:crypto.randomUUID(),id:feeDraft.id,version:fee.version,ordered_at:'2026-10-08T20:00:00+07:00'})]);
  assert.equal((await db.query<any>('select total_amount::text from app_ban_hang.sales_orders where id=$1',[feeDraft.id])).rows[0].total_amount,'36000');
  const mixedAtomic={action:'save_draft',key:crypto.randomUUID(),order_code:'MIX-PROD',customer_name:'Mixed',customer_phone:'0907777777',note:'',sale_details:{customer_type:'wholesale',customer_address:'test',sales_user_id:adminId,fulfillment_status:'complete',missing_summary:''},items:[{product_id:productId,quantity:2,custom_name:null,item_kind:'sale',unit_sale_price:'19000',price_overridden:true},{product_id:productId,quantity:1,custom_name:null,item_kind:'gift'}]};
  const mixedId=(await db.query<any>('select public.app_ban_hang_write($1::jsonb) result',[JSON.stringify(mixedAtomic)])).rows[0].result.id;
  const mixedRow=(await db.query<any>('select total_amount::text from app_ban_hang.sales_orders where id=$1',[mixedId])).rows[0];assert.equal(mixedRow.total_amount,'38000');
  const mixedKinds=(await db.query<any>('select item_kind,unit_sale_price::text from app_ban_hang.sales_order_items where order_id=$1 order by item_kind',[mixedId])).rows;assert.deepEqual(mixedKinds,[{item_kind:'gift',unit_sale_price:'0'},{item_kind:'sale',unit_sale_price:'19000'}]);
  const sharedMigration=await readFile('supabase/migrations/032_shared_order_reads.sql','utf8');await db.exec(sharedMigration);await db.exec(sharedMigration);
  const legacyBefore=(await db.query<any>("select public.app_ban_hang_read('{}'::jsonb) r")).rows[0].r;
  const positionMigration=await readFile('supabase/migrations/033_order_line_position.sql','utf8');await db.exec(positionMigration);await db.exec(positionMigration);
  assert.deepEqual((await db.query<any>("select public.app_ban_hang_read('{}'::jsonb) r")).rows[0].r,legacyBefore);
  const orderedInput=[mixedAtomic.items[1],mixedAtomic.items[0]],orderedPayload={...mixedAtomic,order_code:'POSITION-PROD',key:crypto.randomUUID(),items:orderedInput};
  const orderedId=(await db.query<any>('select public.app_ban_hang_write($1::jsonb) r',[JSON.stringify(orderedPayload)])).rows[0].r.id;
  const positionRows=(await db.query<any>('select id,item_kind,line_position from app_ban_hang.sales_order_items where order_id=$1 order by line_position,id',[orderedId])).rows;
  assert.deepEqual(positionRows.map(row=>[row.item_kind,row.line_position]),[['gift',0],['sale',1]]);
  const orderedRead=(await db.query<any>("select public.app_ban_hang_read('{}'::jsonb) r")).rows[0].r.orders.find((row:any)=>row.id===orderedId);assert.deepEqual(orderedRead.items.map((row:any)=>row.id),positionRows.map(row=>row.id));
  await db.exec(positionMigration);assert.equal((await db.query<any>('select count(*) n from app_ban_hang.sales_order_items where order_id=$1',[orderedId])).rows[0].n,2);
  const categoryPriceMigration=await readFile('supabase/migrations/034_shared_category_price.sql','utf8');await db.exec(categoryPriceMigration);await db.exec(categoryPriceMigration);
  const categoryPricePayload=JSON.stringify({glass_type:'clear',price_field:'sale_price',unit_price:'15000'});
  assert.ok((await db.query<any>('select public.app_ban_hang_bulk_price($1::jsonb) r',[categoryPricePayload])).rows[0].r.updated>0);
  assert.equal((await db.query<any>('select sale_price::text from app_ban_hang.products where id=$1',[productId])).rows[0].sale_price,'15000');
  const viewer='10000000-0000-4000-8000-000000000098';await db.query('insert into auth.users(id) values($1)',[viewer]);await db.query("insert into app_ban_hang.app_users(id,display_name,role) values($1,'Viewer','staff')",[viewer]);await db.query("select set_config('app.user_id',$1,false)",[viewer]);
  const shared=(await db.query<any>("select public.app_ban_hang_read('{}'::jsonb) r")).rows[0].r;assert.ok(shared.orders.some((o:any)=>o.id===mixedId));assert.doesNotMatch(JSON.stringify(shared),/fixed_cost|unit_cost_snapshot|password_hash/);
  const sharedExtras=(await db.query<any>('select public.app_ban_hang_order_extras() r')).rows[0].r;assert.ok(sharedExtras.some((o:any)=>o.order_id===mixedId));
  const sharedBusiness=(await db.query<any>('select public.app_ban_hang_business_extras() r')).rows[0].r;assert.ok(sharedBusiness.orders.some((o:any)=>o.id===mixedId));
  await assert.rejects(db.query('select public.app_ban_hang_write($1::jsonb)',[JSON.stringify({action:'delete_draft',id:mixedId,key:crypto.randomUUID()})]),/FORBIDDEN/);
  await db.close();
});
