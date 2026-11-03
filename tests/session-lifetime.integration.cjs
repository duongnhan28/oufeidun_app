const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');

test('real MySQL LOCAL session lifetime: offline recovery, takeover, expiry, revocation and upgrade replay',{timeout:60000},async()=>{
 const envFile=path.resolve(__dirname,'../server/.env.test.local');
 const env=Object.fromEntries(fs.readFileSync(envFile,'utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')&&l.includes('=')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)]}));
 assert.match(env.MYSQL_DATABASE,/test/i,'Never target a store database');
 process.env.OUFEIDUN_SERVER_ENV=envFile;process.env.OUFEIDUN_PORT='8793';process.env.OUFEIDUN_DATA_DIR=path.resolve(__dirname,'../.local/session-lifetime-api');
 process.env.SESSION_MAX_SECONDS='43200';process.env.SESSION_IDLE_SECONDS='90';
 const {pool,newId,passwordHash,config}=require('../server/src/core.cjs');
 assert.match(config.mysql.database,/test/i,'Effective database must also be isolated');
 const {migrate}=require('../server/src/migrate.cjs'),{start}=require('../server/src/index.cjs');
 let server;const id=newId(),adminId=newId(),username='session-'+Date.now(),password=crypto.randomUUID();
 const snapshot=async()=>JSON.stringify((await pool.query('SELECT id,on_hand,version,stock_version,price_version FROM products ORDER BY id'))[0])+JSON.stringify((await pool.query('SELECT id,status,total_amount,version FROM sales_orders ORDER BY id'))[0]);
 try{
  await migrate();const businessBefore=await snapshot();
  await pool.execute("INSERT INTO app_users(id,login_name,display_name,password_hash,role,active,permissions) VALUES(?,?,?,?,'staff',TRUE,JSON_OBJECT())",[id,username,'Isolated session test',passwordHash(password)]);
  await pool.execute("INSERT INTO app_users(id,login_name,display_name,password_hash,role,active) VALUES(?,?,?,?,'admin',TRUE)",[adminId,username+'-admin','Isolated administrator',passwordHash(password)]);
  server=await start();const base='http://127.0.0.1:8793/api/app/v1';
  const call=async(token,p,body,status=200)=>{
   const response=await fetch(base+p,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
   const json=await response.json();assert.equal(response.status,status,p+' '+String(json.error||'unexpected response'));return json;
  };
  const login=async(device,status=200)=>call(null,'/auth/login',{username,password,device_id:device},status);
  const touch=async(token,status=200)=>call(token,'/session/touch',{},status);
  const first=await login('employee-a');let token=first.access_token;
  const [[duration]]=await pool.execute('SELECT TIMESTAMPDIFF(SECOND,session_last_seen,session_expires_at) seconds FROM app_users WHERE id=?',[id]);assert.equal(Number(duration.seconds),43200);
  const [[initial]]=await pool.execute('SELECT session_expires_at FROM app_users WHERE id=?',[id]);
  for(const seconds of [120,1800,14400]){
   await pool.execute('UPDATE app_users SET session_last_seen=DATE_SUB(NOW(3),INTERVAL ? SECOND) WHERE id=?',[seconds,id]);
   await touch(token);await call(token,'/workspace');
   assert.equal((await pool.execute('SELECT session_expires_at FROM app_users WHERE id=?',[id]))[0][0].session_expires_at,initial.session_expires_at,'Heartbeat must not extend absolute deadline');
  }
  await login('employee-b',409);
  await pool.execute('UPDATE app_users SET session_last_seen=DATE_SUB(NOW(3),INTERVAL 91 SECOND) WHERE id=?',[id]);
  const other=await login('employee-b');await touch(token,401);token=other.access_token;await touch(token);
  const old=token;token=(await login('employee-b')).access_token;assert.notEqual(old,token);await touch(old,401);await touch(token);
  await pool.execute('UPDATE app_users SET session_last_seen=DATE_SUB(NOW(3),INTERVAL 91 SECOND) WHERE id=?',[id]);
  const claims=await Promise.all(['claim-b','claim-c'].map(device=>fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password,device_id:device})})));
  assert.deepEqual(claims.map(response=>response.status).sort(),[200,409],'Only one competing device may claim the idle session');
  await touch(token,401);token=(await claims.find(response=>response.status===200).json()).access_token;await touch(token);
  // Replaying the additive migration must not clear or extend an active session.
  const [usersBefore]=await pool.query('SELECT * FROM app_users ORDER BY id');
  await pool.query("DELETE FROM schema_migrations WHERE version='013_session_lifetime'");await migrate();await migrate();
  assert.deepEqual((await pool.query('SELECT * FROM app_users ORDER BY id'))[0],usersBefore);
  await pool.execute('UPDATE app_users SET session_expires_at=DATE_SUB(NOW(3),INTERVAL 1 SECOND) WHERE id=?',[id]);
  await touch(token,401);token=(await login('employee-b')).access_token;
  await call(token,'/auth/logout',{});await touch(token,401);token=(await login('employee-b')).access_token;
  // Legacy pre-upgrade token has no trustworthy issued time; require one login.
  await pool.execute('UPDATE app_users SET session_expires_at=NULL WHERE id=?',[id]);await touch(token,401);token=(await login('employee-b')).access_token;
  // Exercise actual administration services, not just direct SQL for revocation.
  const {manageStaff}=require('../server/src/services.cjs');
  const {mutate}=require('../server/src/mutations.cjs');
  const admin={id:adminId,role:'admin',active:true};
  await manageStaff(admin,{action:'reset',id,password});
  await touch(token,401);token=(await login('employee-b')).access_token;
  await mutate(admin,{action:'staff_state',id,active:false,key:crypto.randomUUID()});
  await touch(token,401);await login('employee-b',403);
  await mutate(admin,{action:'staff_state',id,active:true,key:crypto.randomUUID()});token=(await login('employee-b')).access_token;
  // A valid deadline does not reopen an explicitly deleted account.
  await manageStaff(admin,{action:'delete',id});await touch(token,401);await login('employee-b',401);
  assert.equal(await snapshot(),businessBefore,'Auth changes must not change stock, prices, orders or money');
 }finally{
  await pool.execute('DELETE FROM mutation_requests WHERE actor_id IN (?,?)',[id,adminId]);
  await pool.execute('DELETE FROM audit_logs WHERE actor_id IN (?,?)',[id,adminId]);await pool.execute('DELETE FROM app_users WHERE id IN (?,?)',[id,adminId]);
  if(server)await new Promise(resolve=>server.close(resolve));await pool.end();
 }
});
