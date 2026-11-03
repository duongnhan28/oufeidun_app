const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('MySQL per-account permissions, safe receiving, instant revocation and product report reconciliation', {timeout:90000},async()=>{
 const envFile=path.resolve(__dirname,'../server/.env.test.local'),env=Object.fromEntries(fs.readFileSync(envFile,'utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')&&l.includes('=')).map(l=>{let i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)];}));assert.match(env.MYSQL_DATABASE,/test/i);
 process.env.OUFEIDUN_SERVER_ENV=envFile;process.env.OUFEIDUN_PORT='8792';process.env.OUFEIDUN_DATA_DIR=path.resolve(__dirname,'../.local/permission-api');
 const {pool}=require('../server/src/core.cjs'),{start}=require('../server/src/index.cjs');let server;
 try{
  server=await start();await pool.query("UPDATE app_users SET session_token_hash=NULL,session_device_id=NULL,session_last_seen=NULL WHERE login_name='admin'");
  const base='http://127.0.0.1:8792/api/app/v1';
  const call=async(token,url,payload,expected=200)=>{const r=await fetch(base+url,{method:payload===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(payload===undefined?{}:{body:JSON.stringify(payload)})});const body=await r.json();assert.equal(r.status,expected,`${url}: ${JSON.stringify(body)}`);return body;};
  const session=await call(null,'/auth/login',{username:'admin',password:env.ADMIN_PASSWORD,device_id:'permission-admin'}),a=session.access_token;
  const stamp=Date.now(),login='permissions'+stamp,password=crypto.randomUUID(),created=await call(a,'/staff',{action:'create',display_name:'Permission regression',login_name:login,password});
  const logged=await call(null,'/auth/login',{username:login,password,device_id:'permission-staff'}),s=logged.access_token;
  assert.ok(Object.values(logged.user.permissions).every(v=>v===false));
  const write=(token,p,expected=200)=>call(token,'/mutations',{key:crypto.randomUUID(),...p},expected);
  const fields={action:'product',sku:'PERMISSION-'+stamp,name:'Permission',glass_type:'clear',models:[],brand:'Permission regression '+stamp,sale_price:'10000',wholesale_price:'9000',fixed_cost:'1234',active:true};
  const product=await write(a,fields);await write(a,{action:'inventory',type:'opening',reason:'Permission opening',items:[{product_id:product.id,quantity:50}]});
  const view=async()=> (await call(a,'/workspace')).products.find(p=>p.id===product.id);
  const period={from:'2043-10-28',to:'2043-10-28'};
  for(const p of [{...fields,sku:'DENIED'}, {action:'inventory',type:'adjustment',reason:'Denied',items:[{product_id:product.id,quantity:45,stock_version:(await view()).stock_version}]},{action:'inventory',type:'receipt',reason:'Denied',items:[{product_id:product.id,quantity:2}]},{action:'staff_state',id:created.id,active:false}])await write(s,p,403);
  await call(s,'/reports',period,403);await call(s,'/reports/product',{...period,product_id:product.id},403);
  await call(s,'/products/bulk-price',{glass_type:'clear',price_field:'sale_price',unit_price:'9999'},403);
  for(const p of [{action:'permissions',id:created.id,version:1,permissions:{receive_stock:true}},{action:'create',display_name:'No',login_name:'no'+stamp,password},{action:'reset',id:session.user.id,password}])await call(s,'/staff',p,403);
  const grant=async(permissions,expected=200,version)=>{const u=(await call(a,'/workspace')).users.find(u=>u.id===created.id);return call(a,'/staff',{action:'permissions',id:created.id,version:version??u.permissions_version,permissions},expected);};
  await grant({receive_stock:true,view_reports:true});await grant({manage_costs:true},400);await grant({},409,1);
  await write(s,{...fields,sku:'STILL-DENIED'},403);
  const receive={action:'inventory',key:crypto.randomUUID(),type:'receipt',reason:'Staff receipt',items:[{product_id:product.id,quantity:3}]};await call(s,'/mutations',receive);await call(s,'/mutations',receive);assert.equal((await view()).on_hand,53);assert.equal((await view()).fixed_cost,'1234');
  await write(s,{...receive,key:crypto.randomUUID(),items:[{product_id:product.id,quantity:2,purchase_price:'0'}]},403);assert.equal((await view()).on_hand,53);
  const newSku='PENDING-'+stamp;await write(s,{action:'inventory',type:'receipt',reason:'New pending cost',items:[{sku:newSku,quantity:2}]});let pending=(await call(a,'/workspace')).products.find(p=>p.sku===newSku);assert.equal(pending.cost_configured,false);assert.equal(pending.fixed_cost,'0');
  const save=async(code,items)=>{const r=await write(s,{action:'save_draft',order_code:code+stamp,ordered_at:'2043-10-28T10:00:00+07:00',customer_name:'Permission customer',customer_phone:'0',items});return (await call(a,'/workspace')).orders.find(o=>o.id===r.id);};
  let draft=await save('PENDING-ORDER',[{product_id:pending.id,quantity:1,unit_sale_price:'10000',price_overridden:true}]);await write(s,{action:'confirm_order',id:draft.id,version:draft.version,payment_method:'cash'},409);
  await write(a,{...fields,id:pending.id,version:pending.version,sku:newSku,fixed_cost:'500'});assert.equal((await call(a,'/workspace')).products.find(p=>p.id===pending.id).cost_configured,true);
  // Explicit price override remains valid after the Admin sets the catalog price.
  draft=await save('DETAILS',[{product_id:product.id,quantity:5},{product_id:product.id,quantity:1,item_kind:'gift'},{product_id:product.id,quantity:1,item_kind:'sample'}]);await write(s,{action:'confirm_order',id:draft.id,version:draft.version,payment_method:'cash',payment_amount:'0'});
  draft=(await call(a,'/workspace')).orders.find(o=>o.id===draft.id);
  await write(s,{action:'return_order',id:draft.id,version:draft.version,reason:'Denied return',refund_method:'cash',items:[{order_item_id:draft.items[0].id,quantity:1,restock_quantity:1}]},403);
  await grant({view_reports:true,receive_stock:true,manage_returns:true});
  await write(s,{action:'return_order',id:draft.id,version:draft.version,reason:'Allowed return',refund_method:'cash',items:[{order_item_id:draft.items.find(i=>i.item_kind==='sale').id,quantity:1,restock_quantity:1}]});
  const current=await view();await write(a,{...fields,id:product.id,version:current.version,sku:'RENAMED-'+stamp});
  const details=await call(s,'/reports/product',{...period,product_id:product.id}),report=await call(s,'/reports',{...period,brand:fields.brand});
  assert.equal(details.rows.length,3);assert.equal(details.summary.quantity,6);assert.equal(details.summary.revenue,'40000');assert.ok(details.rows.every(r=>r.sku===fields.sku&&r.order_no==='DETAILS'+stamp));assert.equal(details.product.sku,'RENAMED-'+stamp);
  assert.equal(report.product_revenue,details.summary.revenue);assert.equal(report.sold,details.summary.quantity);assert.doesNotMatch(JSON.stringify(details),/"(?:cost|profit|fixed_cost|purchase_price|unit_cost_snapshot)"/);
  assert.equal((await call(s,'/reports/product',{...period,product_id:product.id,offset:200})).rows.length,0);
  assert.equal((await call(s,'/reports/product',{...period,product_id:product.id,export:true})).rows.length,3);
  await call(s,'/reports/product',{...period,from:'2043-02-30',product_id:product.id},400);
  // Real pagination and full export: 204 sold rows plus a draft which must be excluded.
  await write(a,{action:'inventory',type:'receipt',reason:'Pagination stock',items:[{product_id:product.id,quantity:300,purchase_price:'1234'}]});
  const pagedPeriod={from:'2044-10-28',to:'2044-10-28'};
  for(let index=0;index<68;index++){
    const saved=await write(s,{action:'save_draft',order_code:`PAGE-${index}-${stamp}`,ordered_at:'2044-10-28T10:00:00+07:00',customer_name:'Page regression',customer_phone:'0',items:['sale','gift','sample'].map(item_kind=>({product_id:product.id,quantity:1,item_kind}))});
    await write(s,{action:'confirm_order',id:saved.id,version:1,payment_method:'cash',payment_amount:'0'});
  }
  await write(s,{action:'save_draft',order_code:`PAGE-DRAFT-${stamp}`,ordered_at:'2044-10-28T11:00:00+07:00',customer_name:'Excluded draft',customer_phone:'0',items:[{product_id:product.id,quantity:1}]});
  const pageOne=await call(s,'/reports/product',{...pagedPeriod,product_id:product.id}),pageTwo=await call(s,'/reports/product',{...pagedPeriod,product_id:product.id,offset:200}),allPages=await call(s,'/reports/product',{...pagedPeriod,product_id:product.id,export:true});
  assert.equal(pageOne.rows.length,200);assert.equal(pageTwo.rows.length,4);assert.equal(pageOne.summary.total,204);assert.equal(pageOne.summary.revenue,'680000');assert.equal(allPages.rows.length,204);assert.deepEqual(new Set([...pageOne.rows,...pageTwo.rows].map(r=>r.id)),new Set(allPages.rows.map(r=>r.id)));
  // Partial delivery is reported as delivered value, independently from money collected.
  const partial=await write(s,{action:'save_draft',order_code:`PARTIAL-${stamp}`,ordered_at:'2045-10-28T10:00:00+07:00',customer_name:'Partial report',customer_phone:'0',sale_details:{customer_type:'retail',customer_address:'',fulfillment_status:'short',missing_summary:'Giao bổ sung'},items:[{product_id:product.id,quantity:3}]});
  let partialOrder=(await call(a,'/workspace')).orders.find(o=>o.id===partial.id);await write(s,{action:'confirm_order',id:partial.id,version:partialOrder.version,payment_method:'cash',deliveries:[{order_item_id:partialOrder.items[0].id,quantity:1}],payment_amount:'0'});
  const partialPeriod={from:'2045-10-28',to:'2045-10-28',product_id:product.id};let partialReport=await call(s,'/reports/product',partialPeriod);assert.equal(partialReport.summary.revenue,'10000');assert.equal(partialReport.rows[0].ordered,3);assert.equal(partialReport.rows[0].delivered,1);
  partialOrder=(await call(a,'/workspace')).orders.find(o=>o.id===partial.id);await write(s,{action:'deliver_order',id:partial.id,version:partialOrder.version,items:[{order_item_id:partialOrder.items[0].id,quantity:2}],payment_amount:'0'});partialReport=await call(s,'/reports/product',partialPeriod);assert.equal(partialReport.summary.revenue,'30000');
  // Revoke an already logged-in session. Even retrying an earlier successful receipt is forbidden.
  await grant({});await call(s,'/mutations',receive,403);await call(s,'/reports/product',{...period,product_id:product.id},403);
  const workspace=await call(s,'/workspace');assert.ok(Object.values(workspace.me.permissions).every(v=>!v));assert.equal(workspace.logs.length,0);assert.doesNotMatch(JSON.stringify(workspace),/"(?:fixed_cost|profit|purchase_price|unit_cost_snapshot)"/);
  const [before]=await pool.query('SELECT id,permissions,permissions_version FROM app_users ORDER BY id');await pool.query("DELETE FROM schema_migrations WHERE version='012_staff_permissions'");await require('../server/src/migrate.cjs').migrate();await require('../server/src/migrate.cjs').migrate();assert.deepEqual((await pool.query('SELECT id,permissions,permissions_version FROM app_users ORDER BY id'))[0],before);
  console.log('New staff defaults, grant/revoke, denied escalation, safe receipt, pending costs, returns, rename, detail report/exports and migration rerun PASS');
 }finally{await new Promise(r=>server?server.close(r):r());await pool.end();}
});
