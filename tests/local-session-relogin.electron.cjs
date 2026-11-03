const fs=require('node:fs'),path=require('node:path');
const {_electron:electron,expect}=require('@playwright/test');
(async()=>{
 const profile=path.resolve('.local','session-relogin-'+Date.now());fs.mkdirSync(profile,{recursive:true});
 const api='https://session-relogin.home.arpa/api/app/v1';fs.writeFileSync(path.join(profile,'connection.json'),JSON.stringify({apiBaseUrl:api}));
 const env={...process.env,APP_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({executablePath:require('electron'),args:['.'],env,timeout:60000});
 try{
  const page=await app.firstWindow();await page.clock.install();
  const user={id:'10000000-0000-4000-8000-000000000002',display_name:'Staff session test',role:'staff',active:true,permissions:{}};
  const workspace={me:user,users:[],salespeople:[user],glass_brands:[],products:[],orders:[],customers:[],customer_prices:[],logs:[]};
  let token='',sequence=0,hold=false,held,failLogout=false,touches=0;
  await page.route(api+'/**',async route=>{
   const p=new URL(route.request().url()).pathname;
   if(p.endsWith('/auth/login')){token='isolated-'+(++sequence);return route.fulfill({json:{access_token:token,user}})}
   if(route.request().headers().authorization!=='Bearer '+token)return route.fulfill({status:401,json:{error:'SESSION_REQUIRED'}});
   if(p.endsWith('/workspace'))return route.fulfill({json:workspace});
   if(p.endsWith('/auth/logout')){if(failLogout){failLogout=false;return route.abort('internetdisconnected')}token='';return route.fulfill({json:{ok:true}})}
   if(p.endsWith('/session/touch')){touches++;if(hold){hold=false;held=route;return}return route.fulfill({json:{ok:true}})}
   throw Error('Unexpected business request: '+p);
  });
  const login=async()=>{
   await page.getByLabel('Tên đăng nhập',{exact:true}).fill('isolated-staff');await page.getByLabel('Mật khẩu',{exact:true}).fill('not-a-store-password');
   const before=sequence;await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
   await expect(page.getByRole('heading',{name:'Bán hàng',exact:true})).toBeVisible();expect(sequence).toBe(before+1);
  };
  const logout=async()=>{await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await expect(page.getByLabel('Tên đăng nhập',{exact:true})).toBeVisible()};
  await login();
  for(let i=0;i<5;i++){await logout();await login()}
  console.log('PASS five staff logout/login cycles: exactly one login request each');
  hold=true;await page.clock.fastForward(25000);await expect.poll(()=>Boolean(held)).toBe(true);
  await logout();await login();
  const staleResponse=page.waitForResponse(response=>response.url().endsWith('/session/touch')&&response.status()===401);
  await held.fulfill({status:401,json:{error:'SESSION_REQUIRED'}});
  await (await staleResponse).finished();await page.waitForTimeout(100);
  const before=touches;await page.clock.fastForward(25000);await expect.poll(()=>touches).toBeGreaterThan(before);
  await expect(page.getByRole('heading',{name:'Bán hàng',exact:true})).toBeVisible();
  console.log('PASS old delayed 401 after relogin does not clear the new token or log out the new session');
  failLogout=true;await logout();await login();
  await page.clock.fastForward(25000);await expect(page.getByRole('heading',{name:'Bán hàng',exact:true})).toBeVisible();
  console.log('PASS failed logout request still exits local screen; same device logs back in once');
 }finally{await app.evaluate(({BrowserWindow})=>{for(const w of BrowserWindow.getAllWindows())w.destroy()}).catch(()=>{});await app.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
