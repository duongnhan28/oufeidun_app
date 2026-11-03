const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('forecast counts all 501 drafts, updates on save/delete/sale/cancel and is quantity-only for staff',{timeout:60000},async()=>{
 const envFile=path.resolve('server/.env.test.local'),env=Object.fromEntries(fs.readFileSync(envFile,'utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')&&l.includes('=')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)]}));assert.match(env.MYSQL_DATABASE,/test/i);
 process.env.OUFEIDUN_SERVER_ENV=envFile;process.env.OUFEIDUN_PORT='8795';process.env.OUFEIDUN_DATA_DIR=path.resolve('.local/forecast-api');
 const {pool,config,newId}=require('../server/src/core.cjs');assert.match(config.mysql.database,/test/i);const {start}=require('../server/src/index.cjs');let server;
 try{
  server=await start();await pool.query("UPDATE app_users SET session_token_hash=NULL,session_device_id=NULL WHERE login_name='admin'");
  const base='http://127.0.0.1:8795/api/app/v1';let token='';
  const call=async(p,body,status=200,auth=token)=>{const r=await fetch(base+p,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const j=await r.json();assert.equal(r.status,status,p+' '+(j.error||''));return j};
  const signed=await call('/auth/login',{username:'admin',password:env.ADMIN_PASSWORD,device_id:'forecast-admin'});token=signed.access_token;
  const write=p=>call('/mutations',{key:crypto.randomUUID(),...p}),stamp=Date.now();
  const p=await write({action:'product',sku:'FORECAST-'+stamp,name:'Forecast',glass_type:'clear',models:[],brand:'Forecast',sale_price:'1000',fixed_cost:'500',active:true});
  await write({action:'inventory',type:'opening',reason:'Forecast fixture',items:[{product_id:p.id,quantity:1000}]});
  const orders=Array.from({length:501},(_,i)=>[newId(),'FORE-'+stamp+'-'+i]);
  await pool.query("INSERT INTO sales_orders(id,created_by,customer_name,customer_phone,order_code) VALUES ?",[orders.map(([id,code])=>[id,signed.user.id,'Forecast','0',code])]);
  await pool.query('INSERT INTO sales_order_items(id,order_id,product_id,quantity,unit_sale_price,quoted_price_version) VALUES ?',[orders.map(([id])=>[newId(),id,p.id,1,1000,1])]);
  const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'short'}).format(new Date());
  const period={from:day,to:day};const row=async(auth=token)=>(await call('/stock/forecast',period,200,auth)).rows.find(r=>r.product_id===p.id);
  let r=await row();assert.equal(r.draft_quantity,501);assert.equal(r.estimated_quantity,499);assert.equal(r.delivered_quantity,0);
  let ws=await call('/workspace');assert.equal(ws.orders.length,500);assert.equal(ws.products.find(x=>x.id===p.id).draft_quantity,501);
  await write({action:'delete_draft',id:orders[0][0],version:1});assert.equal((await row()).draft_quantity,500);
  await write({action:'confirm_order',id:orders[1][0],version:1,payment_method:'cash'});
  r=await row();assert.deepEqual([r.on_hand,r.draft_quantity,r.estimated_quantity,r.delivered_quantity],[999,499,500,1]);
  await write({action:'save_draft',id:orders[2][0],version:1,order_code:orders[2][1],customer_name:'Forecast',customer_phone:'0',items:[{product_id:p.id,quantity:2000}]});
  r=await row();assert.equal(r.estimated_quantity,-1499);assert.equal(r.on_hand,999);
  ws=await call('/workspace');const sold=ws.orders.find(x=>x.id===orders[1][0]);await write({action:'cancel_order',id:sold.id,version:sold.version,reason:'Forecast regression',refund_method:'cash'});
  r=await row();assert.equal(r.on_hand,1000);assert.equal(r.delivered_quantity,1,'Gross delivery history must not be subtracted twice');
  const staffName='forecaststaff'+stamp,password=crypto.randomUUID();await call('/staff',{action:'create',login_name:staffName,display_name:'Forecast staff',password});
  const staff=await call('/auth/login',{username:staffName,password,device_id:'forecast-staff'});const staffRow=await row(staff.access_token);assert.equal(staffRow.draft_quantity,r.draft_quantity);assert.doesNotMatch(JSON.stringify(staffRow),/fixed_cost|profit|purchase_price/);
  await call('/reports',period,403,staff.access_token);await call('/stock/forecast',{from:'2026-02-30',to:'2026-03-01'},400);
  const old=(await call('/stock/forecast',{from:'2000-01-01',to:'2000-01-01'})).rows.find(x=>x.product_id===p.id);assert.equal(old.delivered_quantity,0);assert.equal(old.draft_quantity,r.draft_quantity);
  const [snap]=await pool.query('SELECT on_hand,stock_version,price_version FROM products WHERE id=?',[p.id]);await row();assert.deepEqual((await pool.query('SELECT on_hand,stock_version,price_version FROM products WHERE id=?',[p.id]))[0],snap);
 }finally{if(server)await new Promise(resolve=>server.close(resolve));await pool.end()}
});
