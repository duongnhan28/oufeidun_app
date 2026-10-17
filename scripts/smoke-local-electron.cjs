const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const mysql = require('../server/node_modules/mysql2/promise');
const { _electron: electron } = require('playwright');
const { expect } = require('@playwright/test');
const ExcelJS = require('exceljs');

const root = path.resolve(__dirname, '..');
const envFile = path.join(root, 'server', '.env.test.local');
const apiPort = Number(process.env.OUFEIDUN_TEST_API_PORT || 8787);
const orderDetails = process.env.OUFEIDUN_SMOKE_ORDER_DETAILS === '1';
if (!fs.existsSync(envFile)) {
  console.log('Bỏ qua Electron local smoke: chưa có server/.env.test.local.');
  process.exit(0);
}
const parsed = Object.fromEntries(fs.readFileSync(envFile,'utf8').split(/\r?\n/).filter(line=>line && !line.startsWith('#') && line.includes('=')).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)];}));
if(!/test/i.test(parsed.MYSQL_DATABASE || ''))throw new Error('Smoke must use an isolated test database.');
const serverEnv = {...process.env,OUFEIDUN_SERVER_ENV:envFile,OUFEIDUN_PORT:String(apiPort)};
let server;
let desktop;
let lanFixture;
async function waitForServer(){for(let i=0;i<40;i++){try{const response=await fetch(`http://127.0.0.1:${apiPort}/health`);if(response.ok)return;}catch{}await new Promise(r=>setTimeout(r,250));}throw new Error('Local API không khởi động.');}
async function main(){
  const connection=await mysql.createConnection({host:parsed.MYSQL_HOST,port:Number(parsed.MYSQL_PORT),user:parsed.MYSQL_USER,password:parsed.MYSQL_PASSWORD,database:parsed.MYSQL_DATABASE});
  await connection.execute("UPDATE app_users SET session_device_id=NULL,session_token_hash=NULL,session_last_seen=NULL WHERE login_name='admin'");
  const [[actor]]=await connection.execute("SELECT id,role FROM app_users WHERE login_name='admin'");
  await connection.end();
  process.env.OUFEIDUN_SERVER_ENV=envFile;
  const { pool }=require('../server/src/core.cjs');
  const { mutate }=require('../server/src/mutations.cjs');
  const { saveCustomer }=require('../server/src/services.cjs');
  const suffix=Date.now().toString();
  const sku=`SMOKE-${suffix}`;
  const phone=`09${suffix.slice(-8)}`;
  const product=await mutate(actor,{action:'product',key:crypto.randomUUID(),id:null,sku,name:'Kính kiểm thử bốn nút',glass_type:'clear',models:['Smoke Phone'],brand:'Other',sale_price:'25000',fixed_cost:'10000',active:true,image_path:null,glass_brand_id:null});
  await require('../server/src/services.cjs').setWholesalePrice(actor,{product_id:product.id,wholesale_price:'25000'});
  await mutate(actor,{action:'inventory',key:crypto.randomUUID(),type:'opening',reason:'Kiểm thử bốn nút',items:[{product_id:product.id,quantity:2}]});
  const customer=await saveCustomer(actor,{name:'Khách đã tồn tại',phone,customer_type:'wholesale',address:'Địa chỉ kiểm thử',note:''});
  let loginName='admin',loginPassword=parsed.ADMIN_PASSWORD;
  if(process.env.OUFEIDUN_SMOKE_ROLE==='staff'){
    loginName=`smokestaff${suffix}`;
    loginPassword=crypto.randomUUID();
    await require('../server/src/services.cjs').manageStaff(actor,{action:'create',display_name:'Nhân viên kiểm thử bốn nút',login_name:loginName,password:loginPassword});
  }
  await pool.end();
  server=spawn(process.execPath,['server/src/index.cjs'],{cwd:root,env:serverEnv,stdio:['ignore','pipe','pipe']});
  await waitForServer();
  const userData=path.join(root,'.local','electron-local-smoke');
  fs.rmSync(userData,{recursive:true,force:true});
  if(process.env.OUFEIDUN_SMOKE_LAN==='1'){
    lanFixture=await require('../tests/lan-fixture.cjs').fixture({forwardPort:apiPort});
    fs.mkdirSync(userData,{recursive:true});
    fs.writeFileSync(path.join(userData,'server-profile.json'),JSON.stringify(lanFixture.profile));
  }
  const electronEnv={...process.env,APP_TEST_DATA:userData};
  delete electronEnv.ELECTRON_RUN_AS_NODE;
  const packaged=process.argv.includes('--packaged');
  desktop=await electron.launch({executablePath:packaged?path.join(root,'out/Oufeidun-win32-x64/Oufeidun.exe'):require('electron'),args:packaged?[]:['.'],cwd:root,env:electronEnv,timeout:60000});
  await desktop.evaluate(({BrowserWindow})=>{for(const window of BrowserWindow.getAllWindows())window.webContents.setBackgroundThrottling(false);});
  const downloadDir=path.join(userData,'downloads');
  fs.mkdirSync(downloadDir,{recursive:true});
  await desktop.evaluate(({dialog},directory)=>{
    globalThis.smokeDownloads=[];
    globalThis.smokeCancelNext=false;
    dialog.showSaveDialog=async(_window,options)=>{
      if(globalThis.smokeCancelNext){globalThis.smokeCancelNext=false;return {canceled:true};}
      const destination=`${directory}/${globalThis.smokeDownloads.length}-${options.defaultPath.split(/[\\/]/).pop()}`;
      globalThis.smokeDownloads.push({path:destination});
      return {canceled:false,filePath:destination};
    };
  },downloadDir);
  const window=await desktop.firstWindow();
  window.on('console',message=>{if(message.type()==='error')console.log('Renderer error:',message.text());});
  await window.locator('input[name="username"]').fill(loginName);
  await window.locator('input[name="password"]').fill(loginPassword);
  await window.getByRole('button',{name:/Đăng nhập/}).click();
  await window.getByRole('heading',{name:'Bán hàng'}).waitFor({timeout:15000});
  console.log('Electron local smoke: đăng nhập và tải workspace thành công.');
  const failures=[];
  if(process.env.OUFEIDUN_SMOKE_TRACE==='1'){
    window.on('request',request=>{if(request.url().includes('/api/app/v1/'))console.log('Request:',new URL(request.url()).pathname);});
    window.on('response',response=>{if(response.url().includes('/api/app/v1/'))console.log('Response:',response.status(),new URL(response.url()).pathname);});
  }
  window.on('response',response=>{if(response.url().includes('/api/app/v1/')&&response.status()>=400)failures.push(`${response.status()} ${new URL(response.url()).pathname}`);});
  await window.getByLabel('Mã đơn hàng').fill(`SMOKE-${suffix}`);
  if (orderDetails) {
    await window.getByLabel('Ngày giờ đặt đơn',{exact:true}).fill('2026-10-09T00:15');
    await window.getByLabel('Chi phí khác (đ)',{exact:true}).fill('5000');
    await window.getByLabel('Nội dung chi phí khác').fill('In ấn desktop');
    await window.getByLabel('Ghi chú đơn hàng').fill('Giao chiều desktop');
  }
  await window.getByRole('combobox',{name:'Tìm khách hàng theo tên hoặc số điện thoại'}).fill(phone);
  await window.getByRole('option').filter({hasText:phone}).click();
  await window.getByRole('button',{name:`Thêm ${sku}`,exact:true}).click();
  await expect(window.locator('.cart-line .line-name')).toContainText(sku);
  await expect(window.locator('.cart-line')).not.toContainText('Kính kiểm thử bốn nút');
  await window.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();
  await expect(window.getByText('Đã lưu bản nháp.',{exact:true})).toBeVisible();
  await window.getByRole('button',{name:'Tải ảnh xác nhận',exact:true}).click();
  await expect(window.getByText('Đã tải ảnh đơn hàng để gửi khách xác nhận.',{exact:true})).toBeVisible({timeout:20000});
  await expect.poll(()=>desktop.evaluate(()=>globalThis.smokeDownloads.length),{timeout:15000}).toBe(1);
  const png=await desktop.evaluate(()=>globalThis.smokeDownloads[0]);
  const pngPath=png.path;
  if(!fs.readFileSync(pngPath).subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('PNG không hợp lệ');
  await window.getByRole('button',{name:'Tải Excel',exact:true}).click();
  await expect.poll(()=>desktop.evaluate(()=>globalThis.smokeDownloads.length),{timeout:15000}).toBe(2);
  const excel=await desktop.evaluate(()=>globalThis.smokeDownloads[1]);
  await expect(window.getByText('Đã tải file Excel đơn hàng để gửi khách xác nhận.',{exact:true})).toBeVisible();
  const workbook=new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excel.path);
  if(orderDetails){
    const values=JSON.stringify(workbook.worksheets[0].getSheetValues());
    for(const text of ['Giao chiều desktop','In ấn desktop','09/10/2026','Dùng chung: Smoke Phone','30000']) if(!values.includes(text)) throw new Error(`Desktop order details missing: ${text}`);
  }
  if(workbook.worksheets[0].getRow(6).cellCount!==8 || workbook.worksheets[0].getCell('B6').text!=='MÃ KÍNH')throw new Error('Excel SKU header mismatch');
  if(JSON.stringify(workbook.worksheets[0].getSheetValues()).includes('Kính kiểm thử bốn nút'))throw new Error('Excel still contains a product name');
  await desktop.evaluate(()=>{globalThis.smokeCancelNext=true;});
  await window.getByRole('button',{name:'Tải Excel',exact:true}).click();
  await expect(window.getByRole('button',{name:'Tải Excel',exact:true})).toBeEnabled();
  await expect.poll(()=>desktop.evaluate(()=>globalThis.smokeDownloads.length)).toBe(2);
  await expect(window.getByRole('alert')).toHaveCount(0);
  if(!JSON.stringify(workbook.worksheets.map(sheet=>sheet.getSheetValues())).includes(sku))throw new Error('Excel thiếu mã kính');
  await window.getByRole('button',{name:'Xác nhận bán',exact:true}).click();
  const confirm=window.getByRole('dialog',{name:'Xác nhận bán hàng'});
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button',{name:'Xem ảnh cho khách kiểm tra trước khi xác nhận',exact:true}).click();
  const preview=window.getByRole('dialog',{name:'Xem trước ảnh xác nhận đơn hàng'});
  await expect(preview).toBeVisible();
  await preview.getByRole('button',{name:'Tải ảnh PNG',exact:true}).click();
  await expect.poll(()=>desktop.evaluate(()=>globalThis.smokeDownloads.length),{timeout:15000}).toBe(3);
  await expect(confirm.getByRole('button',{name:'Xác nhận và trừ kho',exact:true})).toBeEnabled();
  const previewDownload=await desktop.evaluate(()=>globalThis.smokeDownloads[2]);
  if(!fs.readFileSync(previewDownload.path).subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('Ảnh xem trước tải về không hợp lệ');
  await preview.getByRole('button',{name:'Đóng',exact:true}).click();
  await confirm.getByRole('button',{name:'Xác nhận và trừ kho',exact:true}).click();
  await expect(confirm).toBeHidden();
  const verify=await mysql.createConnection({host:parsed.MYSQL_HOST,port:Number(parsed.MYSQL_PORT),user:parsed.MYSQL_USER,password:parsed.MYSQL_PASSWORD,database:parsed.MYSQL_DATABASE});
  try{
    const [[order]]=await verify.execute('SELECT status,total_amount FROM sales_orders WHERE order_code=?',[`SMOKE-${suffix}`]);
    const [[stock]]=await verify.execute('SELECT on_hand FROM products WHERE id=?',[product.id]);
    if(order?.status!=='confirmed'||Number(order.total_amount)!==(orderDetails?30000:25000)||Number(stock.on_hand)!==1)throw new Error('Xác nhận hoặc trừ kho không đúng');
    const [[count]]=await verify.execute('SELECT COUNT(*) count FROM customers WHERE phone=?',[phone]);
    if(Number(count.count)!==1)throw new Error('Khách hàng bị nhân đôi');
  }finally{await verify.end();}
  if(process.env.OUFEIDUN_SMOKE_ROLE!=='staff'){
    await window.getByRole('button',{name:'Kho hàng',exact:true}).click();
    await window.getByRole('button',{name:'Nhập hàng',exact:true}).click();
    await window.getByRole('button',{name:'Nhập bằng Excel',exact:true}).click();
    const importBook=new ExcelJS.Workbook(),sheet=importBook.addWorksheet('Nhập kho');
    const importedSku=`IMPORT-${suffix}`;
    sheet.addRow(['Mã kính','Số lượng','Giá nhập']);sheet.addRow([importedSku,4,12000]);
    await window.getByLabel('Chọn file Excel đã điền').setInputFiles({name:'import-new.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await importBook.xlsx.writeBuffer())});
    await window.getByRole('button',{name:'Nhập file Excel',exact:true}).click();
    await expect(window.getByRole('status')).toContainText('Đã cập nhật kho');
    await expect(window.locator('tbody tr').filter({hasText:importedSku})).toContainText('4 sản phẩm');
    const importedDb=await mysql.createConnection({host:parsed.MYSQL_HOST,port:Number(parsed.MYSQL_PORT),user:parsed.MYSQL_USER,password:parsed.MYSQL_PASSWORD,database:parsed.MYSQL_DATABASE});
    try{const [[p]]=await importedDb.execute('SELECT on_hand,fixed_cost,sale_price FROM products WHERE sku=?',[importedSku]);if(p.on_hand!==4||Number(p.fixed_cost)!==12000||Number(p.sale_price)!==0)throw new Error('Packaged Excel creation mismatch');}finally{await importedDb.end();}
  }
  if(process.env.OUFEIDUN_SMOKE_ROLE!=='staff'){
    await window.getByRole('button',{name:'Nhập hàng',exact:true}).click();
    await window.getByRole('button',{name:'Nhập bằng Excel',exact:true}).click();
    const catalogBook=new ExcelJS.Workbook(),catalogSheet=catalogBook.addWorksheet('Danh mục');
    catalogSheet.addRow(['Mã kính','Loại kính','Hãng điện thoại','Hãng kính','Giá bán (đ)','Giá sỉ mặc định (đ)','Giá vốn cố định (đ)','Mã/dòng máy dùng chung - mỗi dòng một mã','Số lượng']);
    catalogSheet.addRow([`CAT-${suffix}`,'Kính trong','Samsung','Catalog Brand',30000,24000,12000,'Samsung A15, Samsung A16, OPPO A58/A60',6]);
    catalogSheet.addRow([`IMPORT-${suffix}`,'Chống nhìn trộm','Apple','',45000,35000,15000,'iPhone 15, iPhone 16',3]);
    await window.getByLabel('Chọn file Excel đã điền').setInputFiles({name:'catalog.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await catalogBook.xlsx.writeBuffer())});
    await window.getByRole('button',{name:'Nhập file Excel',exact:true}).click();
    await expect(window.getByRole('status')).toContainText('Đã cộng 9 tấm vào kho');
    const catalogDb=await mysql.createConnection({host:parsed.MYSQL_HOST,port:Number(parsed.MYSQL_PORT),user:parsed.MYSQL_USER,password:parsed.MYSQL_PASSWORD,database:parsed.MYSQL_DATABASE});
    try{
      const [[created]]=await catalogDb.execute('SELECT * FROM products WHERE sku=?',[`CAT-${suffix}`]);
      const [[updated]]=await catalogDb.execute('SELECT * FROM products WHERE sku=?',[`IMPORT-${suffix}`]);
      if(created.on_hand!==6||Number(created.sale_price)!==30000||Number(created.wholesale_price)!==24000||Number(created.fixed_cost)!==12000)throw Error('Catalog creation mismatch');
      const models=typeof created.models==='string'?JSON.parse(created.models):created.models;
      if(models.join(',')!=='Samsung A15,Samsung A16,OPPO A58/A60')throw Error('Catalog models mismatch');
      if(updated.on_hand!==7||Number(updated.sale_price)!==45000||Number(updated.wholesale_price)!==35000||Number(updated.fixed_cost)!==15000)throw Error('Catalog update changed stock or missed prices');
    }finally{await catalogDb.end();}
    console.log('Packaged nine-column catalog: creation, update, models, three prices and receipt quantities passed.');
  }
  if(failures.length)throw new Error(failures.join('\n'));
  console.log(`Electron + MySQL (${process.env.OUFEIDUN_SMOKE_ROLE||'admin'}): lưu nháp, tải PNG, đọc lại Excel, xác nhận và trừ kho với khách đã tồn tại đều đạt.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
  if(desktop){await desktop.evaluate(({BrowserWindow})=>{for(const window of BrowserWindow.getAllWindows())window.destroy();}).catch(()=>{});await desktop.close().catch(()=>{});}
  if(server){server.kill();await new Promise(resolve=>server.once('exit',resolve));}
  if(lanFixture)await lanFixture.close();
});
