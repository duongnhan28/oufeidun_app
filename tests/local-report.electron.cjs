// Runs the LOCAL packaged app against an isolated MySQL test database over HTTPS.
// Invoke after build:local + electron-forge package; never uses customer config.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {_electron:electron}=require('playwright');
const {expect}=require('@playwright/test');
const ExcelJS=require('exceljs');
const root=path.resolve(__dirname,'..'),envFile=path.join(root,'server/.env.test.local');
const env=Object.fromEntries(fs.readFileSync(envFile,'utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')&&l.includes('=')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)];}));
assert.match(env.MYSQL_DATABASE||'',/test/i,'Only an isolated test database is allowed');
process.env.OUFEIDUN_SERVER_ENV=envFile;
process.env.OUFEIDUN_PORT='8796';
process.env.OUFEIDUN_DATA_DIR=path.join(root,'.local/report-electron-api-data');
const {pool}=require('../server/src/core.cjs');
const {mutate}=require('../server/src/mutations.cjs');
const {workspace}=require('../server/src/workspace.cjs');
const {manageStaff,saveOrderBusiness}=require('../server/src/services.cjs');
let app,server,lan;
const rows=[];
async function main(){
 const [[admin]]=await pool.query("SELECT id,role FROM app_users WHERE login_name='admin'");
 assert.ok(admin,'Run local API integration fixtures first');
 await pool.query("UPDATE app_users SET session_device_id=NULL,session_token_hash=NULL,session_last_seen=NULL WHERE login_name='admin'");
 const stamp=Date.now(),login=`report${stamp}`,password=crypto.randomUUID();
 const customerNames=[];
 await manageStaff(admin,{action:'create',display_name:'Report test staff',login_name:login,password});
 {const [[u]]=await pool.query('SELECT id,permissions_version FROM app_users WHERE login_name=?',[login]);await manageStaff(admin,{action:'permissions',id:u.id,version:u.permissions_version,permissions:{manage_products:true,manage_prices:true,manage_returns:true,adjust_stock:true,view_reports:true,view_audit:true}});}
 const current=async(id)=>(await workspace(admin)).orders.find(o=>o.id===id);
 for(const [type,color,rgb,code]of [
  ['clear','FF000000','rgb(0, 0, 0)',`000${stamp}`],
  ['privacy','FFD6A000','rgb(214, 160, 0)',`DH-CUSTOM-${stamp}`],
  ['premium_borderless','FF0070C0','rgb(0, 112, 192)',`ĐƠN'${stamp}/899`],
 ]){
  const sku=`REPORT-${type}-${stamp}`.toUpperCase();
  const p=await mutate(admin,{action:'product',key:crypto.randomUUID(),sku,name:sku,glass_type:type,models:[],brand:'Apple',sale_price:'7000',fixed_cost:'1234',active:true});
  await mutate(admin,{action:'inventory',key:crypto.randomUUID(),type:'opening',reason:'Isolated report check',items:[{product_id:p.id,quantity:8}]});
  const draft=await mutate(admin,{action:'save_draft',key:crypto.randomUUID(),order_code:code,customer_name:'Report check',customer_phone:'0',items:[{product_id:p.id,quantity:2}]});
  await saveOrderBusiness(admin,{order_id:draft.id,fulfillment_status:'short',missing_summary:'Delivery test',sales_user_id:admin.id});
  let o=await current(draft.id);
  await mutate(admin,{action:'confirm_order',key:crypto.randomUUID(),id:o.id,version:o.version,payment_method:'cash',deliveries:[{order_item_id:o.items[0].id,quantity:1}]});
  o=await current(o.id);
  await mutate(admin,{action:'deliver_order',key:crypto.randomUUID(),id:o.id,version:o.version,items:[{order_item_id:o.items[0].id,quantity:1}],payment_amount:'0'});
  o=await current(o.id);
  if(type==='privacy')await mutate(admin,{action:'cancel_order',key:crypto.randomUUID(),id:o.id,version:o.version,reason:'Report cancel',refund_method:'cash'});
  if(type==='premium_borderless')await mutate(admin,{action:'return_order',key:crypto.randomUUID(),id:o.id,version:o.version,reason:'Report return',refund_method:'cash',items:[{order_item_id:o.items[0].id,quantity:1,restock_quantity:1}]});
  rows.push({id:p.id,sku,color,rgb,code});
 }
 const [stockBefore]=await pool.query('SELECT id,on_hand,fixed_cost FROM products ORDER BY id');
 const [rawMoves]=await pool.query(`SELECT p.sku,m.movement_type,m.quantity_delta,m.balance_after,o.order_code
  FROM inventory_movements m JOIN products p ON p.id=m.product_id
  LEFT JOIN sales_return_items ri ON ri.id=m.return_item_id
  LEFT JOIN sales_order_items i ON i.id=COALESCE(m.sale_order_item_id,ri.order_item_id)
  LEFT JOIN sales_orders o ON o.id=i.order_id WHERE p.id IN (?,?,?)`,rows.map(r=>r.id));
 const expected=rawMoves.map(m=>JSON.stringify([m.sku,m.movement_type,Number(m.quantity_delta),Number(m.balance_after),m.order_code||''])).sort();
 assert.equal(expected.length,11,'opening, initial/supplement, cancellation and return fixtures');
 server=await require('../server/src/index.cjs').start();
 lan=await require('./lan-fixture.cjs').fixture({forwardPort:8796});
 for(const account of [{username:'admin',password:env.ADMIN_PASSWORD,staff:false},{username:login,password,staff:true}]){
  const data=fs.mkdtempSync(path.join(root,'.local/report-electron-'));
  fs.writeFileSync(path.join(data,'server-profile.json'),JSON.stringify(lan.profile));
  const launchEnv={...process.env,APP_TEST_DATA:data};delete launchEnv.ELECTRON_RUN_AS_NODE;
  app=await electron.launch({executablePath:path.join(root,'out/Oufeidun-win32-x64/Oufeidun.exe'),cwd:root,env:launchEnv,timeout:60000});
  await app.evaluate(({BrowserWindow})=>{for(const window of BrowserWindow.getAllWindows())window.webContents.setBackgroundThrottling(false);});
  await app.evaluate(({dialog},dir)=>{globalThis.saved=[];dialog.showSaveDialog=async(_,options)=>{const filePath=dir+'/'+options.defaultPath.split(/[\\/]/).pop();globalThis.saved.push(filePath);return{canceled:false,filePath};};},data);
  const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.locator('[name=username]').fill(account.username);await page.locator('[name=password]').fill(account.password);await page.getByRole('button',{name:/Đăng nhập/}).click();
  await expect(page.getByRole('heading',{name:'Bán hàng',exact:true})).toBeVisible();
  if(process.argv.includes('--customers')){
   for(const [index,name]of ['Khách An','Khách Ân','Khách Bình'].entries()){
    if(index){await page.getByRole('button',{name:'Đơn mới',exact:true}).click();await expect(page.getByLabel('Mã đơn hàng',{exact:true})).toHaveValue('');}
    const display=`${name} ${account.staff?'staff':'admin'} ${stamp}`;customerNames.push(display);
    await page.getByLabel('Mã đơn hàng',{exact:true}).fill(`CUSTOMER-${account.staff?'S':'A'}-${stamp}-${index}`);
    await page.getByLabel('Tên khách hàng',{exact:true}).fill(display);await page.getByLabel('Số điện thoại',{exact:true}).fill('0');
    await page.getByRole('button',{name:`Thêm ${rows[0].sku}`,exact:true}).click();
    await page.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã lưu');
    await expect(page.getByRole('button',{name:'Lưu bản nháp',exact:true})).toBeEnabled();
   }
   await page.getByRole('button',{name:'Khách hàng',exact:true}).click();
   for(const name of customerNames)await expect(page.getByRole('cell',{name,exact:true})).toHaveCount(1);
   console.log(`PASS packaged ${account.staff?'staff':'Admin'}: distinct phone-0 customers and Vietnamese names persist; shared customer list includes earlier account entries.`);
   await page.getByRole('button',{name:'Bán hàng',exact:true}).click();
  }
  for(const row of rows)await expect(page.locator('.product-info > strong').filter({hasText:row.sku})).toHaveCSS('color',row.rgb);
  await page.getByRole('button',{name:'Kho hàng',exact:true}).click();
  for(const row of rows)await expect(page.locator('tbody b').filter({hasText:row.sku})).toHaveCSS('color',row.rgb);
  await expect(page.getByRole('columnheader',{name:'Giá vốn',exact:true})).toHaveCount(account.staff?0:1);
  await page.getByRole('button',{name:'Đơn hàng',exact:true}).click();
  for(const row of rows)await expect(page.locator('tbody tr').filter({hasText:row.code}).locator('td').first()).toHaveText(row.code);
  await page.getByRole('button',{name:'Báo cáo',exact:true}).click();
  await expect(page.getByRole('button',{name:'Tải báo cáo Excel',exact:true})).toBeEnabled();
  const movements=page.locator('section.panel').filter({has:page.getByRole('heading',{name:'Chi tiết biến động kho',exact:true})});
  for(const row of rows){
   const lines=movements.locator('tbody tr').filter({hasText:row.sku});
   await expect(lines).toHaveCount(row.sku.includes('CLEAR')?3:4);
   const cells=await lines.locator('td:nth-child(7)').allTextContents();
   assert.equal(cells.filter(v=>v===row.code).length,row.sku.includes('CLEAR')?2:3);
   assert.equal(cells.filter(v=>v==='—').length,1);
   for(const b of await lines.locator('b').all())await expect(b).toHaveCSS('color',row.rgb);
  }
  await page.getByRole('button',{name:'Tải báo cáo Excel',exact:true}).click();
  await expect.poll(()=>app.evaluate(()=>globalThis.saved.length)).toBe(1);
  const files=await app.evaluate(()=>globalThis.saved);assert.equal(files.length,1);
  const book=new ExcelJS.Workbook();
  await expect.poll(async()=>{try{await book.xlsx.readFile(files[0]);return true;}catch{return false;}},{timeout:15000}).toBe(true);
  const actual=[];
  book.getWorksheet('Chi tiết kho').eachRow((r,n)=>{if(n>1){const fixture=rows.find(p=>p.sku===r.getCell(2).text);if(fixture){
   actual.push(JSON.stringify([r.getCell(2).text,r.getCell(3).text,r.getCell(4).value,r.getCell(5).value,r.getCell(7).text]));
   assert.equal(r.getCell(2).font.color.argb,fixture.color);
   if(r.getCell(7).text)assert.equal(r.getCell(7).type,ExcelJS.ValueType.String,'manual order code must remain text in Excel');
  }}});
  assert.deepEqual(actual.sort(),expected,'real downloaded Excel must match database movements exactly');
  for(const title of ['Nhập xuất tồn','Báo cáo bán hàng'])book.getWorksheet(title).eachRow((r,n)=>{if(n>1){const fixture=rows.find(p=>p.sku===r.getCell(1).text);if(fixture)assert.equal(r.getCell(1).font.color.argb,fixture.color);}});
  if(account.staff)assert.doesNotMatch(JSON.stringify(book.worksheets.map(s=>s.getSheetValues())),/Giá vốn|Tổng vốn|lợi nhuận/);
  // Read the original customer-entered example as well, if integration seeded it.
  const seeded=book.getWorksheet('Chi tiết kho').getRows(2,book.getWorksheet('Chi tiết kho').rowCount-1).filter(r=>r.getCell(2).text==='REPORT-MANUAL'&&r.getCell(7).text==='899');
  assert.ok(seeded.length>=3,'899 appears verbatim for sale, supplement and return');
  if(process.argv.includes('--revenue')){
   const from='2040-10-22',to='2040-10-23';
   // Independent reconciliation against saved order totals and return credits,
   // not the report function itself. Fixtures come from local-api.integration.
   const [[totals]]=await pool.query(`SELECT COUNT(*) orders,
    CAST(COALESCE(SUM(o.total_amount),0)-COALESCE(SUM((SELECT COALESCE(SUM(ri.refund_amount),0) FROM sales_return_items ri JOIN sales_returns r ON r.id=ri.return_id WHERE r.order_id=o.id AND r.posted_at<?)),0) AS CHAR) revenue,
    CAST(COALESCE(SUM(o.extra_cost),0) AS CHAR) fees
    FROM sales_orders o WHERE o.confirmed_at IS NOT NULL AND o.status IN ('confirmed','partially_returned','returned')
    AND COALESCE(o.ordered_at,o.confirmed_at,o.created_at)>=? AND COALESCE(o.ordered_at,o.confirmed_at,o.created_at)<?`,[to+' 00:00:00',from+' 00:00:00',to+' 00:00:00']);
   assert.equal(Number(totals.orders),7,'use the synthetic regression dataset');assert.equal(totals.revenue,'9740000');
   await page.getByLabel('Từ ngày',{exact:true}).fill(from);await page.getByLabel('Đến ngày',{exact:true}).fill(from);
   const money=value=>BigInt(value).toLocaleString('vi-VN')+'đ';
   await expect(page.locator('.stat').filter({hasText:'Doanh thu thuần'})).toContainText(money(totals.revenue));
   await expect(page.locator('.stat').filter({hasText:'Tổng đơn hàng bán ra'}).locator('strong')).toHaveText(String(totals.orders));
   await expect(page.getByRole('button',{name:'Tải báo cáo Excel',exact:true})).toBeEnabled();
   await page.getByRole('button',{name:'Tải báo cáo Excel',exact:true}).click();
   await expect.poll(()=>app.evaluate(()=>globalThis.saved.length)).toBe(2);
   const revenueFile=(await app.evaluate(()=>globalThis.saved))[1];const revenueBook=new ExcelJS.Workbook();
   await expect.poll(async()=>{try{await revenueBook.xlsx.readFile(revenueFile);return true;}catch{return false;}},{timeout:15000}).toBe(true);
   const values={};revenueBook.getWorksheet('Tổng quan').eachRow(r=>{values[r.getCell(1).text]=r.getCell(2).value;});
   assert.equal(values['Số đơn bán ra'],7);assert.equal(values['Doanh thu'],9740000);
   assert.equal(values['Chi phí khác trong đơn'],30000);assert.equal(values['Tiền sản phẩm sau trả hàng'],9710000);
   assert.equal(values['Tổng giá trị gồm chi phí khác'],9740000);
   if(account.staff)assert.doesNotMatch(JSON.stringify(revenueBook.worksheets.map(s=>s.getSheetValues())),/Giá vốn|Tổng vốn|lợi nhuận/);
   await app.evaluate(({BrowserWindow})=>{for(const window of BrowserWindow.getAllWindows()){if(window.isMinimized())window.restore();window.show();window.focus();}});
   await page.screenshot({path:path.join(root,`test-results/release-011-revenue-${account.staff?'staff':'admin'}.png`),timeout:60000});
   console.log(`PASS packaged ${account.staff?'staff':'Admin'}: report and real Excel match 7 synthetic sales / 9,740,000 VND; fees once, dates/drafts/payments/returns reconciled with MySQL.`);
  }
  assert.deepEqual(errors,[]);
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(w=>w.destroy()));await app.close();app=null;
  console.log(`PASS packaged ${account.staff?'staff':'Admin'}: HTTPS/MySQL, manual codes, 11 exact stock rows, SKU colors, real report XLSX and cost permissions.`);
 }
 const [stockAfter]=await pool.query('SELECT id,on_hand,fixed_cost FROM products ORDER BY id');
 assert.deepEqual(stockAfter,stockBefore,'reading/exporting reports must not change inventory or cost');
 console.log('PASS report reads/exports preserve all stock and costs. No customer DB/config or release ZIP changed.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{
 if(app){await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(w=>w.destroy())).catch(()=>{});await app.close().catch(()=>{});}
 if(lan)await lan.close();if(server)await new Promise(r=>server.close(r));await pool.end();
});
