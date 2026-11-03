// LOCAL build, real Electron window and real client code; isolated mock API.
// No store credentials, database, server tasks or network configuration are used.
const fs=require('node:fs');
const path=require('node:path');
const {_electron:electron,expect}=require('@playwright/test');
(async()=>{
 const profile=path.resolve('.local','session-heartbeat-'+Date.now());
 fs.mkdirSync(profile,{recursive:true});
 const api='https://session-check.home.arpa/api/app/v1';
 fs.writeFileSync(path.join(profile,'connection.json'),JSON.stringify({apiBaseUrl:api}));
 const env={...process.env,APP_TEST_DATA:profile,APP_TEST_VISIBLE:'1'};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({executablePath:require('electron'),args:['.'],env,timeout:60000});
 try{
  const page=await app.firstWindow();
  await page.clock.install();
  const user={id:'10000000-0000-4000-8000-000000000001',display_name:'Session check',role:'admin',active:true};
  const workspace={me:user,users:[user],salespeople:[user],glass_brands:[],products:[],orders:[],customers:[],customer_prices:[],logs:[]};
  let mode='ok',touches=0,mutations=0;
  await page.route(api+'/**',async route=>{
   const pathname=new URL(route.request().url()).pathname;
   if(pathname.endsWith('/auth/login'))return route.fulfill({json:{access_token:'isolated-test-token',user}});
   if(pathname.endsWith('/workspace'))return route.fulfill({json:workspace});
   if(pathname.endsWith('/session/touch')){
    touches++;
    if(mode==='network')return route.abort('internetdisconnected');
    if(mode==='timeout')return; // client AbortController cancels this pending request
    if(mode==='503')return route.fulfill({status:503,json:{error:'SERVER_UNAVAILABLE'}});
    if(mode==='500')return route.fulfill({status:500,json:{error:'INTERNAL_ERROR'}});
    if(mode==='expired')return route.fulfill({status:401,json:{error:'SESSION_REQUIRED'}});
    return route.fulfill({json:{ok:true}});
   }
   mutations++;throw Error('Unexpected API mutation: '+pathname);
  });
  await page.getByLabel('Tên đăng nhập',{exact:true}).fill('isolated-test');
  await page.getByLabel('Mật khẩu',{exact:true}).fill('not-a-store-password');
  await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Bán hàng',exact:true})).toBeVisible();
  await page.getByLabel('Mã đơn hàng',{exact:true}).fill('UNSAVED-SESSION-CHECK');
  await page.getByLabel('Tên khách hàng',{exact:true}).fill('Giữ thông tin đang nhập');
  // Real time, real minimized BrowserWindow: exceed the server's default 90s lease.
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].minimize());
  await expect.poll(()=>touches,{timeout:115000,intervals:[5000]}).toBeGreaterThanOrEqual(4);
  expect(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.getBackgroundThrottling())).toBe(false);
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].restore());
  console.log('PASS real minimized window: heartbeat continues for more than 90 seconds');
  for(const failure of ['503','500','network','timeout']){
   mode=failure;const before=touches;
   await page.clock.fastForward(25000);
   await expect.poll(()=>touches).toBeGreaterThan(before);
   if(failure==='timeout')await page.clock.fastForward(21000);
   await expect(page.getByRole('status')).toContainText('Kết nối máy chủ tạm gián đoạn');
   await expect(page.getByLabel('Mã đơn hàng',{exact:true})).toHaveValue('UNSAVED-SESSION-CHECK');
   await expect(page.getByLabel('Tên khách hàng',{exact:true})).toHaveValue('Giữ thông tin đang nhập');
   mode='ok';const recovery=touches;
   await page.clock.fastForward(25000);
   await expect.poll(()=>touches).toBeGreaterThan(recovery);
   await page.waitForTimeout(100);
   await expect(page.getByRole('heading',{name:'Bán hàng',exact:true})).toBeVisible();
  }
  console.log('PASS 503, 500, network loss and timeout: retain unsaved form and recover without login');
  mode='expired';await page.clock.fastForward(25000);
  await expect(page.getByLabel('Tên đăng nhập',{exact:true})).toBeVisible();
  expect(mutations).toBe(0);
  console.log('PASS real 401 still requires login; no business mutation sent');
 }catch(error){console.error('Native session assertion failed:',error);throw error}
 finally{await app.evaluate(({BrowserWindow})=>{for(const window of BrowserWindow.getAllWindows())window.destroy()}).catch(()=>{});await app.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
