// Packaged Windows app + isolated MySQL + signed HTTPS LAN profile.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {_electron:electron}=require('playwright'),{expect}=require('@playwright/test');
const ExcelJS=require('exceljs');
const root=path.resolve(__dirname,'..'),envFile=path.join(root,'server/.env.test.local');
const env=Object.fromEntries(fs.readFileSync(envFile,'utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')&&l.includes('=')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)];}));
assert.match(env.MYSQL_DATABASE||'',/test/i,'Only isolated test databases');
process.env.OUFEIDUN_SERVER_ENV=envFile;process.env.OUFEIDUN_PORT='8795';process.env.OUFEIDUN_DATA_DIR=path.join(root,'.local/stock-adjustment-api');
const {pool}=require('../server/src/core.cjs'),{mutate}=require('../server/src/mutations.cjs'),{manageStaff}=require('../server/src/services.cjs');
let app,server,lan;
async function main(){
 const [[admin]]=await pool.query("SELECT id,role FROM app_users WHERE login_name='admin'");
 await pool.query("UPDATE app_users SET session_device_id=NULL,session_token_hash=NULL,session_last_seen=NULL WHERE login_name='admin'");
 const stamp=Date.now(),staffName=`adjust${stamp}`,staffPassword=crypto.randomUUID();
 await manageStaff(admin,{action:'create',display_name:'Nhân viên điều chỉnh',login_name:staffName,password:staffPassword});
 {const [[u]]=await pool.query('SELECT id,permissions_version FROM app_users WHERE login_name=?',[staffName]);await manageStaff(admin,{action:'permissions',id:u.id,version:u.permissions_version,permissions:{manage_products:true,manage_prices:true,manage_returns:true,adjust_stock:true,view_reports:true,view_audit:true}});}
 const products=[];
 for(const role of ['admin','staff']){
  const sku=`ADJUST-EXE-${role}-${stamp}`.toUpperCase();
  const p=await mutate(admin,{action:'product',key:crypto.randomUUID(),sku,name:sku,glass_type:'other',models:[],brand:'Adjustment native',sale_price:'10000',fixed_cost:'1234',active:true});
  await mutate(admin,{action:'inventory',key:crypto.randomUUID(),type:'opening',reason:'Isolated native adjustment test',items:[{product_id:p.id,quantity:10}]});products.push({id:p.id,sku,role});
 }
 const ownIds=new Set(products.map(p=>p.id));const [before]=await pool.query('SELECT id,on_hand,fixed_cost,sale_price,price_version FROM products ORDER BY id');
 server=await require('../server/src/index.cjs').start();lan=await require('./lan-fixture.cjs').fixture({forwardPort:8795});
 for(const product of products){
  const staff=product.role==='staff',data=fs.mkdtempSync(path.join(root,'.local/stock-adjustment-exe-'));
  fs.writeFileSync(path.join(data,'server-profile.json'),JSON.stringify(lan.profile));
  const launchEnv={...process.env,APP_TEST_DATA:data,APP_TEST_VISIBLE:'1'};delete launchEnv.ELECTRON_RUN_AS_NODE;
  app=await electron.launch({executablePath:path.join(root,'out/Oufeidun-win32-x64/Oufeidun.exe'),cwd:root,env:launchEnv,timeout:60000});
  await app.evaluate(({BrowserWindow,dialog},dir)=>{for(const w of BrowserWindow.getAllWindows())w.webContents.setBackgroundThrottling(false);globalThis.saved=[];dialog.showSaveDialog=async(_,options)=>{const filePath=dir+'/'+options.defaultPath.split(/[\\/]/).pop();globalThis.saved.push(filePath);return{canceled:false,filePath};};},data);
  const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.locator('[name=username]').fill(staff?staffName:'admin');await page.locator('[name=password]').fill(staff?staffPassword:env.ADMIN_PASSWORD);await page.getByRole('button',{name:/Đăng nhập/}).click();
  await page.getByRole('button',{name:'Kho hàng',exact:true}).click();
  const row=page.locator('tbody tr').filter({has:page.getByRole('button',{name:`Sửa ${product.sku}`,exact:true})});
  await page.getByRole('button',{name:`Điều chỉnh tồn ${product.sku}`,exact:true}).click();let dialog=page.getByRole('dialog');
  await dialog.getByLabel('Số lượng giảm',{exact:true}).fill('3');
  await dialog.getByRole('button',{name:'Xác nhận ghi kho',exact:true}).click();await expect(dialog).toBeVisible();assert.equal((await pool.query('SELECT on_hand FROM products WHERE id=?',[product.id]))[0][0].on_hand,10);
  const reason=`Kiểm kê giảm 3 sản phẩm ${product.role}`;await dialog.getByLabel('Lý do / ghi chú',{exact:true}).fill(reason);
  await page.screenshot({path:path.join(root,`test-results/stock-adjustment-exe-${product.role}.png`)});
  await dialog.getByRole('button',{name:'Xác nhận ghi kho',exact:true}).click();await expect(row).toContainText('7 sản phẩm');
  await page.getByRole('button',{name:`Lịch sử ${product.sku}`,exact:true}).click();dialog=page.getByRole('dialog');await expect(dialog).toContainText(reason);await expect(dialog).toContainText('-3');await expect(dialog).toContainText('Người thực hiện:');await dialog.getByRole('button',{name:'Đóng',exact:true}).click();
  await page.getByRole('button',{name:`Điều chỉnh tồn ${product.sku}`,exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByLabel('Số lượng giảm',{exact:true}).fill('8');await dialog.getByLabel('Lý do / ghi chú',{exact:true}).fill('Invalid excessive decrease');await dialog.getByRole('button',{name:'Xác nhận ghi kho',exact:true}).click();await expect(dialog).toBeVisible();assert.equal((await pool.query('SELECT on_hand FROM products WHERE id=?',[product.id]))[0][0].on_hand,7);
  await dialog.getByLabel('Cách điều chỉnh',{exact:true}).selectOption('increase');await dialog.getByLabel('Số lượng tăng',{exact:true}).fill('2');await dialog.getByLabel('Lý do / ghi chú',{exact:true}).fill('Tìm lại 2 sản phẩm');await dialog.getByRole('button',{name:'Xác nhận ghi kho',exact:true}).click();await expect(row).toContainText('9 sản phẩm');
  await page.getByRole('button',{name:`Điều chỉnh tồn ${product.sku}`,exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByLabel('Cách điều chỉnh',{exact:true}).selectOption('count');await dialog.getByLabel('Tồn thực tế sau kiểm kê',{exact:true}).fill('0');await dialog.getByLabel('Lý do / ghi chú',{exact:true}).fill('Kiểm kê hết tồn');await dialog.getByRole('button',{name:'Xác nhận ghi kho',exact:true}).click();await expect(row).toContainText('0 sản phẩm');
  await page.getByRole('button',{name:'Lịch sử thao tác',exact:true}).click();await expect(page.locator('tbody')).toContainText(reason);
  await page.getByRole('button',{name:'Báo cáo',exact:true}).click();await expect(page.getByRole('button',{name:'Tải báo cáo Excel',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Tải báo cáo Excel',exact:true}).click();await expect.poll(()=>app.evaluate(()=>globalThis.saved.length)).toBe(1);
  const book=new ExcelJS.Workbook(),file=(await app.evaluate(()=>globalThis.saved))[0];await expect.poll(async()=>{try{await book.xlsx.readFile(file);return true;}catch{return false;}},{timeout:15000}).toBe(true);
  const found=[];book.getWorksheet('Chi tiết kho').eachRow(r=>{if(r.getCell(2).text===product.sku&&r.getCell(8).text===reason)found.push([r.getCell(4).value,r.getCell(5).value]);});assert.deepEqual(found,[[-3,7]]);
  if(staff)assert.doesNotMatch(JSON.stringify(book.worksheets.map(s=>s.getSheetValues())),/Giá vốn|Tổng vốn|lợi nhuận/);
  assert.deepEqual(errors,[]);await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(w=>w.destroy()));await app.close();app=null;
  console.log(`PASS packaged ${product.role}: mandatory reason, decrease/increase/count-zero, invalid decrease, persisted MySQL/history/audit, real XLSX reason and cost permissions.`);
 }
 const [after]=await pool.query('SELECT id,on_hand,fixed_cost,sale_price,price_version FROM products ORDER BY id');
 assert.deepEqual(after.filter(p=>!ownIds.has(p.id)),before.filter(p=>!ownIds.has(p.id)));
 for(const p of products){const current=after.find(r=>r.id===p.id),old=before.find(r=>r.id===p.id);assert.equal(current.on_hand,0);for(const field of ['fixed_cost','sale_price','price_version'])assert.equal(current[field],old[field]);}
 console.log('PASS: only target stock changed; product prices, costs and all unrelated stock preserved.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(app){await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(w=>w.destroy())).catch(()=>{});await app.close().catch(()=>{});}if(lan)await lan.close();if(server)await new Promise(r=>server.close(r));await pool.end();});
