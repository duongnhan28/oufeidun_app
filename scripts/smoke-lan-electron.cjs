const fs=require('node:fs');const path=require('node:path');
const {_electron:electron,expect}=require('@playwright/test');
const {fixture}=require('../tests/lan-fixture.cjs');
(async()=>{
 fs.mkdirSync('.local',{recursive:true});const f=await fixture();
 // Seed the known IP; signed rediscovery is tested below by the actual Electron button.
 f.profile.serverIp='127.0.0.1';
 const userData=path.join(f.dir,'profile with spaces');fs.mkdirSync(userData);fs.writeFileSync(path.join(userData,'server-profile.json'),'\uFEFF'+JSON.stringify(f.profile));
 const env={...process.env,APP_TEST_DATA:userData,APP_TEST_VISIBLE:'1'};delete env.ELECTRON_RUN_AS_NODE;
 const packaged=process.argv.includes('--packaged');
 const installed=process.argv.includes('--installed');
 const executablePath=installed?path.join(process.env.LOCALAPPDATA,'KinhBanHang','app-'+require('../package.json').version,'Oufeidun.exe'):packaged?path.resolve('out/Oufeidun-win32-x64/Oufeidun.exe'):require('electron');
 const app=await electron.launch({executablePath,args:packaged||installed?[]:['.'],env,timeout:60000});
 try{
  const page=await app.firstWindow();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await expect(page.getByLabel('Tên đăng nhập',{exact:true})).toBeVisible();
  fs.mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/lan-login.png'});
  expect(await page.evaluate(()=>window.oufeidun.apiBaseUrl)).toBe('shop://app/api/app/v1');
  await page.getByLabel('Tên đăng nhập',{exact:true}).fill('fixture-only');
  await page.getByLabel('Mật khẩu',{exact:true}).fill('fixture-only');
  await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await expect.poll(()=>f.mutations).toBe(1);
  expect(f.requests).toContain('/api/app/v1/auth/login');
  await page.getByRole('button',{name:'Tìm máy chủ trong Wi-Fi / LAN'}).click();
  await expect(page.getByRole('status')).toContainText('Đã kết nối máy chủ.',{timeout:10000});
  expect(errors).toEqual([]);
  console.log('PASS: Electron real HTTPS proxy/login and signed discovery, no hosts changes or certificate bypass');
 }finally{await app.close();await f.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
