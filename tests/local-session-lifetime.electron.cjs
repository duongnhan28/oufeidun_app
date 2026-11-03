// Real LOCAL Electron + signed HTTPS LAN fixture + isolated real MySQL.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {_electron:electron,expect}=require('@playwright/test');
const envFile=path.resolve('server/.env.test.local');
const env=Object.fromEntries(fs.readFileSync(envFile,'utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')&&l.includes('=')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)]}));
assert.match(env.MYSQL_DATABASE,/test/i);
process.env.OUFEIDUN_SERVER_ENV=envFile;process.env.OUFEIDUN_PORT='8794';process.env.OUFEIDUN_DATA_DIR=path.resolve('.local/session-native-api');
process.env.SESSION_MAX_SECONDS='43200';process.env.SESSION_IDLE_SECONDS='90';
const {pool,newId,passwordHash,config}=require('../server/src/core.cjs');const {migrate}=require('../server/src/migrate.cjs');const {start}=require('../server/src/index.cjs');
assert.match(config.mysql.database,/test/i,'Effective database must also be isolated');
let app,server,lan;const id=newId(),username='native-session-'+Date.now(),password=crypto.randomUUID();
(async()=>{
 await migrate();await pool.execute("INSERT INTO app_users(id,login_name,display_name,password_hash,role,active,permissions) VALUES(?,?,?,?,'staff',TRUE,JSON_OBJECT())",[id,username,'Native session employee',passwordHash(password)]);
 server=await start();lan=await require('./lan-fixture.cjs').fixture({forwardPort:8794});
 const profile=fs.mkdtempSync(path.resolve('.local','session-lifetime-native-'));
 fs.writeFileSync(path.join(profile,'server-profile.json'),JSON.stringify({...lan.profile,serverIp:'127.0.0.1'}));
 const childEnv={...process.env,APP_TEST_DATA:profile};delete childEnv.ELECTRON_RUN_AS_NODE;
 app=await electron.launch({executablePath:require('electron'),args:['.'],env:childEnv,timeout:60000});
 const page=await app.firstWindow();await page.clock.install();
 await page.getByLabel('Tên đăng nhập',{exact:true}).fill(username);await page.getByLabel('Mật khẩu',{exact:true}).fill(password);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Bán hàng',exact:true})).toBeVisible();
 await page.getByLabel('Mã đơn hàng',{exact:true}).fill('KEEP-UNSAVED-SESSION');await page.getByLabel('Tên khách hàng',{exact:true}).fill('Giữ thông tin chưa lưu');
 const state=async()=>(await pool.execute('SELECT session_token_hash,session_expires_at,TIMESTAMPDIFF(SECOND,session_last_seen,NOW(3)) age FROM app_users WHERE id=?',[id]))[0][0];
 const initial=await state();
 for(const seconds of [120,1800,14400]){
  await pool.execute('UPDATE app_users SET session_last_seen=DATE_SUB(NOW(3),INTERVAL ? SECOND) WHERE id=?',[seconds,id]);
  await page.clock.fastForward(25000);await expect.poll(async()=>Number((await state()).age),{timeout:10000}).toBeLessThan(15);
  await expect(page.getByLabel('Mã đơn hàng',{exact:true})).toHaveValue('KEEP-UNSAVED-SESSION');
  assert.equal((await state()).session_token_hash,initial.session_token_hash);assert.equal((await state()).session_expires_at,initial.session_expires_at);
 }
 console.log('PASS real HTTPS/MySQL: 2-minute, 30-minute and 4-hour stale presence resumes same token/deadline and unsaved form');
 // Temporary upstream loss; no credential replay or business mutation.
 await new Promise(resolve=>server.close(resolve));server=null;
 await page.clock.fastForward(25000);await expect(page.getByRole('status')).toContainText('Kết nối máy chủ tạm gián đoạn');
 await expect(page.getByLabel('Mã đơn hàng',{exact:true})).toHaveValue('KEEP-UNSAVED-SESSION');
 await pool.execute('UPDATE app_users SET session_last_seen=DATE_SUB(NOW(3),INTERVAL 1800 SECOND) WHERE id=?',[id]);
 server=await start();await page.clock.fastForward(25000);await expect.poll(async()=>Number((await state()).age),{timeout:10000}).toBeLessThan(15);
 await expect(page.getByLabel('Tên khách hàng',{exact:true})).toHaveValue('Giữ thông tin chưa lưu');
 console.log('PASS real upstream interruption and reconnection: no login and unsaved form retained');
 await pool.execute('UPDATE app_users SET session_expires_at=DATE_SUB(NOW(3),INTERVAL 1 SECOND) WHERE id=?',[id]);
 // Workspace polling may receive the first 401 and clear its token before
 // the in-flight heartbeat returns; the following heartbeat must also expire.
 await page.clock.fastForward(25000);await page.waitForTimeout(100);await page.clock.fastForward(25000);
 await expect(page.getByLabel('Tên đăng nhập',{exact:true})).toBeVisible();
 console.log('PASS real absolute expiry still requires login');
})().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{
 if(app){await app.evaluate(({BrowserWindow})=>{for(const w of BrowserWindow.getAllWindows())w.destroy()}).catch(()=>{});await app.close()}
 if(lan)await lan.close();if(server)await new Promise(resolve=>server.close(resolve));
 await pool.execute('DELETE FROM audit_logs WHERE actor_id=?',[id]);await pool.execute('DELETE FROM app_users WHERE id=?',[id]);await pool.end();
});
