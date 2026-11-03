const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const envFile = path.resolve(__dirname, '../server/.env.test.local');
test('MySQL local API: auth, kho, đơn và tranh chấp tồn', { skip: !fs.existsSync(envFile), timeout: 60000 }, async () => {
  process.env.OUFEIDUN_SERVER_ENV = envFile;
  process.env.OUFEIDUN_PORT = '8791';
  const env = Object.fromEntries(fs.readFileSync(envFile,'utf8').split(/\r?\n/).filter(line => line && !line.startsWith('#') && line.includes('=')).map(line => { const i=line.indexOf('='); return [line.slice(0,i),line.slice(i+1)]; }));
  assert.match(env.MYSQL_DATABASE || '', /test/i, 'Integration must target a test database');
  process.env.OUFEIDUN_DATA_DIR = path.resolve(__dirname, '../test-results/api-integration-data');
  const { pool, passwordHash } = require('../server/src/core.cjs');
  const { migrate } = require('../server/src/migrate.cjs');
  const { start } = require('../server/src/index.cjs');
  await migrate();
  await pool.query("DELETE FROM schema_migrations WHERE version='010_customer_placeholder_identity'");
  await migrate();
  // Resume a migration interrupted after replacing the old index but before its version record.
  await pool.query("DELETE FROM schema_migrations WHERE version='007_sale_gift_lines'");
  await pool.query("DELETE FROM schema_migrations WHERE version='008_order_line_position'");
  await migrate();
  await pool.query('SET FOREIGN_KEY_CHECKS=0');
  for (const table of ['product_sku_renames','product_sku_names','mutation_requests','audit_logs','inventory_movements','inventory_document_items','inventory_documents','sales_payments','sales_return_items','sales_returns','order_delivery_items','order_delivery_batches','sales_order_items','customer_product_prices','sales_orders','customers','products','glass_brands']) await pool.query(`TRUNCATE TABLE ${table}`);
  await pool.query("DELETE FROM app_users WHERE role='staff'");
  await pool.query('SET FOREIGN_KEY_CHECKS=1');
  await pool.query("UPDATE app_users SET session_device_id=NULL,session_token_hash=NULL,session_last_seen=NULL,active=TRUE,deleted_at=NULL WHERE login_name='admin'");
  const server = await start();
  const base = 'http://127.0.0.1:8791/api/app/v1';
  let token = '';
  let orderSequence = 0;
  async function call(url, body, expected=200) {
    if (url==='/mutations' && body?.action==='save_draft' && !body.order_code) body={...body,order_code:`API-TEST-${++orderSequence}`};
    const response = await fetch(base+url,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
    const json = await response.json();
    assert.equal(response.status,expected,`${url}: ${JSON.stringify(json)}`);
    return json;
  }
  try {
    const signed = await call('/auth/login',{username:'admin',password:env.ADMIN_PASSWORD,device_id:'integration-a'});
    token=signed.access_token;
    await call('/auth/login',{username:'admin',password:env.ADMIN_PASSWORD,device_id:'integration-b'},409);
    const product = await call('/mutations',{action:'product',key:crypto.randomUUID(),id:null,sku:'TEST-ONE',name:'Kính kiểm thử',glass_type:'clear',models:['Samsung A13'],brand:'Samsung',sale_price:'25000',fixed_cost:'10000',active:true,image_path:null,glass_brand_id:null});
    await call('/products/wholesale-price',{product_id:product.id,wholesale_price:'22000'});
    await call('/mutations',{action:'inventory',key:crypto.randomUUID(),type:'opening',reason:'Tồn kiểm thử',items:[{product_id:product.id,quantity:1}]});
    const createDraft = async name => {
      const draft=await call('/mutations',{action:'save_draft',key:crypto.randomUUID(),id:null,items:[{product_id:product.id,quantity:1,custom_name:null}],customer_name:name,customer_phone:'0900000000',note:''});
      await call('/orders/features',{action:'save',order_id:draft.id,customer_address:'',customer_type:'retail',items:[{product_id:product.id,item_kind:'sale',item_note:''}]});
      return (await call('/workspace')).orders.find(order=>order.id===draft.id);
    };
    const first=await createDraft('Khách 1'), second=await createDraft('Khách 2');
    const confirms=await Promise.all([
      fetch(base+'/mutations',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({action:'confirm_order',key:crypto.randomUUID(),id:first.id,version:first.version,payment_method:'cash'})}),
      fetch(base+'/mutations',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({action:'confirm_order',key:crypto.randomUUID(),id:second.id,version:second.version,payment_method:'cash'})}),
    ]);
    assert.deepEqual(confirms.map(response=>response.status).sort(),[200,409]);
    const workspace=await call('/workspace');
    assert.equal(workspace.products.find(row=>row.id===product.id).on_hand,0);
    const soldOrder=workspace.orders.find(order=>order.status==='confirmed');
    await call('/orders/features',{action:'payment',order_id:soldOrder.id,amount:'10000',method:'cash',note:'Thu đợt 1'});
    const customer=await call('/customers',{name:'Khách API',phone:'0912345678',customer_type:'wholesale',address:'HCM',note:''});
    // Every sale action saves the customer again, including downloads and confirmation.
    const existingCustomer=await call('/customers',{name:'Khách API cập nhật',phone:'0912345678',customer_type:'retail',address:'Hà Nội',note:''});
    assert.equal(existingCustomer.id,customer.id);
    const selectedCustomer=await call('/customers',{id:customer.id,name:'Khách API đã chọn',phone:'0912345679',customer_type:'wholesale',address:'HCM',note:''});
    assert.equal(selectedCustomer.id,customer.id);
    await call('/customers',{id:customer.id,name:'Khách API',phone:'0912345679',customer_type:'wholesale',address:'HCM',note:''});
    const customersAfterResave=(await call('/workspace')).customers;
    assert.equal(customersAfterResave.filter(row=>row.id===customer.id).length,1);
    assert.equal(customersAfterResave.find(row=>row.id===customer.id).phone,'0912345679');
    await call('/orders/business',{order_id:soldOrder.id,customer_id:customer.id,sales_user_id:signed.user.id,fulfillment_status:'complete',missing_summary:''});
    const report=await call('/reports',{from:'2026-01-01',to:'2026-12-31',brand:'all'});
    assert.equal(report.order_count,1);
    assert.equal(report.stock,0);
    const flexibleProduct=await call('/mutations',{action:'product',key:crypto.randomUUID(),id:null,sku:'FLEX-ONE',name:'Kính giá linh hoạt',glass_type:'clear',models:['Flexible Phone'],brand:'Other',sale_price:'30000',fixed_cost:'10000',active:true,image_path:null,glass_brand_id:null});
    await call('/products/wholesale-price',{product_id:flexibleProduct.id,wholesale_price:'25000'});
    await call('/mutations',{action:'inventory',key:crypto.randomUUID(),type:'opening',reason:'Tồn kiểm thử giá linh hoạt',items:[{product_id:flexibleProduct.id,quantity:5}]});
    const wholesaleCustomer=await call('/customers',{name:'Khách sỉ linh hoạt',phone:'0987654321',customer_type:'wholesale',address:'HCM',note:''});
    const flexibleDraft=await call('/mutations',{action:'save_draft',key:crypto.randomUUID(),id:null,items:[{product_id:flexibleProduct.id,quantity:2,custom_name:null}],customer_name:'Khách sỉ linh hoạt',customer_phone:'0987654321',note:''});
    await call('/orders/business',{order_id:flexibleDraft.id,customer_id:wholesaleCustomer.id,sales_user_id:signed.user.id,fulfillment_status:'complete',missing_summary:''});
    await call('/orders/features',{action:'save',order_id:flexibleDraft.id,customer_address:'HCM',customer_type:'wholesale',items:[{product_id:flexibleProduct.id,unit_sale_price:'18000',price_overridden:true,save_customer_price:true,zero_price_confirm:false,item_kind:'sale',item_note:''}]});
    const flexibleWorkspace=await call('/workspace');
    const flexibleOrder=flexibleWorkspace.orders.find(order=>order.id===flexibleDraft.id);
    assert.equal(flexibleOrder.items[0].unit_sale_price,'18000');
    assert.equal(flexibleOrder.items[0].price_overridden,true);
    assert.equal(flexibleOrder.items[0].price_source,'manual');
    assert.equal(flexibleOrder.total_amount,'36000');
    assert.equal(flexibleWorkspace.customer_prices.find(price=>price.customer_id===wholesaleCustomer.id&&price.product_id===flexibleProduct.id).unit_price,'18000');
    await call('/mutations',{action:'confirm_order',key:crypto.randomUUID(),id:flexibleOrder.id,version:flexibleOrder.version,payment_method:'cash'});
    const confirmedFlexible=(await call('/workspace')).orders.find(order=>order.id===flexibleOrder.id);
    assert.equal(confirmedFlexible.total_amount,'36000');
    assert.equal(confirmedFlexible.items[0].unit_sale_price,'18000');
    const savedPriceDraft=await call('/mutations',{action:'save_draft',key:crypto.randomUUID(),id:null,items:[{product_id:flexibleProduct.id,quantity:1,custom_name:null}],customer_name:'Khách sỉ linh hoạt',customer_phone:'0987654321',note:''});
    await call('/orders/business',{order_id:savedPriceDraft.id,customer_id:wholesaleCustomer.id,sales_user_id:signed.user.id,fulfillment_status:'complete',missing_summary:''});
    await call('/orders/features',{action:'save',order_id:savedPriceDraft.id,customer_address:'HCM',customer_type:'wholesale',items:[{product_id:flexibleProduct.id,unit_sale_price:'99999',price_overridden:false,save_customer_price:false,zero_price_confirm:false,item_kind:'sale',item_note:''}]});
    const savedPriceWorkspace=await call('/workspace');
    const savedPriceOrder=savedPriceWorkspace.orders.find(order=>order.id===savedPriceDraft.id);
    assert.equal(savedPriceOrder.items[0].unit_sale_price,'18000');
    assert.equal(savedPriceOrder.items[0].price_source,'customer_saved');
    const secondWholesaleCustomer=await call('/customers',{name:'Khách sỉ giá khác',phone:'0977000002',customer_type:'wholesale',address:'Hà Nội',note:''});
    const secondCustomerDraft=await call('/mutations',{action:'save_draft',key:crypto.randomUUID(),id:null,items:[{product_id:flexibleProduct.id,quantity:1,custom_name:null}],customer_name:'Khách sỉ giá khác',customer_phone:'0977000002',note:''});
    await call('/orders/business',{order_id:secondCustomerDraft.id,customer_id:secondWholesaleCustomer.id,sales_user_id:signed.user.id,fulfillment_status:'complete',missing_summary:''});
    await call('/orders/features',{action:'save',order_id:secondCustomerDraft.id,customer_address:'Hà Nội',customer_type:'wholesale',items:[{product_id:flexibleProduct.id,unit_sale_price:'17000',price_overridden:true,save_customer_price:true,zero_price_confirm:false,item_kind:'sale',item_note:''}]});
    const twoPriceWorkspace=await call('/workspace');
    assert.equal(twoPriceWorkspace.customer_prices.find(price=>price.customer_id===wholesaleCustomer.id&&price.product_id===flexibleProduct.id).unit_price,'18000');
    assert.equal(twoPriceWorkspace.customer_prices.find(price=>price.customer_id===secondWholesaleCustomer.id&&price.product_id===flexibleProduct.id).unit_price,'17000');
    await call('/mutations',{action:'save_draft',key:crypto.randomUUID(),id:null,order_code:'MA-DON-TRUNG',items:[{product_id:flexibleProduct.id,quantity:1,custom_name:null}],customer_name:'Khách mã một',customer_phone:'0900000001',note:''});
    await call('/mutations',{action:'save_draft',key:crypto.randomUUID(),id:null,order_code:'ma-don-trung',items:[{product_id:flexibleProduct.id,quantity:1,custom_name:null}],customer_name:'Khách mã hai',customer_phone:'0900000002',note:''},409);
    const shortDraft=await call('/mutations',{action:'save_draft',key:crypto.randomUUID(),id:null,order_code:'DON-THIEU',items:[{product_id:flexibleProduct.id,quantity:5,custom_name:null}],customer_name:'Khach con thieu',customer_phone:'0900000003',note:''});
    await call('/orders/business',{order_id:shortDraft.id,customer_id:null,sales_user_id:signed.user.id,fulfillment_status:'short',missing_summary:''},409);
    await call('/orders/business',{order_id:shortDraft.id,customer_id:null,sales_user_id:signed.user.id,fulfillment_status:'short',missing_summary:'FLEX-ONE thieu 2 mieng'});
    const savedShortOrder=(await call('/workspace')).orders.find(order=>order.id===shortDraft.id);
    assert.equal(savedShortOrder.fulfillment_status,'short');
    assert.equal(savedShortOrder.missing_summary,'FLEX-ONE thieu 2 mieng');
    await call('/mutations',{action:'confirm_order',key:crypto.randomUUID(),id:savedShortOrder.id,version:savedShortOrder.version,payment_method:'cash'});
    const partiallyDelivered=(await call('/workspace')).orders.find(order=>order.id===shortDraft.id);
    assert.equal(partiallyDelivered.fulfillment_status,'short');
    await call('/mutations',{action:'resolve_shortage',key:crypto.randomUUID(),id:partiallyDelivered.id,version:partiallyDelivered.version},409);
    assert.equal(partiallyDelivered.items[0].quantity,5);
    assert.equal(partiallyDelivered.items[0].delivered_quantity,3);
    assert.equal(partiallyDelivered.items[0].missing_quantity,2);
    assert.equal(partiallyDelivered.total_amount,'90000');
    assert.equal(partiallyDelivered.deliveries.length,1);
    assert.equal(partiallyDelivered.deliveries[0].sequence_no,1);
    assert.equal(partiallyDelivered.deliveries[0].items[0].quantity,3);
    await call('/mutations',{action:'inventory',key:crypto.randomUUID(),type:'receipt',reason:'Nhap bu hang thieu',items:[{product_id:flexibleProduct.id,quantity:2,purchase_price:'10000'}]});
    await call('/mutations',{action:'deliver_order',key:crypto.randomUUID(),id:partiallyDelivered.id,version:partiallyDelivered.version,items:[{order_item_id:partiallyDelivered.items[0].id,quantity:2}],payment_amount:'150001',payment_method:'cash'},409);
    const afterRejectedPayment=(await call('/workspace')).orders.find(order=>order.id===shortDraft.id);
    assert.equal(afterRejectedPayment.total_amount,'90000');
    assert.equal(afterRejectedPayment.deliveries.length,1);
    assert.equal(afterRejectedPayment.items[0].delivered_quantity,3);
    const deliverAndPay={action:'deliver_order',key:crypto.randomUUID(),id:partiallyDelivered.id,version:partiallyDelivered.version,items:[{order_item_id:partiallyDelivered.items[0].id,quantity:2}],payment_amount:'150000',payment_method:'transfer'};
    await call('/mutations',deliverAndPay);
    await call('/mutations',deliverAndPay);
    const completedDelivery=(await call('/workspace')).orders.find(order=>order.id===shortDraft.id);
    assert.equal(completedDelivery.fulfillment_status,'complete');
    const manualDraft = await createDraft('An');
    await call('/orders/business',{order_id:manualDraft.id,customer_id:null,sales_user_id:signed.user.id,fulfillment_status:'short',missing_summary:'sam a21 thiếu 100 tấm / sam 71 thiếu 1000 tấm'});
    await call('/mutations',{action:'confirm_order',key:crypto.randomUUID(),id:manualDraft.id,version:manualDraft.version,payment_method:'cash',deliveries:[{order_item_id:manualDraft.items[0].id,quantity:0}]});
    // Pending actual goods cannot be dismissed as a note.
    let manualOrder=(await call('/workspace')).orders.find(order=>order.id===manualDraft.id);
    await call('/mutations',{action:'resolve_shortage',key:crypto.randomUUID(),id:manualOrder.id,version:manualOrder.version},409);
    // Separate fully delivered order with an external shortage note.
    await call('/mutations',{action:'inventory',key:crypto.randomUUID(),type:'receipt',reason:'Test manual shortage',items:[{product_id:product.id,quantity:2,purchase_price:'10000'}]});
    const notedDraft=await createDraft('An A12');
    await call('/orders/business',{order_id:notedDraft.id,customer_id:null,sales_user_id:signed.user.id,fulfillment_status:'short',missing_summary:'sam a21 thiếu 100 tấm / sam 71 thiếu 1000 tấm'});
    await call('/mutations',{action:'confirm_order',key:crypto.randomUUID(),id:notedDraft.id,version:notedDraft.version,payment_method:'cash'});
    const noted=(await call('/workspace')).orders.find(order=>order.id===notedDraft.id);
    assert.equal(noted.fulfillment_status,'short');
    assert.equal(noted.items[0].delivered_quantity,1);
    assert.match(noted.missing_summary,/sam a21/);
    const balanceBefore=(await call('/workspace')).products.find(row=>row.id===product.id).on_hand;
    const resolve={action:'resolve_shortage',key:crypto.randomUUID(),id:noted.id,version:noted.version};
    await call('/mutations',resolve);
    await call('/mutations',resolve);
    const resolved=(await call('/workspace')).orders.find(order=>order.id===noted.id);
    assert.equal(resolved.fulfillment_status,'complete');
    assert.equal(resolved.total_amount,noted.total_amount);
    assert.equal((await call('/workspace')).products.find(row=>row.id===product.id).on_hand,balanceBefore);
    assert.equal(completedDelivery.items[0].delivered_quantity,5);
    assert.equal(completedDelivery.items[0].missing_quantity,0);
    assert.equal(completedDelivery.total_amount,'150000');
    assert.equal(completedDelivery.paid_amount,'150000');
    assert.equal(completedDelivery.payment_status,'paid');
    assert.equal(completedDelivery.payments.length,1);
    assert.equal(completedDelivery.deliveries.length,2);
    assert.equal(completedDelivery.deliveries[1].sequence_no,2);
    assert.equal(completedDelivery.deliveries[1].items[0].quantity,2);
    const [internalAudit]=await pool.query("SELECT action FROM audit_logs WHERE action IN ('order.item_price.update','customer.price.save')");
    assert.ok(internalAudit.some(log=>log.action==='order.item_price.update'));
    assert.ok(internalAudit.some(log=>log.action==='customer.price.save'));
    const visibleLogs=(await call('/workspace')).logs;
    assert.ok(visibleLogs.some(log=>log.action==='deliver_order'));
    assert.ok(visibleLogs.some(log=>log.action==='inventory' && log.detail.startsWith('receipt:')));
    assert.ok(visibleLogs.every(log=>['confirm_order','deliver_order'].includes(log.action) || (log.action==='inventory' && /^(opening|receipt):/.test(log.detail))));
    const staffPassword='NhanVienLocal_123!';
    const staff=await call('/staff',{action:'create',display_name:'Nhân viên test',login_name:'nhanvientest',password:staffPassword});
    await call('/staff',{action:'permissions',id:staff.id,version:1,permissions:{manage_products:true,manage_prices:true,manage_returns:true,adjust_stock:true,view_reports:true,view_audit:true}});
    const staffLoginResponse=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'nhanvientest',password:staffPassword,device_id:'staff-device'})});
    assert.equal(staffLoginResponse.status,200);
    const staffLogin=await staffLoginResponse.json();
    const staffWorkspaceResponse=await fetch(base+'/workspace',{headers:{Authorization:`Bearer ${staffLogin.access_token}`}});
    const staffWorkspace=await staffWorkspaceResponse.json();
    assert.equal(staffWorkspace.me.id,staff.id);
    assert.equal(Object.hasOwn(staffWorkspace.products[0],'fixed_cost'),false);
    const forbiddenReceipt=await fetch(base+'/mutations',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${staffLogin.access_token}`},body:JSON.stringify({action:'inventory',key:crypto.randomUUID(),type:'receipt',reason:'Excel',items:[{sku:'STAFF-IMPORT',quantity:1,purchase_price:'1'}]})});
    assert.equal(forbiddenReceipt.status,403);
    const changedStaffPassword='NhanVienLocal_456!';
    await call('/staff',{action:'reset',id:staff.id,password:changedStaffPassword});
    const oldStaffPassword=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'nhanvientest',password:staffPassword,device_id:'staff-reset-old'})});
    assert.equal(oldStaffPassword.status,401);
    const changedStaffLogin=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'nhanvientest',password:changedStaffPassword,device_id:'staff-reset-new'})});
    assert.equal(changedStaffLogin.status,200);
    const changedStaffSession=await changedStaffLogin.json();
    const forbidden=await fetch(base+'/reports',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${changedStaffSession.access_token}`},body:JSON.stringify({from:'2026-01-01',to:'2026-12-31',brand:'all'})});
    assert.equal(forbidden.status,200);
    assert.doesNotMatch(JSON.stringify(await forbidden.json()),/"cost"|"profit"|stock_value|unit_cost/);
    const imageData=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
    const form=new FormData(); form.set('image',new Blob([imageData],{type:'image/png'}),'pixel.png');
    const uploadResponse=await fetch(base+'/images',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:form});
    const uploaded=await uploadResponse.json();
    assert.equal(uploadResponse.status,200,JSON.stringify(uploaded));
    assert.match(uploaded.path,/^products\/\d{4}\/\d{2}\/[0-9a-f-]+\.png$/);
    const imageResponse=await fetch(base+'/images/'+encodeURIComponent(uploaded.path),{headers:{Authorization:`Bearer ${token}`}});
    assert.equal(imageResponse.status,200);
    assert.equal(imageResponse.headers.get('content-type'),'image/png');
    const fakeForm=new FormData(); fakeForm.set('image',new Blob([Buffer.from('fake')],{type:'image/png'}),'fake.png');
    const fakeResponse=await fetch(base+'/images',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:fakeForm});
    assert.equal(fakeResponse.status,415);
    const deleteImageResponse=await fetch(base+'/images/'+encodeURIComponent(uploaded.path),{method:'DELETE',headers:{Authorization:`Bearer ${token}`}});
    assert.equal(deleteImageResponse.status,200);
    const lookupResponse=await fetch('http://127.0.0.1:8791/api/glass-lookup?q=A13');
    const lookup=await lookupResponse.json();
    assert.equal(lookup.items[0].sku,'TEST-ONE');
    // Excel SKU resolution is part of the same receipt transaction.
    const importPayload={action:'inventory',key:crypto.randomUUID(),type:'receipt',reason:'Excel SKU test',items:[{sku:' excel-new ',quantity:3,purchase_price:'12000'},{sku:'TEST-ONE',quantity:2,purchase_price:'19000'}]};
    const imported=await call('/mutations',importPayload);
    assert.deepEqual(await call('/mutations',importPayload),imported);
    let newProduct=(await call('/workspace')).products.find(p=>p.sku==='EXCEL-NEW');
    assert.equal(newProduct.on_hand,3); assert.equal(newProduct.name,'EXCEL-NEW'); assert.equal(newProduct.fixed_cost,'12000'); assert.equal(newProduct.sale_price,'0'); assert.equal(newProduct.wholesale_price,'0'); assert.equal(newProduct.glass_type,'other');
    const existingAfterImport=(await call('/workspace')).products.find(p=>p.id===product.id);
    assert.equal(existingAfterImport.sale_price,'25000'); assert.equal(existingAfterImport.fixed_cost,'10000');
    await call('/mutations',{...importPayload,key:crypto.randomUUID(),items:[{sku:'AAA-ROLLBACK',quantity:2,purchase_price:'1'},{sku:'ZZZ-BAD',quantity:0,purchase_price:'1'}]},400);
    assert.ok(!(await call('/workspace')).products.some(p=>p.sku==='AAA-ROLLBACK'));
    await call('/mutations',{...importPayload,key:crypto.randomUUID(),items:[{sku:'EXCEL-NEW',quantity:1,purchase_price:'1'},{product_id:newProduct.id,quantity:1,purchase_price:'1'}]},400);
    await call('/mutations',{...importPayload,key:crypto.randomUUID(),items:[{sku:'X'.repeat(51),quantity:1,purchase_price:'1'}]},400);
    await Promise.all([1,2].map(()=>call('/mutations',{...importPayload,key:crypto.randomUUID(),items:[{sku:'RACE-NEW',quantity:1,purchase_price:'1'}]})));
    const raced=(await call('/workspace')).products.filter(p=>p.sku==='RACE-NEW'); assert.equal(raced.length,1);assert.equal(raced[0].on_hand,2);
    await pool.execute('UPDATE products SET deleted_at=NOW(3) WHERE id=?',[newProduct.id]);
    await call('/mutations',{...importPayload,key:crypto.randomUUID(),items:[{sku:'EXCEL-NEW',quantity:1,purchase_price:'1'}]},409);
    // Eight-column catalog updates are distinct from quantity receipts.
    const catalogItem={sku:'CAT-API',glass_type:'full_border',brand:'Samsung',glass_brand:'New Brand',models:['Samsung A15','OPPO A58/A60'],sale_price:'30000',wholesale_price:'24000',fixed_cost:'12000'};
    const catalog={action:'import_products',key:crypto.randomUUID(),items:[catalogItem]};
    assert.deepEqual(await call('/mutations',catalog),{created:1,updated:0});
    assert.deepEqual(await call('/mutations',catalog),{created:1,updated:0});
    const beforeCatalog=(await call('/workspace')).products.find(p=>p.id===product.id);
    const resultCatalog=await call('/mutations',{...catalog,key:crypto.randomUUID(),items:[{...catalogItem,sku:'TEST-ONE'}]});
    assert.deepEqual(resultCatalog,{created:0,updated:1});
    const afterCatalog=(await call('/workspace')).products.find(p=>p.id===product.id);
    assert.equal(afterCatalog.on_hand,beforeCatalog.on_hand);assert.equal(afterCatalog.stock_version,beforeCatalog.stock_version);assert.equal(afterCatalog.name,beforeCatalog.name);assert.equal(afterCatalog.image_path,beforeCatalog.image_path);
    assert.equal(afterCatalog.sale_price,'30000');assert.equal(afterCatalog.wholesale_price,'24000');assert.equal(afterCatalog.fixed_cost,'12000');assert.equal(afterCatalog.price_version,beforeCatalog.price_version+1);
    await call('/mutations',{...catalog,key:crypto.randomUUID(),items:[{...catalogItem,sku:'AAA-CAT-ROLLBACK'},{...catalogItem,sku:'ZZZ-CAT-BAD',fixed_cost:'-1'}]},400);
    assert.ok(!(await call('/workspace')).products.some(p=>p.sku==='AAA-CAT-ROLLBACK'));
    await call('/mutations',{...catalog,key:crypto.randomUUID(),items:[catalogItem,catalogItem]},400);
    await call('/mutations',{...catalog,key:crypto.randomUUID(),items:[{...catalogItem,sku:'EXCEL-NEW'}]},409);
    await call('/mutations',{...catalog,key:crypto.randomUUID(),items:[{...catalogItem,sku:'AAA-CATALOG-LATE',glass_brand:'Rollback Brand'},{...catalogItem,sku:'EXCEL-NEW'}]},409);
    assert.ok(!(await call('/workspace')).products.some(p=>p.sku==='AAA-CATALOG-LATE'));
    assert.ok(!(await call('/workspace')).glass_brands.some(b=>b.name==='Rollback Brand'));
    await Promise.all([1,2].map(()=>call('/mutations',{...catalog,key:crypto.randomUUID(),items:[{...catalogItem,sku:'CAT-RACE'}]})));
    assert.equal((await call('/workspace')).products.filter(p=>p.sku==='CAT-RACE').length,1);
    const stockBefore=(await call('/workspace')).products.find(p=>p.sku==='TEST-ONE').on_hand;
    const quantityImport={...catalog,key:crypto.randomUUID(),reason:'Excel quantity test',items:[{...catalogItem,sku:'QTY-API',quantity:5},{...catalogItem,sku:'TEST-ONE',quantity:2}]};
    await call('/mutations',quantityImport);await call('/mutations',quantityImport);
    let qtyWorkspace=await call('/workspace');
    assert.equal(qtyWorkspace.products.find(p=>p.sku==='QTY-API').on_hand,5);
    assert.equal(qtyWorkspace.products.find(p=>p.sku==='TEST-ONE').on_hand,stockBefore+2);
    const [[qtyDocs]]=await pool.query("SELECT count(*) n FROM inventory_documents WHERE reason='Excel quantity test'");assert.equal(Number(qtyDocs.n),1);
    const [qtyLines]=await pool.query("SELECT l.quantity_delta,l.unit_purchase_price,l.fixed_cost_snapshot FROM inventory_document_items l JOIN inventory_documents d ON d.id=l.document_id WHERE d.reason='Excel quantity test' ORDER BY l.quantity_delta");
    assert.deepEqual(qtyLines.map(l=>[l.quantity_delta,l.unit_purchase_price,String(l.fixed_cost_snapshot)]),[[2,null,'12000'],[5,null,'12000']]);
    await call('/mutations',{...quantityImport,key:crypto.randomUUID(),items:[{...catalogItem,sku:'QTY-API',quantity:0}]});
    assert.equal((await call('/workspace')).products.find(p=>p.sku==='QTY-API').on_hand,5);
    await call('/mutations',{...quantityImport,key:crypto.randomUUID(),items:[{...catalogItem,sku:'BAD-QTY',quantity:1.5}]},400);
    await call('/mutations',{...quantityImport,key:crypto.randomUUID(),items:[{...catalogItem,sku:'AAA-QTY-LATE',quantity:3},{...catalogItem,sku:'EXCEL-NEW',quantity:1}]},409);
    assert.ok(!(await call('/workspace')).products.some(p=>p.sku==='AAA-QTY-LATE'));
    const [[afterQtyDocs]]=await pool.query("SELECT count(*) n FROM inventory_documents WHERE reason='Excel quantity test'");assert.equal(Number(afterQtyDocs.n),1);
    await Promise.all([1,2].map(()=>call('/mutations',{...quantityImport,key:crypto.randomUUID(),items:[{...catalogItem,sku:'QTY-RACE',quantity:1}]})));
    assert.equal((await call('/workspace')).products.find(p=>p.sku==='QTY-RACE').on_hand,2);
    const forbiddenCatalog=await fetch(base+'/mutations',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${changedStaffSession.access_token}`},body:JSON.stringify({...catalog,key:crypto.randomUUID()})});assert.equal(forbiddenCatalog.status,403);
    const changedAdminPassword='AdminLocal_456!';
    const detailProduct=(await call('/workspace')).products.find(p=>p.sku==='QTY-API');
    const detailsDraft=await call('/mutations',{action:'save_draft',key:crypto.randomUUID(),order_code:'DETAILS-API',ordered_at:'2026-10-09T00:15:00+07:00',extra_cost:'5000',extra_cost_note:'In ấn',customer_name:'Details',customer_phone:'123',note:'Giao chiều',items:[{product_id:detailProduct.id,quantity:3,custom_name:null}]});
    await call('/orders/features',{action:'save',order_id:detailsDraft.id,customer_address:'HCM',customer_type:'retail',items:[{product_id:detailProduct.id,item_kind:'sale',item_note:'Note dòng'}]});
    let details=(await call('/workspace')).orders.find(o=>o.id===detailsDraft.id);
    assert.equal(details.total_amount,'95000');assert.equal(details.ordered_at,'2026-10-09T00:15:00.000+07:00');
    await call('/orders/business',{order_id:details.id,fulfillment_status:'short',missing_summary:'Giao tiếp',sales_user_id:signed.user.id});
    await call('/mutations',{action:'confirm_order',key:crypto.randomUUID(),id:details.id,version:details.version,payment_method:'cash',deliveries:[{order_item_id:details.items[0].id,quantity:1}]});
    details=(await call('/workspace')).orders.find(o=>o.id===detailsDraft.id);assert.equal(details.total_amount,'35000');
    const feeDelivery={action:'deliver_order',key:crypto.randomUUID(),id:details.id,version:details.version,items:[{order_item_id:details.items[0].id,quantity:2}],payment_amount:'95000',payment_method:'cash'};
    await call('/mutations',feeDelivery);await call('/mutations',feeDelivery);
    details=(await call('/workspace')).orders.find(o=>o.id===detailsDraft.id);assert.equal(details.total_amount,'95000');assert.equal(details.paid_amount,'95000');assert.equal(details.extra_cost,'5000');assert.deepEqual(details.items[0].models_snapshot,['Samsung A15','OPPO A58/A60']);
    const realConfirmed=details.confirmed_at;
    const dateEdit={action:'order_date',key:crypto.randomUUID(),id:details.id,version:details.version,ordered_at:'2026-10-08T20:30:00+07:00'};
    await call('/mutations',dateEdit);await call('/mutations',dateEdit);await call('/mutations',{...dateEdit,key:crypto.randomUUID()},409);
    details=(await call('/workspace')).orders.find(o=>o.id===detailsDraft.id);assert.equal(details.confirmed_at,realConfirmed);assert.equal(details.total_amount,'95000');
    await call('/mutations',{...dateEdit,key:crypto.randomUUID(),version:details.version,ordered_at:'2026-02-30T12:30:00+07:00'},400);
    const deniedDate=await fetch(base+'/mutations',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${changedStaffSession.access_token}`},body:JSON.stringify({...dateEdit,key:crypto.randomUUID(),version:details.version})});assert.equal(deniedDate.status,200);
    const feeReport=await call('/reports',{from:'2026-01-01',to:'2026-12-31',brand:'all'});assert.equal(feeReport.other_charges,'5000');
    // Optional same-SKU sale/gift/sample, atomic save and shared stock on the real API.
    const mixProduct=await call('/mutations',{action:'product',key:crypto.randomUUID(),sku:'MIXED-LINES',name:'MIXED-LINES',glass_type:'full_border',brand:'Apple',models:[],sale_price:'25000',wholesale_price:'22000',fixed_cost:'10000',active:true});
    await call('/mutations',{action:'inventory',key:crypto.randomUUID(),type:'opening',reason:'mixed tests',items:[{product_id:mixProduct.id,quantity:11}]});
    const saleDetails={customer_id:null,customer_type:'wholesale',customer_address:'test',sales_user_id:signed.user.id,fulfillment_status:'short',missing_summary:'MIXED-LINES giao sau 1 miếng'};
    const mixedPayload={action:'save_draft',key:crypto.randomUUID(),order_code:'MIXED-API',customer_name:'Khách mixed',customer_phone:'0904444444',note:'optional gift',sale_details:saleDetails,items:[{product_id:mixProduct.id,quantity:10,item_kind:'sale',unit_sale_price:'19000',price_overridden:true,save_customer_price:true},{product_id:mixProduct.id,quantity:1,item_kind:'gift'},{product_id:mixProduct.id,quantity:1,item_kind:'sample'}]};
    const mixedSaved=await call('/mutations',mixedPayload);await call('/mutations',mixedPayload);
    let mixedWorkspace=await call('/workspace');let mixed=mixedWorkspace.orders.find(o=>o.id===mixedSaved.id);
    assert.equal(mixed.items.length,3);assert.equal(mixed.total_amount,'190000');assert.equal(mixed.items.find(i=>i.item_kind==='gift').unit_sale_price,'0');
    assert.equal(mixedWorkspace.customer_prices.find(p=>p.product_id===mixProduct.id).unit_price,'19000');
    const badMixed={...mixedPayload,key:crypto.randomUUID(),order_code:'MIXED-BAD',sale_details:{...saleDetails,sales_user_id:'10000000-0000-4000-8000-000000000099'}};
    await call('/mutations',badMixed,400);assert.ok(!(await call('/workspace')).orders.some(o=>o.order_no==='MIXED-BAD'));
    await call('/mutations',{...mixedPayload,key:crypto.randomUUID(),order_code:'MIXED-DUP',items:[mixedPayload.items[0],mixedPayload.items[0]]},400);
    await call('/mutations',{action:'confirm_order',key:crypto.randomUUID(),id:mixed.id,version:mixed.version,payment_method:'cash',deliveries:mixed.items.map(i=>({order_item_id:i.id,quantity:i.quantity}))},409);
    assert.equal((await call('/workspace')).products.find(p=>p.id===mixProduct.id).on_hand,11);
    const mixedConfirm={action:'confirm_order',key:crypto.randomUUID(),id:mixed.id,version:mixed.version,payment_method:'cash',deliveries:mixed.items.map(i=>({order_item_id:i.id,quantity:i.item_kind==='sale'?9:0}))};await call('/mutations',mixedConfirm);await call('/mutations',mixedConfirm);
    mixedWorkspace=await call('/workspace');mixed=mixedWorkspace.orders.find(o=>o.id===mixedSaved.id);assert.equal(mixedWorkspace.products.find(p=>p.id===mixProduct.id).on_hand,2);assert.equal(mixed.total_amount,'171000');
    const remainingDeliveries=mixed.items.map(i=>({order_item_id:i.id,quantity:1}));await call('/mutations',{action:'deliver_order',key:crypto.randomUUID(),id:mixed.id,version:mixed.version,items:remainingDeliveries,payment_amount:'0'},409);assert.equal((await call('/workspace')).products.find(p=>p.id===mixProduct.id).on_hand,2);
    await call('/mutations',{action:'inventory',key:crypto.randomUUID(),type:'receipt',reason:'supplement',items:[{product_id:mixProduct.id,quantity:1,purchase_price:'10000'}]});
    const mixedDelivery={action:'deliver_order',key:crypto.randomUUID(),id:mixed.id,version:mixed.version,items:remainingDeliveries,payment_amount:'0'};await call('/mutations',mixedDelivery);await call('/mutations',mixedDelivery);
    mixedWorkspace=await call('/workspace');mixed=mixedWorkspace.orders.find(o=>o.id===mixedSaved.id);assert.equal(mixed.total_amount,'190000');assert.equal(mixedWorkspace.products.find(p=>p.id===mixProduct.id).on_hand,0);
    const giftLine=mixed.items.find(i=>i.item_kind==='gift');
    const giftReturn={action:'return_order',key:crypto.randomUUID(),id:mixed.id,version:mixed.version,reason:'Trả hàng tặng',refund_method:'cash',items:[{order_item_id:giftLine.id,quantity:1,restock_quantity:1}]};
    const returnedGift=await call('/mutations',giftReturn);await call('/mutations',giftReturn);mixedWorkspace=await call('/workspace');mixed=mixedWorkspace.orders.find(o=>o.id===mixedSaved.id);assert.equal(mixed.returns.find(r=>r.id===returnedGift.return_id).refund_amount,'0');assert.equal(mixedWorkspace.products.find(p=>p.id===mixProduct.id).on_hand,1);
    await call('/mutations',{...giftReturn,key:crypto.randomUUID(),version:mixed.version},409);
    const soldLine=mixed.items.find(i=>i.item_kind==='sale');const soldReturn=await call('/mutations',{action:'return_order',key:crypto.randomUUID(),id:mixed.id,version:mixed.version,reason:'Trả hàng bán',refund_method:'cash',items:[{order_item_id:soldLine.id,quantity:1,restock_quantity:1}]});
    mixedWorkspace=await call('/workspace');mixed=mixedWorkspace.orders.find(o=>o.id===mixedSaved.id);assert.equal(mixed.returns.find(r=>r.id===soldReturn.return_id).refund_amount,'19000');assert.equal(mixedWorkspace.products.find(p=>p.id===mixProduct.id).on_hand,2);
    const staffDirectory=await (await fetch(base+'/workspace',{headers:{Authorization:'Bearer '+changedStaffSession.access_token}})).json();assert.ok(staffDirectory.users.length>=2);assert.ok(staffDirectory.salespeople.some(u=>u.id===signed.user.id));assert.ok(staffDirectory.products.every(p=>!('fixed_cost' in p)));
    assert.ok(staffDirectory.orders.some(o=>o.id===first.id),'Staff can read admin orders');
    assert.ok(staffDirectory.orders.some(o=>o.id===soldOrder.id),'Staff can read admin sales');
    assert.doesNotMatch(JSON.stringify(staffDirectory),/fixed_cost|unit_cost_snapshot|password_hash/);
    const sharedStaffCall=async(payload,expected=200,url='/mutations')=>{const response=await fetch(base+url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+changedStaffSession.access_token},body:JSON.stringify({key:crypto.randomUUID(),...payload})});const result=await response.json();assert.equal(response.status,expected,JSON.stringify(result));return result;};
    const parityProduct=await call('/mutations',{action:'product',key:crypto.randomUUID(),sku:'PARITY-API',name:'PARITY-API',glass_type:'other',brand:'other',models:[],sale_price:'12345',wholesale_price:'11000',fixed_cost:'4321',active:true});
    await call('/mutations',{action:'inventory',key:crypto.randomUUID(),type:'opening',reason:'parity',items:[{product_id:parityProduct.id,quantity:20}]});
    const freshOrder=async()=>{const draft=await call('/mutations',{action:'save_draft',key:crypto.randomUUID(),customer_name:'Admin parity',customer_phone:'123',items:[{product_id:parityProduct.id,quantity:2}]});return (await call('/workspace')).orders.find(o=>o.id===draft.id);};
    for(const action of ['delete_draft','confirm_order','order_date','save_draft']){const foreignDraft=await freshOrder();const fields=action==='order_date'?{ordered_at:'2026-10-15T10:00:00+07:00'}:action==='save_draft'?{order_code:foreignDraft.order_no,customer_name:'Foreign edit',customer_phone:'123',items:[{product_id:parityProduct.id,quantity:1}]}:action==='confirm_order'?{payment_method:'cash'}:{};await sharedStaffCall({action,id:foreignDraft.id,version:foreignDraft.version,...fields});}
    await sharedStaffCall({action:'payment',order_id:soldOrder.id,amount:'1',method:'cash'},200,'/orders/features');
    let parity=(await call('/workspace')).products.find(p=>p.id===parityProduct.id);
    const parityFields={action:'product',id:parity.id,version:parity.version,sku:parity.sku,name:parity.name,glass_type:parity.glass_type,models:[],brand:'other',sale_price:'13000',wholesale_price:'12000',active:true};
    await sharedStaffCall(parityFields);parity=(await call('/workspace')).products.find(p=>p.id===parity.id);assert.equal(parity.fixed_cost,'4321');
    await sharedStaffCall({...parityFields,version:parity.version,fixed_cost:'0'},403);
    await sharedStaffCall({action:'inventory',type:'opening',reason:'bypass',items:[{product_id:parity.id,quantity:1}]},403);
    await sharedStaffCall({action:'import_products',items:[]},403);
    await sharedStaffCall({action:'reset',id:signed.user.id,password:'BlockedReset_123!'},403,'/staff');
    const cancelTarget=await freshOrder();await sharedStaffCall({action:'confirm_order',id:cancelTarget.id,version:cancelTarget.version,payment_method:'cash'});
    const cancelCurrent=(await call('/workspace')).orders.find(o=>o.id===cancelTarget.id);await sharedStaffCall({action:'cancel_order',id:cancelCurrent.id,version:cancelCurrent.version,reason:'parity cancel',refund_method:'cash'});
    const staffCreated=await sharedStaffCall({...parityFields,id:null,sku:'STAFF-ZERO-STOCK',name:'STAFF-ZERO-STOCK',role:'admin'});
    const createdRow=(await call('/workspace')).products.find(p=>p.id===staffCreated.id);assert.equal(createdRow.fixed_cost,'0');assert.equal(createdRow.on_hand,0);
    await sharedStaffCall({id:createdRow.id,version:createdRow.version},200,'/products/delete');
    const staffCustomer=await sharedStaffCall({name:'Staff customer',phone:'0901777888',customer_type:'retail'},200,'/customers');
    await sharedStaffCall({action:'delete',id:staffCustomer.id},200,'/customers');
    const brand=await sharedStaffCall({action:'glass_brand',name:'Staff Brand'});assert.ok(brand.id);
    await sharedStaffCall({action:'create',display_name:'Staff managed',login_name:'staffmanaged',password:'StaffManaged_123!',role:'admin'},403,'/staff');
    const newAccount=await call('/staff',{action:'create',display_name:'Staff managed',login_name:'staffmanaged',password:'StaffManaged_123!',role:'admin'});
    assert.equal((await pool.query('SELECT role FROM app_users WHERE id=?',[newAccount.id]))[0][0].role,'staff');
    await sharedStaffCall({action:'reset',id:newAccount.id,password:'StaffManaged_456!'},403,'/staff');
    await sharedStaffCall({action:'staff_state',id:newAccount.id,active:false},403);
    await sharedStaffCall({action:'delete',id:newAccount.id},403,'/staff');
    await call('/mutations',{action:'staff_state',id:newAccount.id,active:false,key:crypto.randomUUID()});
    await call('/staff',{action:'delete',id:newAccount.id});
    await sharedStaffCall({action:'staff_state',id:signed.user.id,active:false},403);
    const foreignReturn=await freshOrder();await sharedStaffCall({action:'confirm_order',id:foreignReturn.id,version:foreignReturn.version,payment_method:'cash'});
    let returnCurrent=(await call('/workspace')).orders.find(o=>o.id===foreignReturn.id);
    const staffReturn=await sharedStaffCall({action:'return_order',id:returnCurrent.id,version:returnCurrent.version,reason:'Staff return',refund_method:'cash',items:[{order_item_id:returnCurrent.items[0].id,quantity:1,restock_quantity:1}]});
    const staffExchange=await sharedStaffCall({action:'exchange',return_id:staffReturn.return_id});
    const staffExchangeAgain=await sharedStaffCall({action:'exchange',return_id:staffReturn.return_id});assert.equal(staffExchangeAgain.id,staffExchange.id);
    assert.equal((await call('/workspace')).orders.find(o=>o.id===staffExchange.id).exchange_return_id,staffReturn.return_id);
    const foreignShort=await freshOrder();await call('/orders/business',{order_id:foreignShort.id,fulfillment_status:'short',missing_summary:'Giao sau 1'});
    let shortCurrent=(await call('/workspace')).orders.find(o=>o.id===foreignShort.id);
    await sharedStaffCall({action:'confirm_order',id:shortCurrent.id,version:shortCurrent.version,payment_method:'cash',deliveries:[{order_item_id:shortCurrent.items[0].id,quantity:1}]});
    shortCurrent=(await call('/workspace')).orders.find(o=>o.id===foreignShort.id);
    await sharedStaffCall({action:'deliver_order',id:shortCurrent.id,version:shortCurrent.version,items:[{order_item_id:shortCurrent.items[0].id,quantity:1}],payment_amount:'0'});
    const staffReport=await sharedStaffCall({from:'2026-01-01',to:'2026-12-31',brand:'all'},200,'/reports');
    assert.doesNotMatch(JSON.stringify(staffReport),/fixed_cost|unit_cost|"cost"|"profit"|stock_value|unit_purchase_price/);
    const staffHistory=await sharedStaffCall({action:'history',product_id:parityProduct.id},200,'/query');assert.doesNotMatch(JSON.stringify(staffHistory),/fixed_cost|unit_cost|purchase_price/);
    const sharedOwn=await sharedStaffCall({action:'save_draft',order_code:'STAFF-SHARED-OWN',customer_name:'Staff own',customer_phone:'123',items:[{product_id:product.id,quantity:1}]},200);
    assert.ok((await call('/workspace')).orders.some(o=>o.id===sharedOwn.id),'Admin sees staff orders');
    // Shared catalog price: independent API readers, historical snapshots, tier/cost isolation.
    const beforeShared=await call('/workspace');
    const historical=beforeShared.orders.find(o=>o.id===soldOrder.id);
    const sharedPayload={glass_type:'clear',price_field:'sale_price',unit_price:'15000'};
    await sharedStaffCall(sharedPayload,200,'/products/bulk-price');
    await call('/products/bulk-price',sharedPayload);
    const sharedCatalog=await call('/workspace');
    for(const p of beforeShared.products.filter(p=>['clear','full_border'].includes(p.glass_type)&&p.active)){
      const next=sharedCatalog.products.find(row=>row.id===p.id);
      assert.equal(next.sale_price,'15000');assert.equal(next.wholesale_price,p.wholesale_price);assert.equal(next.fixed_cost,p.fixed_cost);assert.equal(next.on_hand,p.on_hand);
      assert.equal(next.price_version,p.price_version+(p.sale_price==='15000'?0:1));
    }
    assert.deepEqual(sharedCatalog.orders.find(o=>o.id===soldOrder.id),historical);
    assert.deepEqual(sharedCatalog.customer_prices,beforeShared.customer_prices);
    await call('/products/bulk-price',sharedPayload);
    assert.deepEqual((await call('/workspace')).products.map(p=>p.price_version),sharedCatalog.products.map(p=>p.price_version));
    const remoteRead=await fetch(base+'/workspace',{headers:{Authorization:'Bearer '+changedStaffSession.access_token}});
    const remoteCatalog=await remoteRead.json();assert.equal(remoteRead.status,200);assert.equal(remoteCatalog.products.find(p=>p.id===product.id).sale_price,'15000');
    await call('/products/bulk-price',{...sharedPayload,price_field:'fixed_cost'},400);
    await call('/products/bulk-price',{...sharedPayload,unit_price:'-1'},400);
    // Selection order is persisted, rather than derived from SKU or random UUIDs.
    const positionProducts=[];
    for(const sku of ['Z-POSITION','A-POSITION']){
      const p=await call('/mutations',{action:'product',key:crypto.randomUUID(),sku,name:sku,glass_type:'clear',brand:'Apple',models:[],sale_price:'10000',fixed_cost:'5000',active:true});positionProducts.push(p);
      await call('/mutations',{action:'inventory',key:crypto.randomUUID(),type:'opening',reason:'position test',items:[{product_id:p.id,quantity:10}]});
    }
    const positionInput=[{product_id:positionProducts[0].id,quantity:2,item_kind:'sale'},{product_id:positionProducts[1].id,quantity:1,item_kind:'sale'},{product_id:positionProducts[0].id,quantity:1,item_kind:'sample'},{product_id:positionProducts[0].id,quantity:1,item_kind:'gift'}];
    const positionPayload={action:'save_draft',order_code:'POSITION-API',customer_name:'Order',customer_phone:'0901231234',items:positionInput};
    const positioned=await sharedStaffCall(positionPayload,200);let positionView=(await call('/workspace')).orders.find(o=>o.id===positioned.id);
    const identities=items=>items.map(i=>i.product_id+':'+i.item_kind);
    assert.deepEqual(identities(positionView.items),identities(positionInput));
    const newPositionInput=[positionInput[0],positionInput[2],positionInput[3],positionInput[1]];
    const editPosition={...positionPayload,key:crypto.randomUUID(),id:positioned.id,version:positionView.version,items:newPositionInput};
    await sharedStaffCall(editPosition,200);positionView=(await call('/workspace')).orders.find(o=>o.id===positioned.id);const positionOnce=structuredClone(positionView);await sharedStaffCall(editPosition,200);assert.deepEqual((await call('/workspace')).orders.find(o=>o.id===positioned.id),positionOnce);
    assert.deepEqual(identities(positionView.items),identities(newPositionInput));
    await sharedStaffCall({...editPosition,key:crypto.randomUUID()},409);
    const positionConfirm={action:'confirm_order',key:crypto.randomUUID(),id:positionView.id,version:positionView.version,payment_method:'cash'};await sharedStaffCall(positionConfirm,200);await sharedStaffCall(positionConfirm,200);
    positionView=(await call('/workspace')).orders.find(o=>o.id===positioned.id);assert.deepEqual(identities(positionView.items),identities(newPositionInput));assert.equal(positionView.total_amount,'30000');assert.equal(positionView.deliveries.length,1);assert.deepEqual(positionView.deliveries[0].items.map(i=>i.order_item_id),positionView.items.map(i=>i.id));
    const afterPosition=await call('/workspace');assert.equal(afterPosition.products.find(p=>p.id===positionProducts[0].id).on_hand,6);assert.equal(afterPosition.products.find(p=>p.id===positionProducts[1].id).on_hand,9);
    // Unsold SKUs remain editable after opening/receipts and draft creation/deletion.
    const renameFields={action:'product',sku:'RENAME-UNSOLD',name:'RENAME-UNSOLD',glass_type:'clear',models:['iPhone 18 Pro Max'],brand:'Apple',sale_price:'7000',wholesale_price:'6500',fixed_cost:'4651',active:true};
    const renameProduct=await call('/mutations',{...renameFields,key:crypto.randomUUID()});
    await call('/mutations',{action:'inventory',key:crypto.randomUUID(),type:'opening',reason:'rename opening',items:[{product_id:renameProduct.id,quantity:5}]});
    await call('/mutations',{action:'inventory',key:crypto.randomUUID(),type:'receipt',reason:'rename receipt',items:[{product_id:renameProduct.id,quantity:5,purchase_price:'4800'}]});
    const reusePayload={action:'save_draft',order_code:'894-REUSE',customer_name:'Reuse customer',customer_phone:'0',items:[{product_id:renameProduct.id,quantity:2}]};
    const deletedDraft=await call('/mutations',{...reusePayload,key:crypto.randomUUID()});
    const renameVersion=async()=>(await call('/workspace')).products.find(p=>p.id===renameProduct.id).version;
    await sharedStaffCall({...renameFields,id:renameProduct.id,version:await renameVersion(),sku:'RENAME-WITH-DRAFT',fixed_cost:undefined});
    let oldDraft=(await call('/workspace')).orders.find(o=>o.id===deletedDraft.id);
    const deleteCommand={action:'delete_draft',id:oldDraft.id,version:oldDraft.version,key:crypto.randomUUID()};await sharedStaffCall(deleteCommand);await sharedStaffCall(deleteCommand);
    // Re-running a partially completed migration preserves archived codes and all data.
    await pool.query("DELETE FROM schema_migrations WHERE version='009_reuse_deleted_draft_codes'");await migrate();await migrate();
    await call('/mutations',{...renameFields,key:crypto.randomUUID(),id:renameProduct.id,version:await renameVersion(),sku:'RENAME-FINAL'});
    const beforeReuse=(await call('/workspace')).products.find(p=>p.id===renameProduct.id);assert.equal(beforeReuse.on_hand,10);assert.equal(beforeReuse.fixed_cost,'4651');
    const [receiptSnapshots]=await pool.query('SELECT sku_snapshot FROM inventory_document_items WHERE product_id=?',[renameProduct.id]);assert.ok(receiptSnapshots.every(i=>i.sku_snapshot==='RENAME-UNSOLD'));
    const [[archivedDraft]]=await pool.query('SELECT status,order_code FROM sales_orders WHERE id=?',[deletedDraft.id]);assert.equal(archivedDraft.status,'deleted');assert.equal(archivedDraft.order_code,'894-REUSE');
    const reused=await sharedStaffCall({...reusePayload,order_code:'894-reuse'});assert.notEqual(reused.id,deletedDraft.id);
    await call('/mutations',{...reusePayload,key:crypto.randomUUID()},409);
    let reusedView=(await call('/workspace')).orders.find(o=>o.id===reused.id);assert.equal(reusedView.items[0].product_id,renameProduct.id);
    await sharedStaffCall({action:'confirm_order',id:reused.id,version:reusedView.version,payment_method:'cash'});
    await call('/mutations',{...renameFields,key:crypto.randomUUID(),id:renameProduct.id,version:await renameVersion(),sku:'RENAME-SOLD-ALLOWED'});
    reusedView=(await call('/workspace')).orders.find(o=>o.id===reused.id);assert.equal(reusedView.items[0].sku_snapshot,'RENAME-FINAL');
    await call('/mutations',{action:'delete_draft',key:crypto.randomUUID(),id:reused.id,version:reusedView.version},409);
    await call('/mutations',{action:'cancel_order',key:crypto.randomUUID(),id:reused.id,reason:'test preserve sold code',refund_method:'cash'});
    await call('/mutations',{...reusePayload,key:crypto.randomUUID()},409);
    await call('/mutations',{...renameFields,key:crypto.randomUUID(),id:renameProduct.id,version:await renameVersion(),sku:'RENAME-CANCELLED-ALLOWED'});
    // A database unique index still protects simultaneous requests, not just the precheck.
    const simultaneous=await Promise.all(['RACE-REUSE','race-reuse'].map(order_code=>fetch(base+'/mutations',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({...reusePayload,order_code,key:crypto.randomUUID()})})));
    assert.deepEqual(simultaneous.map(r=>r.status).sort(),[200,409]);
    for(let round=0;round<12;round++){
      const code=`RACE-REPEAT-${round}`;
      const attempts=await Promise.all([code,code.toLowerCase()].map((order_code,index)=>fetch(base+'/mutations',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({...reusePayload,order_code,key:crypto.randomUUID(),items:[{product_id:round%2?positionProducts[index].id:renameProduct.id,quantity:1}]})})));
      assert.deepEqual(attempts.map(r=>r.status).sort(),[200,409]);
      const loser=await attempts.find(r=>r.status===409).json();assert.equal(loser.error,'ORDER_CODE_EXISTS');
    }
    // The report must use manual order codes on sale, supplement, return and cancel.
    const reportProduct=await call('/mutations',{action:'product',key:crypto.randomUUID(),sku:'REPORT-MANUAL',name:'REPORT-MANUAL',glass_type:'premium_borderless',models:[],brand:'Apple',sale_price:'10000',fixed_cost:'1234',active:true});
    await call('/mutations',{action:'inventory',key:crypto.randomUUID(),type:'opening',reason:'report fixture',items:[{product_id:reportProduct.id,quantity:5}]});
    const reportDraft=await call('/mutations',{action:'save_draft',key:crypto.randomUUID(),order_code:'899',customer_name:'Report code',customer_phone:'0',items:[{product_id:reportProduct.id,quantity:3}]});
    let reportOrder=(await call('/workspace')).orders.find(o=>o.id===reportDraft.id);
    await call('/orders/business',{order_id:reportOrder.id,fulfillment_status:'short',missing_summary:'Report partial delivery',sales_user_id:signed.user.id});
    await call('/mutations',{action:'confirm_order',key:crypto.randomUUID(),id:reportOrder.id,version:reportOrder.version,payment_method:'cash',deliveries:[{order_item_id:reportOrder.items[0].id,quantity:2}]});
    reportOrder=(await call('/workspace')).orders.find(o=>o.id===reportDraft.id);
    await call('/mutations',{action:'deliver_order',key:crypto.randomUUID(),id:reportOrder.id,version:reportOrder.version,items:[{order_item_id:reportOrder.items[0].id,quantity:1}],payment_amount:'0'});
    reportOrder=(await call('/workspace')).orders.find(o=>o.id===reportDraft.id);
    await call('/mutations',{action:'return_order',key:crypto.randomUUID(),id:reportOrder.id,version:reportOrder.version,reason:'Report return',refund_method:'cash',items:[{order_item_id:reportOrder.items[0].id,quantity:1,restock_quantity:1}]});
    const reportPeriod={from:'2026-01-01',to:'2026-12-31',brand:'all'};
    const manualReport=await call('/reports',reportPeriod);
    const manualMoves=manualReport.movements.filter(m=>m.sku==='REPORT-MANUAL');
    assert.equal(manualMoves.length,4);assert.equal(manualMoves.filter(m=>m.movement_type==='sale').length,2);
    assert.ok(manualMoves.filter(m=>m.movement_type!=='opening').every(m=>m.order_no==='899'));
    assert.equal(manualMoves.find(m=>m.movement_type==='opening').order_no,null);
    assert.ok(manualMoves.every(m=>m.glass_type==='premium_borderless'));
    assert.ok(manualReport.movements.some(m=>m.movement_type==='cancel'&&m.order_no===cancelCurrent.order_no));
    const staffManualReport=await sharedStaffCall(reportPeriod,200,'/reports');
    assert.ok(staffManualReport.movements.filter(m=>m.sku==='REPORT-MANUAL'&&m.movement_type!=='opening').every(m=>m.order_no==='899'));
    assert.doesNotMatch(JSON.stringify(staffManualReport),/unit_cost|"cost"|"profit"|internal_order_no|order_code/);
    const [[legacyReportOrder]]=await pool.query('SELECT order_no FROM sales_orders WHERE id=?',[reportOrder.id]);
    await pool.query('UPDATE sales_orders SET order_code=NULL WHERE id=?',[reportOrder.id]);
    const fallbackReport=await call('/reports',reportPeriod);
    assert.ok(fallbackReport.movements.filter(m=>m.sku==='REPORT-MANUAL'&&m.movement_type!=='opening').every(m=>m.order_no===`DH-${String(legacyReportOrder.order_no).padStart(5,'0')}`));
    assert.equal(fallbackReport.revenue,manualReport.revenue);assert.equal(fallbackReport.stock,manualReport.stock);
    await pool.query('UPDATE sales_orders SET order_code=? WHERE id=?',['899',reportOrder.id]);
    // Manual codes are text: preserve leading zeros, a DH prefix and punctuation.
    for(const code of ['000899','DH-CUSTOM-899',"ĐƠN'899/A"]){
      const draft=await call('/mutations',{action:'save_draft',key:crypto.randomUUID(),order_code:code,customer_name:'Report exact code',customer_phone:'0',items:[{product_id:reportProduct.id,quantity:1}]});
      const current=(await call('/workspace')).orders.find(o=>o.id===draft.id);
      assert.equal(current.order_no,code);
      await call('/mutations',{action:'confirm_order',key:crypto.randomUUID(),id:current.id,version:current.version,payment_method:'cash'});
      const result=await call('/reports',reportPeriod);
      assert.equal(result.movements.filter(m=>m.sku==='REPORT-MANUAL'&&m.order_no===code&&m.movement_type==='sale').length,1);
    }
    const [databaseMoves]=await pool.query(`SELECT m.movement_type,m.quantity_delta,m.balance_after,o.order_code,o.order_no
      FROM inventory_movements m LEFT JOIN sales_return_items ri ON ri.id=m.return_item_id
      LEFT JOIN sales_order_items i ON i.id=COALESCE(m.sale_order_item_id,ri.order_item_id)
      LEFT JOIN sales_orders o ON o.id=i.order_id WHERE m.product_id=?`,[reportProduct.id]);
    const reconciledReport=await call('/reports',reportPeriod);
    const normalizeMove=m=>[m.movement_type,Number(m.quantity_delta),Number(m.balance_after),m.order_no||null];
    const expectedMoves=databaseMoves.map(m=>normalizeMove({...m,order_no:m.order_code||(m.order_no?`DH-${String(m.order_no).padStart(5,'0')}`:null)}));
    const actualMoves=reconciledReport.movements.filter(m=>m.sku==='REPORT-MANUAL').map(normalizeMove);
    assert.deepEqual(actualMoves.sort(),expectedMoves.sort(),'report must neither lose nor duplicate stock movements');
    // Unknown phone 0 must not collapse distinct customers or lose draft links.
    const customerDetails={customer_id:null,customer_type:'retail',customer_address:'Test address',fulfillment_status:'complete',sales_user_id:signed.user.id};
    const customerDraft=async(name,details=customerDetails)=>call('/mutations',{action:'save_draft',key:crypto.randomUUID(),order_code:crypto.randomUUID(),customer_name:name,customer_phone:'0',items:[{product_id:reportProduct.id,quantity:1}],sale_details:details});
    const savedCustomerOrders=[];
    for(const name of ['Identity An','Identity Ân','Identity Chau'])savedCustomerOrders.push(await customerDraft(name));
    let customerView=await call('/workspace');
    const chosen=customerView.orders.filter(o=>savedCustomerOrders.some(x=>x.id===o.id));
    assert.equal(new Set(chosen.map(o=>o.customer_id)).size,3);
    for(const o of chosen)assert.equal(customerView.customers.find(c=>c.id===o.customer_id).name,o.customer_name);
    const anOrder=chosen.find(o=>o.customer_name==='Identity An');
    await call('/mutations',{action:'save_draft',key:crypto.randomUUID(),id:anOrder.id,version:anOrder.version,order_code:anOrder.order_no,customer_name:anOrder.customer_name,customer_phone:'0',items:[{product_id:reportProduct.id,quantity:2}],sale_details:{...customerDetails,customer_id:anOrder.customer_id}});
    assert.equal((await call('/workspace')).orders.find(o=>o.id===anOrder.id).customer_id,anOrder.customer_id);
    const different=await customerDraft('Identity Dung',{...customerDetails,customer_id:anOrder.customer_id});
    customerView=await call('/workspace');assert.notEqual(customerView.orders.find(o=>o.id===different.id).customer_id,anOrder.customer_id);
    assert.equal(customerView.customers.find(c=>c.id===anOrder.customer_id).name,'Identity An');
    const standalone=await Promise.all(['Concurrent A','Concurrent B'].map(name=>sharedStaffCall({name,phone:'0',customer_type:'retail'},200,'/customers')));
    assert.notEqual(standalone[0].id,standalone[1].id);
    const sameCustomer=await Promise.all([1,2].map(()=>sharedStaffCall({name:'Concurrent Same',phone:'0',customer_type:'retail'},200,'/customers')));
    assert.equal(sameCustomer[0].id,sameCustomer[1].id);
    const accents=await Promise.all(['Identity An accent','Identity Ân accent'].map(name=>sharedStaffCall({name,phone:'0',customer_type:'retail'},200,'/customers')));
    assert.notEqual(accents[0].id,accents[1].id,'Vietnamese diacritics identify different unnamed-phone customers');
    // Simulate historical overwritten links, then exercise interrupted migration recovery.
    await pool.query('UPDATE sales_orders SET customer_id=? WHERE id IN (?,?)',[anOrder.customer_id,savedCustomerOrders[1].id,savedCustomerOrders[2].id]);
    await pool.query('DELETE FROM customers WHERE id IN (?,?)',chosen.filter(o=>o.id!==anOrder.id).map(o=>o.customer_id));
    const [beforeRecovery]=await pool.query('SELECT id,customer_name,customer_phone,customer_address,total_amount,version,updated_at FROM sales_orders ORDER BY id');
    const [stockBeforeRecovery]=await pool.query('SELECT id,on_hand,fixed_cost FROM products ORDER BY id');
    for(let attempt=0;attempt<2;attempt++){await pool.query("DELETE FROM schema_migrations WHERE version='010_customer_placeholder_identity'");await migrate();}
    const [afterRecovery]=await pool.query('SELECT id,customer_name,customer_phone,customer_address,total_amount,version,updated_at FROM sales_orders ORDER BY id');
    assert.deepEqual(afterRecovery,beforeRecovery);
    assert.deepEqual((await pool.query('SELECT id,on_hand,fixed_cost FROM products ORDER BY id'))[0],stockBeforeRecovery);
    customerView=await call('/workspace');
    for(const id of savedCustomerOrders.map(o=>o.id)){const o=customerView.orders.find(x=>x.id===id);assert.equal(customerView.customers.find(c=>c.id===o.customer_id).name,o.customer_name);}
    // Regression: 8 sales on the business day + a draft for the next day.
    // These are synthetic fixtures, not the customer's orders/database.
    const businessDay='2040-10-22',nextDay='2040-10-23',reportBrand='Report date regression';
    const expectedAmounts=[0,0,660000,760000,210000,6930000,1860000,630000];
    const businessOrders=[];
    for(const [index,amount] of expectedAmounts.entries()){
      const fee=index===2?30000:0;
      const product=await call('/mutations',{action:'product',key:crypto.randomUUID(),sku:`DATE-REPORT-${index}`,name:`DATE-REPORT-${index}`,glass_type:'clear',models:[],brand:reportBrand,sale_price:String(amount-fee),fixed_cost:'1000',active:true});
      await call('/mutations',{action:'inventory',key:crypto.randomUUID(),type:'opening',reason:'Synthetic reporting regression',items:[{product_id:product.id,quantity:10}]});
      const draft=await call('/mutations',{action:'save_draft',key:crypto.randomUUID(),order_code:`DATE-REPORT-${index}`,ordered_at:`${businessDay}T${index===0?'00:00':'23:59'}:00+07:00`,extra_cost:String(fee),customer_name:'Synthetic report',customer_phone:'0',items:[{product_id:product.id,quantity:index===3?2:1,item_kind:index<2?'sample':'sale'}]});
      let order=(await call('/workspace')).orders.find(o=>o.id===draft.id);
      if(index===3)await call('/orders/business',{order_id:order.id,fulfillment_status:'short',missing_summary:'One item remains',sales_user_id:signed.user.id});
      await call('/mutations',{action:'confirm_order',key:crypto.randomUUID(),id:order.id,version:order.version,payment_method:'cash',...(index===3?{deliveries:[{order_item_id:order.items[0].id,quantity:1}]}:{})});
      order=(await call('/workspace')).orders.find(o=>o.id===draft.id);
      assert.equal(order.total_amount,String(amount));assert.equal(order.paid_amount,'0');
      businessOrders.push(order);
    }
    const periodDay={from:businessDay,to:businessDay,brand:reportBrand};
    const futureDraft=await call('/mutations',{action:'save_draft',key:crypto.randomUUID(),order_code:'DATE-REPORT-FUTURE-DRAFT',ordered_at:`${nextDay}T10:00:00+07:00`,extra_cost:'99999',customer_name:'Future draft',customer_phone:'0',items:[{product_id:businessOrders[7].items[0].product_id,quantity:1}]});
    const sameDayDraft=await call('/mutations',{action:'save_draft',key:crypto.randomUUID(),order_code:'DATE-REPORT-SAME-DRAFT',ordered_at:`${businessDay}T10:00:00+07:00`,customer_name:'Same day draft',customer_phone:'0',items:[{product_id:businessOrders[7].items[0].product_id,quantity:1}]});
    const reportState=async()=>{
      const result=await call('/reports',periodDay);
      assert.equal(result.order_count,8);assert.equal(result.revenue,'11050000');
      assert.equal(result.product_revenue,'11020000');assert.equal(result.other_charges,'30000');
      assert.equal(result.order_value,result.revenue);assert.equal(result.sold,8);
      assert.equal(result.cost,'8000');assert.equal(result.profit,'11042000');
      assert.equal(result.sales.reduce((sum,r)=>sum+BigInt(r.revenue),0n),11020000n);
      const staffResult=await sharedStaffCall(periodDay,200,'/reports');
      assert.equal(staffResult.revenue,result.revenue);assert.equal(staffResult.order_count,8);
      assert.ok(!('cost' in staffResult)&&!('profit' in staffResult));
      return result;
    };
    const baselineReport=await reportState();
    // A second workstation confirms a multi-line order halfway through report
    // SELECTs. This request must remain entirely on the old snapshot; the next
    // request must see the complete new order, including its fee exactly once.
    const raceSaved=await call('/mutations',{action:'save_draft',key:crypto.randomUUID(),order_code:'REPORT-SNAPSHOT-RACE',ordered_at:`${businessDay}T12:00:00+07:00`,extra_cost:'1234',customer_name:'Snapshot race',customer_phone:'0',items:[
      {product_id:businessOrders[7].items[0].product_id,quantity:1},
      {product_id:businessOrders[7].items[0].product_id,quantity:1,item_kind:'gift'},
      {product_id:businessOrders[6].items[0].product_id,quantity:1,item_kind:'sample'},
    ]});
    const raceDraft=(await call('/workspace')).orders.find(o=>o.id===raceSaved.id);
    const originalGetConnection=pool.getConnection;
    let interleaved=false;
    pool.getConnection=async function(...args){
      const connection=await originalGetConnection.apply(this,args);
      const query=connection.query,release=connection.release;
      connection.query=async function(...queryArgs){
        const result=await query.apply(this,queryArgs);
        if(!interleaved&&typeof queryArgs[0]==='string'&&queryArgs[0].startsWith('SELECT p.sku,p.name,p.glass_type,')&&queryArgs[0].includes('unit_cost_snapshot')){
          interleaved=true;
          await call('/mutations',{action:'confirm_order',key:crypto.randomUUID(),id:raceDraft.id,version:raceDraft.version,payment_method:'cash'});
        }
        return result;
      };
      connection.release=function(){this.query=query;this.release=release;return release.call(this);};
      return connection;
    };
    try{
      const consistentReport=await call('/reports',periodDay);
      assert.ok(interleaved,'must actually confirm another order between report SELECTs');
      assert.equal(consistentReport.order_count,8);assert.equal(consistentReport.revenue,'11050000');
      assert.equal(consistentReport.other_charges,'30000');assert.equal(consistentReport.stock,baselineReport.stock);
    }finally{pool.getConnection=originalGetConnection;}
    const afterRace=await call('/reports',periodDay);
    assert.equal(afterRace.order_count,9);assert.equal(afterRace.revenue,'11681234');
    assert.equal(afterRace.other_charges,'31234');assert.equal(afterRace.stock,baselineReport.stock-3);
    let raceConfirmed=(await call('/workspace')).orders.find(o=>o.id===raceSaved.id);
    await call('/mutations',{action:'cancel_order',key:crypto.randomUUID(),id:raceConfirmed.id,version:raceConfirmed.version,reason:'Finish snapshot regression',refund_method:'cash'});
    await reportState();
    assert.equal((await call('/reports',{...periodDay,from:nextDay,to:nextDay})).revenue,'0');
    // Paid, partially paid and unpaid all contribute the same order value.
    await call('/orders/features',{action:'payment',order_id:businessOrders[2].id,amount:'1000',method:'cash'});
    await call('/orders/features',{action:'payment',order_id:businessOrders[7].id,amount:'630000',method:'transfer'});
    await reportState();
    // Even a confirmed order dated tomorrow must never leak into today's report.
    let futureOrder=(await call('/workspace')).orders.find(o=>o.id===futureDraft.id);
    await call('/mutations',{action:'confirm_order',key:crypto.randomUUID(),id:futureOrder.id,version:futureOrder.version,payment_method:'cash'});
    await reportState();
    const tomorrow=await call('/reports',{...periodDay,from:nextDay,to:nextDay});
    assert.equal(tomorrow.order_count,1);assert.equal(tomorrow.revenue,'729999');
    const twoDays=await call('/reports',{...periodDay,to:nextDay});
    assert.equal(twoDays.order_count,9);assert.equal(twoDays.revenue,'11779999');
    // Date edits move both the count and amount; confirmation timestamps stay unchanged.
    let edited=(await call('/workspace')).orders.find(o=>o.id===businessOrders[7].id);
    const confirmedBefore=edited.confirmed_at;
    await call('/mutations',{action:'order_date',key:crypto.randomUUID(),id:edited.id,version:edited.version,ordered_at:`${nextDay}T00:00:00+07:00`});
    assert.equal((await call('/reports',periodDay)).revenue,'10420000');
    edited=(await call('/workspace')).orders.find(o=>o.id===edited.id);assert.equal(edited.confirmed_at,confirmedBefore);
    await call('/mutations',{action:'order_date',key:crypto.randomUUID(),id:edited.id,version:edited.version,ordered_at:`${businessDay}T23:59:00+07:00`});
    await reportState();
    let disposable=(await call('/workspace')).orders.find(o=>o.id===sameDayDraft.id);
    await call('/mutations',{action:'delete_draft',key:crypto.randomUUID(),id:disposable.id,version:disposable.version});
    await reportState();
    // Reports are reads: repeated requests do not mutate order/stock/payment state.
    const [stockSnapshot]=await pool.query('SELECT id,on_hand,fixed_cost FROM products ORDER BY id');
    const [orderSnapshot]=await pool.query('SELECT id,status,total_amount,version,updated_at FROM sales_orders ORDER BY id');
    await reportState();
    assert.deepEqual((await pool.query('SELECT id,on_hand,fixed_cost FROM products ORDER BY id'))[0],stockSnapshot);
    assert.deepEqual((await pool.query('SELECT id,status,total_amount,version,updated_at FROM sales_orders ORDER BY id'))[0],orderSnapshot);
    assert.equal(baselineReport.revenue,'11050000');
    let cancelledBusiness=(await call('/workspace')).orders.find(o=>o.id===businessOrders[6].id);
    await call('/mutations',{action:'cancel_order',key:crypto.randomUUID(),id:cancelledBusiness.id,version:cancelledBusiness.version,reason:'Report cancellation',refund_method:'cash'});
    let adjustedReport=await call('/reports',periodDay);assert.equal(adjustedReport.order_count,7);assert.equal(adjustedReport.revenue,'9190000');
    let returnedBusiness=(await call('/workspace')).orders.find(o=>o.id===businessOrders[4].id);
    await call('/mutations',{action:'return_order',key:crypto.randomUUID(),id:returnedBusiness.id,version:returnedBusiness.version,reason:'Report return',refund_method:'cash',items:[{order_item_id:returnedBusiness.items[0].id,quantity:1,restock_quantity:1}]});
    adjustedReport=await call('/reports',periodDay);assert.equal(adjustedReport.revenue,'8980000');assert.equal(adjustedReport.other_charges,'30000');
    let supplemented=(await call('/workspace')).orders.find(o=>o.id===businessOrders[3].id);
    await call('/mutations',{action:'deliver_order',key:crypto.randomUUID(),id:supplemented.id,version:supplemented.version,items:[{order_item_id:supplemented.items[0].id,quantity:1}],payment_amount:'0'});
    adjustedReport=await call('/reports',periodDay);assert.equal(adjustedReport.revenue,'9740000');assert.equal(adjustedReport.other_charges,'30000');assert.equal(adjustedReport.order_count,7);
    const workspaceSaved=await call('/mutations',{action:'save_draft',key:crypto.randomUUID(),order_code:'WORKSPACE-SNAPSHOT-RACE',ordered_at:'2040-10-24T12:00:00+07:00',extra_cost:'1234',customer_name:'Workspace snapshot',customer_phone:'0',items:[{product_id:businessOrders[7].items[0].product_id,quantity:2}]});
    let workspaceOrder=(await call('/workspace')).orders.find(o=>o.id===workspaceSaved.id);
    await call('/orders/business',{order_id:workspaceOrder.id,fulfillment_status:'short',missing_summary:'Workspace race pending',sales_user_id:signed.user.id});
    await call('/mutations',{action:'confirm_order',key:crypto.randomUUID(),id:workspaceOrder.id,version:workspaceOrder.version,payment_method:'cash',deliveries:[{order_item_id:workspaceOrder.items[0].id,quantity:1}]});
    const beforeWorkspaceRace=await call('/workspace');workspaceOrder=beforeWorkspaceRace.orders.find(o=>o.id===workspaceSaved.id);
    const workspaceProduct=workspaceOrder.items[0].product_id;
    let workspaceInterleaved=false;
    pool.getConnection=async function(...args){
      const connection=await originalGetConnection.apply(this,args);
      const query=connection.query,release=connection.release;
      connection.query=async function(...queryArgs){
        const result=await query.apply(this,queryArgs);
        if(!workspaceInterleaved&&typeof queryArgs[0]==='string'&&queryArgs[0].startsWith('SELECT o.*,creator.display_name')){
          workspaceInterleaved=true;
          await call('/mutations',{action:'deliver_order',key:crypto.randomUUID(),id:workspaceOrder.id,version:workspaceOrder.version,items:[{order_item_id:workspaceOrder.items[0].id,quantity:1}],payment_amount:'1261234',payment_method:'cash'});
        }
        return result;
      };
      connection.release=function(){this.query=query;this.release=release;return release.call(this);};
      return connection;
    };
    try{
      const stableWorkspace=await call('/workspace');
      assert.ok(workspaceInterleaved,'must really deliver and pay between workspace SELECTs');
      const stableOrder=stableWorkspace.orders.find(o=>o.id===workspaceOrder.id);
      assert.equal(stableOrder.total_amount,'631234');assert.equal(stableOrder.paid_amount,'0');assert.equal(stableOrder.outstanding_amount,'631234');
      assert.equal(stableOrder.items[0].delivered_quantity,1);assert.equal(stableOrder.deliveries.length,1);
      assert.equal(stableWorkspace.products.find(p=>p.id===workspaceProduct).on_hand,beforeWorkspaceRace.products.find(p=>p.id===workspaceProduct).on_hand);
    }finally{pool.getConnection=originalGetConnection;}
    const afterWorkspaceRace=await call('/workspace');const latestWorkspaceOrder=afterWorkspaceRace.orders.find(o=>o.id===workspaceOrder.id);
    assert.equal(latestWorkspaceOrder.total_amount,'1261234');assert.equal(latestWorkspaceOrder.paid_amount,'1261234');assert.equal(latestWorkspaceOrder.outstanding_amount,'0');
    assert.equal(latestWorkspaceOrder.items[0].delivered_quantity,2);assert.equal(latestWorkspaceOrder.deliveries.length,2);
    assert.equal(afterWorkspaceRace.products.find(p=>p.id===workspaceProduct).on_hand,beforeWorkspaceRace.products.find(p=>p.id===workspaceProduct).on_hand-1);
    // Cross-module reconciliation: saved orders/drafts, delivery history,
    // payments and inventory must not silently use incompatible totals.
    for(const order of (await call('/workspace')).orders){
      const itemValue=order.items.reduce((sum,item)=>sum+BigInt(item.unit_sale_price)*BigInt(order.status==='draft'?item.quantity:item.delivered_quantity),0n);
      assert.equal(BigInt(order.total_amount),itemValue+BigInt(order.extra_cost),'order/draft value must include its fee once');
      assert.equal(BigInt(order.outstanding_amount)+BigInt(order.paid_amount),BigInt(order.total_amount),'payment ledger is separate from order value');
      if(order.status!=='draft'){
        assert.equal(order.deliveries.reduce((sum,batch)=>sum+BigInt(batch.total_amount),0n),itemValue,'delivery history must reconcile with delivered goods without repeating fees');
      }
    }
    const [draftMovements]=await pool.query(`SELECT m.id FROM inventory_movements m JOIN sales_order_items i ON i.id=m.sale_order_item_id JOIN sales_orders o ON o.id=i.order_id WHERE o.status IN ('draft','deleted')`);
    assert.equal(draftMovements.length,0,'drafts/deleted drafts never move stock');
    const stockReport=await call('/reports',{from:'2026-01-01',to:'2026-12-31',brand:'all'});
    for(const row of stockReport.inventory)assert.equal(row.opening+row.incoming-row.outgoing,row.closing,'inventory reconciliation equation');
    await call('/reports',{from:'2026-02-30',to:'2026-03-02'},400);
    await call('/reports',{from:'2024-01-01',to:'2025-01-01'},400);
    await call('/reports',{from:nextDay,to:businessDay},400);
    // Inventory adjustment: stock ledger changes, never product prices or saved
    // sales/drafts/revenue; version guard protects a second workstation's sale.
    const adjustProduct=await call('/mutations',{action:'product',key:crypto.randomUUID(),sku:'ADJUSTMENT-AUDIT',name:'ADJUSTMENT-AUDIT',glass_type:'other',models:[],brand:'Adjustment audit',sale_price:'10000',fixed_cost:'1234',active:true});
    await call('/mutations',{action:'inventory',key:crypto.randomUUID(),type:'opening',reason:'Adjustment initial test',items:[{product_id:adjustProduct.id,quantity:10}]});
    const adjustDraft=async(code,quantity,extra_cost='0')=>call('/mutations',{action:'save_draft',key:crypto.randomUUID(),order_code:code,ordered_at:'2041-10-24T09:00:00+07:00',extra_cost,customer_name:'Adjustment test',customer_phone:'0',items:[{product_id:adjustProduct.id,quantity}]});
    const soldAdjustment=await adjustDraft('ADJUSTMENT-SOLD',2,'2500');let adjustWs=await call('/workspace');let adjustSold=adjustWs.orders.find(o=>o.id===soldAdjustment.id);
    await call('/mutations',{action:'confirm_order',key:crypto.randomUUID(),id:adjustSold.id,version:adjustSold.version,payment_method:'cash'});
    const pendingAdjustment=await adjustDraft('ADJUSTMENT-PENDING',8);
    const adjustmentPeriod={from:'2041-10-24',to:'2041-10-24',brand:'Adjustment audit'};
    const financialBefore=await call('/reports',adjustmentPeriod);assert.equal(financialBefore.revenue,'22500');
    const [savedBeforeAdjustment]=await pool.query('SELECT id,status,total_amount,ordered_at,version,updated_at FROM sales_orders WHERE id IN (?,?) ORDER BY id',[soldAdjustment.id,pendingAdjustment.id]);
    const stockProduct=async()=>(await call('/workspace')).products.find(p=>p.id===adjustProduct.id);
    let adjustable=await stockProduct();assert.equal(adjustable.on_hand,8);
    const [[docCountBefore]]=await pool.query('SELECT COUNT(*) n FROM inventory_documents');
    for(const reason of ['', '   '])await call('/mutations',{action:'inventory',key:crypto.randomUUID(),type:'adjustment',reason,items:[{product_id:adjustProduct.id,quantity:5,stock_version:adjustable.stock_version}]},400);
    for(const quantity of [-1,1.5,1000001,'invalid'])await call('/mutations',{action:'inventory',key:crypto.randomUUID(),type:'adjustment',reason:'Invalid test',items:[{product_id:adjustProduct.id,quantity,stock_version:adjustable.stock_version}]},400);
    await call('/mutations',{action:'inventory',key:crypto.randomUUID(),type:'adjustment',reason:'Missing version',items:[{product_id:adjustProduct.id,quantity:5}]},409);
    assert.equal((await pool.query('SELECT COUNT(*) n FROM inventory_documents'))[0][0].n,docCountBefore.n);
    const adjustmentReason='Kiểm kê: giảm 3 sản phẩm, hàng thất lạc';
    const decrementRequest={action:'inventory',key:crypto.randomUUID(),type:'adjustment',reason:adjustmentReason,items:[{product_id:adjustProduct.id,quantity:5,stock_version:adjustable.stock_version}]};
    await sharedStaffCall(decrementRequest);const decremented=await stockProduct();assert.equal(decremented.on_hand,5);
    await sharedStaffCall(decrementRequest);assert.equal((await stockProduct()).stock_version,decremented.stock_version,'retry must not apply twice');
    const history=await call('/query',{action:'history',product_id:adjustProduct.id});
    const decreaseMove=history.find(m=>m.movement_type==='adjustment');assert.equal(decreaseMove.quantity_delta,-3);assert.equal(decreaseMove.balance_after,5);assert.equal(decreaseMove.reason,adjustmentReason);assert.ok(decreaseMove.actor_name);
    const adjustmentLogs=(await call('/workspace')).logs;assert.ok(adjustmentLogs.some(log=>log.detail===`adjustment: ${adjustmentReason}`));
    const concurrentAdjustment=await Promise.all([4,3].map(quantity=>fetch(base+'/mutations',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({action:'inventory',key:crypto.randomUUID(),type:'adjustment',reason:'Concurrent adjustment test',items:[{product_id:adjustProduct.id,quantity,stock_version:decremented.stock_version}]})})));
    assert.deepEqual(concurrentAdjustment.map(r=>r.status).sort(),[200,409]);
    adjustable=await stockProduct();assert.ok([3,4].includes(adjustable.on_hand));
    await sharedStaffCall({action:'inventory',key:crypto.randomUUID(),type:'adjustment',reason:'Đối chiếu hết tồn',items:[{product_id:adjustProduct.id,quantity:0,stock_version:adjustable.stock_version}]});
    let pending=(await call('/workspace')).orders.find(o=>o.id===pendingAdjustment.id);
    await call('/mutations',{action:'confirm_order',key:crypto.randomUUID(),id:pending.id,version:pending.version,payment_method:'cash'},409);
    assert.equal((await stockProduct()).on_hand,0);
    assert.deepEqual((await pool.query('SELECT id,status,total_amount,ordered_at,version,updated_at FROM sales_orders WHERE id IN (?,?) ORDER BY id',[soldAdjustment.id,pendingAdjustment.id]))[0],savedBeforeAdjustment,'adjustments never rewrite original order or draft');
    const financialAfter=await call('/reports',adjustmentPeriod);for(const key of ['revenue','cost','profit','other_charges','order_count'])assert.equal(financialAfter[key],financialBefore[key]);
    adjustable=await stockProduct();await sharedStaffCall({action:'inventory',key:crypto.randomUUID(),type:'adjustment',reason:'Tìm lại hàng khi kiểm kê',items:[{product_id:adjustProduct.id,quantity:10,stock_version:adjustable.stock_version}]});
    adjustable=await stockProduct();assert.equal(adjustable.sale_price,'10000');assert.equal(adjustable.fixed_cost,'1234');assert.equal(adjustable.price_version,decremented.price_version);
    const actualDay=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
    const adjustmentReport=await call('/reports',{from:actualDay,to:actualDay,brand:'Adjustment audit'});
    const exportedMove=adjustmentReport.movements.find(m=>m.movement_type==='adjustment'&&m.quantity_delta===-3);assert.equal(exportedMove.reason,adjustmentReason);assert.equal(exportedMove.order_no,null);
    const adjustmentInventory=adjustmentReport.inventory.find(i=>i.sku==='ADJUSTMENT-AUDIT');assert.equal(adjustmentInventory.opening+adjustmentInventory.incoming-adjustmentInventory.outgoing,10);assert.equal(adjustmentInventory.closing,10);
    pending=(await call('/workspace')).orders.find(o=>o.id===pendingAdjustment.id);await call('/mutations',{action:'confirm_order',key:crypto.randomUUID(),id:pending.id,version:pending.version,payment_method:'cash'});assert.equal((await stockProduct()).on_hand,2);
    await sharedStaffCall({action:'inventory',key:crypto.randomUUID(),type:'receipt',reason:'Still forbidden',items:[{product_id:adjustProduct.id,quantity:1,purchase_price:'1'}]},403);
    const staffAdjustedResponse=await fetch(base+'/workspace',{headers:{Authorization:'Bearer '+changedStaffSession.access_token}});assert.equal(staffAdjustedResponse.status,200);
    const staffAdjusted=await staffAdjustedResponse.json();assert.ok(!('fixed_cost'in staffAdjusted.products.find(p=>p.id===adjustProduct.id)));
    // A -> B -> C: one product, reserved old names, immutable sold/draft labels.
    const renameBase={action:'product',name:'ALIAS-A',glass_type:'clear',models:['Redmi 13'],brand:'Alias regression',sale_price:'10000',wholesale_price:'9000',fixed_cost:'1234',active:true};
    const aliasProduct=await call('/mutations',{...renameBase,key:crypto.randomUUID(),sku:'ALIAS-A'});
    await call('/mutations',{action:'inventory',key:crypto.randomUUID(),type:'opening',reason:'Alias test opening',items:[{product_id:aliasProduct.id,quantity:30}]});
    const aliasView=async()=>(await call('/workspace')).products.find(p=>p.id===aliasProduct.id);
    const aliasOrder=async(id)=>(await call('/workspace')).orders.find(o=>o.id===id);
    const savedSold=await call('/mutations',{action:'save_draft',key:crypto.randomUUID(),order_code:'ALIAS-SOLD',ordered_at:'2042-10-28T10:00:00+07:00',extra_cost:'2500',customer_name:'Alias customer',customer_phone:'0',items:[{product_id:aliasProduct.id,quantity:2}]});
    let aliasSold=await aliasOrder(savedSold.id);
    await call('/orders/business',{order_id:aliasSold.id,sales_user_id:signed.user.id,fulfillment_status:'short',missing_summary:'Deliver later'});
    await call('/mutations',{action:'confirm_order',key:crypto.randomUUID(),id:aliasSold.id,version:aliasSold.version,payment_method:'cash',deliveries:[{order_item_id:aliasSold.items[0].id,quantity:1}]});
    const aliasDraftPayload={action:'save_draft',order_code:'ALIAS-DRAFT',ordered_at:'2042-10-29T10:00:00+07:00',customer_name:'Alias draft',customer_phone:'0',items:[{product_id:aliasProduct.id,quantity:2}]};
    const aliasDraft=await call('/mutations',{...aliasDraftPayload,key:crypto.randomUUID()});
    const financialParams={from:'2042-10-28',to:'2042-10-28',brand:'Alias regression'},beforeAliasReport=await call('/reports',financialParams),beforeAliasProduct=await aliasView();
    const renameAlias=async(sku)=>call('/mutations',{...renameBase,key:crypto.randomUUID(),id:aliasProduct.id,version:(await aliasView()).version,sku});
    await renameAlias('ALIAS-B (REDMI13)');await renameAlias('ALIAS-C');
    let aliasCurrent=await aliasView();assert.deepEqual(new Set(aliasCurrent.sku_aliases),new Set(['ALIAS-A','ALIAS-B (REDMI13)']));
    for(const field of ['on_hand','sale_price','wholesale_price','fixed_cost','stock_version','price_version'])assert.equal(aliasCurrent[field],beforeAliasProduct[field]);
    const afterAliasReport=await call('/reports',financialParams);for(const field of ['revenue','cost','profit','order_count','stock'])assert.equal(afterAliasReport[field],beforeAliasReport[field]);
    assert.equal(afterAliasReport.sales[0].sku,'ALIAS-C');assert.ok(afterAliasReport.sales[0].sku_aliases.includes('ALIAS-A'));
    let savedAlias=await aliasOrder(aliasDraft.id);assert.equal(savedAlias.items[0].sku_snapshot,'ALIAS-A');
    await sharedStaffCall({...aliasDraftPayload,id:savedAlias.id,version:savedAlias.version,items:[{product_id:aliasProduct.id,quantity:7,selected_sku:'ALIAS-B (REDMI13)'}]});
    savedAlias=await aliasOrder(aliasDraft.id);assert.equal(savedAlias.items.length,1);assert.equal(savedAlias.items[0].quantity,7);assert.equal(savedAlias.items[0].sku_snapshot,'ALIAS-A');
    await call('/mutations',{...renameBase,key:crypto.randomUUID(),sku:'ALIAS-A'},409);
    const receiveAlias={action:'inventory',key:crypto.randomUUID(),type:'receipt',reason:'Old Excel alias',items:[{sku:'ALIAS-B (REDMI13)',quantity:3,purchase_price:'1000'}]};await call('/mutations',receiveAlias);await call('/mutations',receiveAlias);
    assert.equal((await aliasView()).on_hand,beforeAliasProduct.on_hand+3);
    const aliasImportRow={sku:'ALIAS-A',glass_type:'clear',brand:'Alias regression',glass_brand:'',models:['Redmi 13'],sale_price:'10000',wholesale_price:'9000',fixed_cost:'1234',quantity:0};
    await call('/mutations',{action:'import_products',key:crypto.randomUUID(),items:[aliasImportRow]});
    const [beforeDuplicateImport]=await pool.query('SELECT id,on_hand,fixed_cost,price_version FROM products ORDER BY id');
    await call('/mutations',{action:'import_products',key:crypto.randomUUID(),items:[{...aliasImportRow,quantity:2},{...aliasImportRow,sku:'ALIAS-C',quantity:2}]},400);
    await call('/mutations',{action:'inventory',key:crypto.randomUUID(),type:'receipt',reason:'duplicate aliases',items:[{sku:'ALIAS-A',quantity:1,purchase_price:'1'},{sku:'ALIAS-C',quantity:1,purchase_price:'1'}]},400);
    assert.deepEqual((await pool.query('SELECT id,on_hand,fixed_cost,price_version FROM products ORDER BY id'))[0],beforeDuplicateImport);
    aliasSold=await aliasOrder(savedSold.id);assert.equal(aliasSold.items[0].sku_snapshot,'ALIAS-A');
    await call('/mutations',{action:'deliver_order',key:crypto.randomUUID(),id:aliasSold.id,version:aliasSold.version,items:[{order_item_id:aliasSold.items[0].id,quantity:1}],payment_amount:'0'});
    aliasSold=await aliasOrder(savedSold.id);assert.ok(aliasSold.deliveries.every(batch=>batch.items[0].sku==='ALIAS-A'));
    await call('/mutations',{action:'return_order',key:crypto.randomUUID(),id:aliasSold.id,version:aliasSold.version,reason:'Alias return',refund_method:'cash',items:[{order_item_id:aliasSold.items[0].id,quantity:1,restock_quantity:1}]});
    const aliasHistory=await call('/query',{action:'history',product_id:aliasProduct.id});assert.ok(aliasHistory.some(m=>m.movement_type==='sale'&&m.sku==='ALIAS-A'&&m.current_sku==='ALIAS-C'));assert.ok(aliasHistory.some(m=>m.movement_type==='receipt'&&m.sku==='ALIAS-C'));
    savedAlias=await aliasOrder(aliasDraft.id);await sharedStaffCall({action:'confirm_order',id:savedAlias.id,version:savedAlias.version,payment_method:'cash'});assert.equal((await aliasOrder(aliasDraft.id)).items[0].sku_snapshot,'ALIAS-A');
    const newestAlias=await call('/mutations',{...aliasDraftPayload,order_code:'ALIAS-NEW',key:crypto.randomUUID()});assert.equal((await aliasOrder(newestAlias.id)).items[0].sku_snapshot,'ALIAS-C');
    const lookupAlias=await fetch('http://127.0.0.1:8791/api/glass-lookup?q='+encodeURIComponent('ALIAS-B (REDMI13)'));assert.ok((await lookupAlias.json()).items.some(p=>p.id===aliasProduct.id&&p.sku==='ALIAS-C'));
    const otherAlias=await call('/mutations',{...renameBase,key:crypto.randomUUID(),sku:'ALIAS-OTHER'});
    const sameNameRace=await Promise.all([[aliasProduct.id,(await aliasView()).version],[otherAlias.id,(await call('/workspace')).products.find(p=>p.id===otherAlias.id).version]].map(([id,version])=>fetch(base+'/mutations',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({...renameBase,id,version,sku:'ALIAS-RACE',key:crypto.randomUUID()})})));
    assert.deepEqual(sameNameRace.map(r=>r.status).sort(),[200,409]);
    // A selected in an unsaved cart is valid after another machine renames it.
    const unsavedAlias=await call('/mutations',{...aliasDraftPayload,order_code:'ALIAS-UNSAVED',key:crypto.randomUUID(),items:[{product_id:aliasProduct.id,quantity:3,selected_sku:'ALIAS-B (REDMI13)'},{product_id:aliasProduct.id,quantity:1,item_kind:'gift',selected_sku:'ALIAS-B (REDMI13)'},{product_id:aliasProduct.id,quantity:1,item_kind:'sample',selected_sku:'ALIAS-A'}]});
    assert.deepEqual((await aliasOrder(unsavedAlias.id)).items.map(i=>[i.item_kind,i.sku_snapshot]),[['sale','ALIAS-B (REDMI13)'],['gift','ALIAS-B (REDMI13)'],['sample','ALIAS-A']]);
    await call('/mutations',{...aliasDraftPayload,order_code:'ALIAS-WRONG-OWNER',key:crypto.randomUUID(),items:[{product_id:otherAlias.id,quantity:1,selected_sku:'ALIAS-A'}]},409);
    await renameAlias('ALIAS-A');assert.equal((await aliasView()).sku,'ALIAS-A');assert.ok((await aliasView()).sku_aliases.includes('ALIAS-C'));
    // Cancellation after rename reverses quantities without rewriting the old label.
    let cancelAlias=await aliasOrder(newestAlias.id);const beforeCancelSale=(await aliasView()).on_hand;
    await call('/mutations',{action:'confirm_order',key:crypto.randomUUID(),id:cancelAlias.id,version:cancelAlias.version,payment_method:'cash'});cancelAlias=await aliasOrder(newestAlias.id);
    assert.equal(cancelAlias.items[0].sku_snapshot,'ALIAS-C');await call('/mutations',{action:'cancel_order',key:crypto.randomUUID(),id:cancelAlias.id,version:cancelAlias.version,reason:'Alias cancellation test',refund_method:'cash'});
    assert.equal((await aliasView()).on_hand,beforeCancelSale);assert.equal((await aliasOrder(newestAlias.id)).items[0].sku_snapshot,'ALIAS-C');
    const [labelsBeforeMigration]=await pool.query('SELECT id,sku_snapshot FROM sales_order_items ORDER BY id');await pool.query("DELETE FROM schema_migrations WHERE version='011_product_sku_names'");await migrate();await migrate();assert.deepEqual((await pool.query('SELECT id,sku_snapshot FROM sales_order_items ORDER BY id'))[0],labelsBeforeMigration);
    await call('/staff',{action:'reset',id:signed.user.id,password:changedAdminPassword});
    const staleAdminSession=await fetch(base+'/workspace',{headers:{Authorization:`Bearer ${token}`}});
    assert.equal(staleAdminSession.status,401);
    const changedAdminLogin=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:changedAdminPassword,device_id:'admin-after-reset'})});
    assert.equal(changedAdminLogin.status,200);
  } finally {
    await pool.execute("UPDATE app_users SET password_hash=?,session_device_id=NULL,session_token_hash=NULL,session_last_seen=NULL WHERE login_name='admin'",[passwordHash(env.ADMIN_PASSWORD)]);
    await new Promise(resolve=>server.close(resolve));
    await pool.end();
  }
});
