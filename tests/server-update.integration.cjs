const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
test('server update from migration 007 keeps accounts/orders/stock and enables draft forecast',{timeout:60000},async()=>{
 const root=path.resolve(__dirname,'..'),appRoot=path.resolve(process.env.OUFEIDUN_UPGRADE_APP||path.join(root,'server'));
 const envFile=path.join(root,'server/.env.test.local');
 const env=Object.fromEntries(fs.readFileSync(envFile,'utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')&&l.includes('=')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)]}));
 assert.match(env.MYSQL_DATABASE,/(?:^|_)test(?:_|$)/i);
 const mysql=require('../server/node_modules/mysql2/promise'),resetTest=process.env.OUFEIDUN_UPGRADE_RESET_TEST_DB==='1',database=resetTest?env.MYSQL_DATABASE:'oufeidun_upgrade_test_'+Date.now();assert.match(database,/(?:^|_)test(?:_|$)/i);
 const adminDb=await mysql.createConnection({host:env.MYSQL_HOST||'127.0.0.1',port:Number(env.MYSQL_PORT||3306),user:env.MYSQL_USER,password:env.MYSQL_PASSWORD});
 let created=false,db,pool,server;
 try {
  assert.match(database,/^[a-zA-Z0-9_]+$/);
  if(!resetTest){await adminDb.query('CREATE DATABASE `'+database+'` CHARACTER SET utf8mb4');created=true}
  db=await mysql.createConnection({host:env.MYSQL_HOST||'127.0.0.1',port:Number(env.MYSQL_PORT||3306),user:env.MYSQL_USER,password:env.MYSQL_PASSWORD,database});
  if(resetTest){
   // Explicit opt-in for the disposable configured test DB when the test user cannot CREATE DATABASE.
   assert.match(database,/(?:^|_)test(?:_|$)/i);const [tables]=await db.query('SHOW TABLES');await db.query('SET FOREIGN_KEY_CHECKS=0');
   for(const row of tables){const name=Object.values(row)[0];assert.match(name,/^[a-zA-Z0-9_]+$/);await db.query('DROP TABLE `'+name+'`')}
   await db.query('SET FOREIGN_KEY_CHECKS=1');
  }
  for(const file of fs.readdirSync(path.join(appRoot,'mysql')).filter(f=>/^00[1-7]_.*\.sql$/.test(f)).sort()){
   // Current base schema already contains some historical additions; replay only to assemble a 007 fixture.
   for(const sql of fs.readFileSync(path.join(appRoot,'mysql',file),'utf8').split(/;\s*(?:\r?\n|$)/).map(s=>s.trim()).filter(Boolean))try{await db.query(sql)}catch(e){if(!['ER_DUP_FIELDNAME','ER_DUP_KEYNAME','ER_CHECK_CONSTRAINT_DUP_NAME'].includes(e.code))throw e}
  }
  process.env.OUFEIDUN_SERVER_ENV=envFile;process.env.MYSQL_DATABASE=database;process.env.OUFEIDUN_PORT='8809';process.env.OUFEIDUN_DATA_DIR=path.join(root,'.local',database);
  const core=require(path.join(appRoot,'src/core.cjs'));pool=core.pool;
  const uid=crypto.randomUUID(),pid=crypto.randomUUID(),oid=crypto.randomUUID(),password=env.ADMIN_PASSWORD||crypto.randomUUID();
  await db.execute("INSERT INTO app_users(id,login_name,display_name,password_hash,role) VALUES (?,'admin','Upgrade fixture',?,'admin')",[uid,core.passwordHash(password)]);
  await db.execute("INSERT INTO products(id,sku,name,glass_type,models,sale_price,fixed_cost,on_hand) VALUES (?,'UPGRADE-8','Upgrade fixture','clear',JSON_ARRAY(),1111,222,8)",[pid]);
  await db.execute("INSERT INTO sales_orders(id,created_by,order_code,customer_name,customer_phone) VALUES (?,?,'LEGACY-DRAFT-8','Upgrade customer','0')",[oid,uid]);
  await db.execute('INSERT INTO sales_order_items(id,order_id,product_id,quantity,unit_sale_price,quoted_price_version) VALUES (?,?,?,?,1111,1)',[crypto.randomUUID(),oid,pid,8]);
  const snapshot=async()=>({users:(await db.query('SELECT id,login_name,password_hash,role,active FROM app_users ORDER BY id'))[0],products:(await db.query('SELECT id,sku,on_hand,sale_price,fixed_cost FROM products ORDER BY id'))[0],orders:(await db.query('SELECT id,order_code,status,total_amount FROM sales_orders ORDER BY id'))[0],items:(await db.query('SELECT id,product_id,quantity,unit_sale_price FROM sales_order_items ORDER BY id'))[0]});
  const before=await snapshot();const {migrate}=require(path.join(appRoot,'src/migrate.cjs'));await migrate();assert.deepEqual(await snapshot(),before);
  server=await require(path.join(appRoot,'src/index.cjs')).start();
  const health=await(await fetch('http://127.0.0.1:8809/health')).json();assert.equal(health.version,'0.1.4');assert.equal(health.capabilities.stockForecast,true);
  const base='http://127.0.0.1:8809/api/app/v1';let token='';
  const call=async(route,body)=>{const r=await fetch(base+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});const j=await r.json();assert.equal(r.status,200,j.error||route);return j};
  token=(await call('/auth/login',{username:'admin',password,device_id:'upgrade-fixture'})).access_token;
  const row=(await call('/workspace')).products.find(p=>p.id===pid);assert.equal(row.on_hand,8);assert.equal(row.draft_quantity,8);
  await call('/mutations',{action:'save_draft',key:crypto.randomUUID(),order_code:'NEW-DRAFT-7',customer_name:'Upgrade new',customer_phone:'0',items:[{product_id:pid,quantity:7}]});
  const day=new Date(Date.now()+7*3600000).toISOString().slice(0,10),forecast=(await call('/stock/forecast',{from:day,to:day})).rows.find(r=>r.product_id===pid);
  assert.deepEqual([forecast.on_hand,forecast.draft_quantity,forecast.estimated_quantity],[8,15,-7]);
  const after=await snapshot();await migrate();assert.deepEqual(await snapshot(),after);
  console.log('PASS migration 007 -> latest twice, passwords/accounts/SKU/prices/orders/stock preserved; running 0.1.4 health capability; draft 8 + new 7 = forecast -7 without stock deduction');
 } finally {if(server)await new Promise(r=>server.close(r));if(pool)await pool.end();if(db)await db.end();if(created){assert.match(database,/^oufeidun_upgrade_test_\d+$/);await adminDb.query('DROP DATABASE `'+database+'`')}await adminDb.end()}
});
