const fs=require('node:fs');
const path=require('node:path');
const {_electron:electron,expect}=require('@playwright/test');
(async()=>{
 const packaged=process.argv.includes('--packaged');
 const installed=process.argv.includes('--installed');
 const userData=path.resolve('.local','runtime config '+Date.now());
 fs.mkdirSync(userData,{recursive:true});
 const api='https://test-config.home.arpa/api/app/v1';
 fs.writeFileSync(path.join(userData,'connection.json'),'\uFEFF'+JSON.stringify({apiBaseUrl:api}));
 const env={...process.env,APP_TEST_DATA:userData};delete env.ELECTRON_RUN_AS_NODE;
 const version=require('../package.json').version;
 const executablePath=installed?path.join(process.env.LOCALAPPDATA,'KinhBanHang','app-'+version,'Oufeidun.exe'):packaged?path.resolve('out/Oufeidun-win32-x64/Oufeidun.exe'):require('electron');
 const app=await electron.launch({executablePath,args:packaged||installed?[]:['.'],env,timeout:60000});
 try{
  const page=await app.firstWindow();
  await expect(page.getByLabel('Tên đăng nhập',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>window.oufeidun.apiBaseUrl)).toBe(api);
  const csp=await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(csp).toContain('https://test-config.home.arpa');
  let requested=false;
  await page.route(api+'/**',async route=>{requested=true;await route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:'INVALID_CREDENTIALS'})})});
  await page.getByLabel('Tên đăng nhập',{exact:true}).fill('config-check');
  await page.getByLabel('Mật khẩu',{exact:true}).fill('not-a-real-account');
  await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await expect.poll(()=>requested).toBe(true);
  console.log('PASS: external URL with BOM, moved profile with spaces, scoped CSP and actual login request use configured server');
 }finally{await app.close()}
})().catch(error=>{console.error(error.message);process.exitCode=1});
