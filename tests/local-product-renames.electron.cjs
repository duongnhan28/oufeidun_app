// Source Electron LOCAL build + isolated MySQL, HTTPS/discovery and native exports.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {_electron:electron}=require('playwright'),{expect}=require('@playwright/test'),ExcelJS=require('exceljs');
const root=path.resolve(__dirname,'..'),envFile=path.join(root,'server/.env.test.local');
const env=Object.fromEntries(fs.readFileSync(envFile,'utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')&&l.includes('=')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)];}));
assert.match(env.MYSQL_DATABASE||'',/test/i,'Only isolated test database');
process.env.OUFEIDUN_SERVER_ENV=envFile;process.env.OUFEIDUN_PORT='8794';process.env.OUFEIDUN_DATA_DIR=path.join(root,'.local/rename-native-api');
const {pool}=require('../server/src/core.cjs'),{mutate}=require('../server/src/mutations.cjs'),{manageStaff}=require('../server/src/services.cjs');
let app,server,lan;
async function main(){
 const [[admin]]=await pool.query("SELECT id,role FROM app_users WHERE login_name='admin'");
 await pool.query("UPDATE app_users SET session_device_id=NULL,session_token_hash=NULL,session_last_seen=NULL WHERE id=?",[admin.id]);
 const stamp=Date.now(),staffName=`rename${stamp}`,staffPassword=crypto.randomUUID(),a=`NATIVE-A-${stamp}`,b=`NATIVE-B-${stamp}`,c=`NATIVE-C-${stamp}`;
 const staffResult=await manageStaff(admin,{action:'create',display_name:'Nhân viên đổi mã',login_name:staffName,password:staffPassword});
 {const [[u]]=await pool.query('SELECT id,permissions_version FROM app_users WHERE login_name=?',[staffName]);await manageStaff(admin,{action:'permissions',id:u.id,version:u.permissions_version,permissions:{manage_products:true,manage_prices:true,manage_returns:true,adjust_stock:true,view_reports:true,view_audit:true}});}
 const [[staff]]=await pool.query('SELECT id,role FROM app_users WHERE login_name=?',[staffName]);
 const write=(actor,p)=>mutate(actor,{key:crypto.randomUUID(),...p});
 const product=await write(admin,{action:'product',sku:a,name:a,glass_type:'clear',models:[],brand:'Native rename',sale_price:'10000',fixed_cost:'1234',active:true});
 await write(admin,{action:'inventory',type:'opening',reason:'Native rename test',items:[{product_id:product.id,quantity:10}]});
 const sold=await write(admin,{action:'save_draft',order_code:`NATIVE-OLD-${stamp}`,customer_name:'Khách kiểm thử đổi mã',customer_phone:'0',items:[{product_id:product.id,quantity:1}]});
 await write(admin,{action:'confirm_order',id:sold.id,version:1,payment_method:'cash',payment_amount:'0'});
 const draftCode=`NATIVE-DRAFT-${stamp}`;
 await write(admin,{action:'save_draft',order_code:draftCode,customer_name:'Nháp giữ mã cũ',customer_phone:'0',items:[{product_id:product.id,quantity:2}]});
 server=await require('../server/src/index.cjs').start();lan=await require('./lan-fixture.cjs').fixture({forwardPort:8794});
 const data=fs.mkdtempSync(path.join(root,'.local/rename-native-'));fs.writeFileSync(path.join(data,'server-profile.json'),JSON.stringify(lan.profile));
 const launchEnv={...process.env,APP_TEST_DATA:data,APP_TEST_VISIBLE:'1'};delete launchEnv.ELECTRON_RUN_AS_NODE;
 app=await electron.launch({executablePath:require('electron'),args:['.'],cwd:root,env:launchEnv,timeout:60000});
 await app.evaluate(({BrowserWindow,dialog},dir)=>{for(const w of BrowserWindow.getAllWindows())w.webContents.setBackgroundThrottling(false);globalThis.saved=[];dialog.showSaveDialog=async(_,options)=>{const filePath=dir+'/'+options.defaultPath.split(/[\\/]/).pop();globalThis.saved.push(filePath);return{canceled:false,filePath};};},data);
 const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const nav=name=>page.getByRole('button',{name,exact:true}).click();
 const login=async(name,password)=>{await page.locator('[name=username]').fill(name);await page.locator('[name=password]').fill(password);await page.getByRole('button',{name:/Đăng nhập/}).click();await expect(page.getByRole('button',{name:'Kho hàng',exact:true})).toBeVisible();};
 const rename=async(from,to)=>{await nav('Kho hàng');await nav(`Sửa ${from}`);const d=page.getByRole('dialog');await d.getByLabel('Mã kính',{exact:true}).fill(to);await d.getByRole('button',{name:'Lưu sản phẩm',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã lưu sản phẩm');};
 await login('admin',env.ADMIN_PASSWORD);await rename(a,b);await nav('Đăng xuất');await login(staffName,staffPassword);await rename(b,c);await expect(page.getByRole('columnheader',{name:'Giá vốn',exact:true})).toHaveCount(0);
 await nav('Đơn nháp');await page.locator('tbody tr').filter({hasText:draftCode}).getByRole('button',{name:'Chi tiết',exact:true}).click();await expect(page.getByRole('dialog')).toContainText(`Mã hiện tại: ${c}`);await nav('Mở bản nháp');
 await page.getByPlaceholder('Tìm mã kính hoặc dòng điện thoại...').fill(b);await expect(page.getByRole('button',{name:`Thêm ${c}`,exact:true})).toBeVisible();for(let n=0;n<5;n++)await nav(`Thêm ${c}`);
 await expect(page.locator('.cart-item')).toHaveCount(1);await expect(page.locator('.line-name b')).toHaveText(a);await expect(page.getByLabel(`Số lượng ${c}`,{exact:true})).toHaveValue('7');
 await nav('Lưu bản nháp');await expect(page.getByRole('status')).toContainText('Đã lưu bản nháp.');await nav('Tải Excel');await expect(page.getByRole('status')).toContainText('Đã tải file Excel');
 let saved=await app.evaluate(()=>globalThis.saved);const book=new ExcelJS.Workbook();await book.xlsx.readFile(saved.find(f=>f.endsWith('.xlsx')));assert.match(JSON.stringify(book.worksheets[0].getSheetValues()),new RegExp(a));assert(!JSON.stringify(book.worksheets[0].getSheetValues()).includes(c));
 await nav('Tải ảnh xác nhận');await expect(page.getByRole('status')).toContainText('Đã tải ảnh');saved=await app.evaluate(()=>globalThis.saved);const png=fs.readFileSync(saved.find(f=>f.endsWith('.png')));assert.equal(png.subarray(1,4).toString(),'PNG');
 await nav('Xác nhận bán');await nav('Xác nhận và trừ kho');await expect(page.getByRole('status')).toContainText('Đã xác nhận');
 const [[state]]=await pool.query('SELECT on_hand,fixed_cost,sale_price FROM products WHERE id=?',[product.id]);assert.equal(state.on_hand,2);assert.equal(String(state.fixed_cost),'1234');assert.equal(String(state.sale_price),'10000');
 const [labels]=await pool.query('SELECT sku_snapshot,quantity FROM sales_order_items WHERE product_id=? ORDER BY quantity',[product.id]);assert.deepEqual(labels.map(r=>[r.sku_snapshot,r.quantity]),[[a,1],[a,7]]);
 await nav('Kho hàng');await nav(`Lịch sử ${c}`);await expect(page.getByRole('dialog')).toContainText(`Mã lúc ghi: ${a}`);await expect(page.getByRole('dialog')).toContainText(`Mã hiện tại: ${c}`);await nav('Đóng');
 await page.screenshot({path:path.join(root,'test-results/product-renames-local-native.png')});assert.deepEqual(errors,[]);
 await nav('Đăng xuất');console.log('LOCAL Electron/MySQL: Admin/staff rename, alias search, draft merge, native Excel/PNG, snapshots/stock/history/cost permissions PASS');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await app?.close();await lan?.close();await new Promise(r=>server?server.close(r):r());await pool.end();});
