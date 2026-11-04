const { app, BrowserWindow, dialog, protocol, net, ipcMain, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
protocol.registerSchemesAsPrivileged([
  {scheme:'shop',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}},
  {scheme:'lookup-image',privileges:{standard:true,secure:true}}
]);
if(process.env.APP_TEST_DATA)app.setPath('userData',process.env.APP_TEST_DATA);
if (require('electron-squirrel-startup')) app.quit();
if (process.platform === 'win32') app.setAppUserModelId('com.squirrel.KinhBanHang.Oufeidun');
const DEFAULT_UI_ZOOM = 0.9;
let lanConnection;
function loadLanProfile(config) {
  if(config.environment!=='local'||config.backend!=='api')return;
  const fs=require('node:fs');
  const directory=process.env.APP_TEST_DATA?app.getPath('userData'):path.join(app.getPath('appData'),'Oufeidun');
  const cached=path.join(directory,'server-profile.json');
  const explicit=process.argv.find(value=>value.startsWith('--server-profile='));
  const adjacent=path.join(path.dirname(app.getPath('exe')),'server-profile.json');
  const kitProfile=path.join(path.dirname(app.getPath('exe')),'..','server-profile.json');
  const source=explicit?path.resolve(explicit.slice('--server-profile='.length)):fs.existsSync(adjacent)?adjacent:fs.existsSync(kitProfile)?kitProfile:cached;
  if(!fs.existsSync(source))return;
  const {LanConnection,validateProfile}=require('./lan-connection.cjs');
  const profile=validateProfile(JSON.parse(fs.readFileSync(source,'utf8').replace(/^\uFEFF/,'')));
  // Keep the last working IP for the same store when re-opening a copied kit.
  if(source!==cached&&fs.existsSync(cached)){
    const old=JSON.parse(fs.readFileSync(cached,'utf8').replace(/^\uFEFF/,''));
    if(old.serverId===profile.serverId&&old.publicKey===profile.publicKey&&old.hostName===profile.hostName)profile.serverIp=old.serverIp;
  }
  const save=value=>{fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(cached,JSON.stringify(value,null,2));};
  save(profile);lanConnection=new LanConnection(profile,{save});
}
function loadServerConfig() {
  const file = path.resolve(__dirname, '../dist/server-config.json');
  const config = JSON.parse(require('node:fs').readFileSync(file, 'utf8'));
  const lookupApiUrl = new URL(String(config.lookupApiUrl || ''));
  if (lookupApiUrl.protocol !== 'https:' && !(lookupApiUrl.protocol === 'http:' && ['127.0.0.1','localhost'].includes(lookupApiUrl.hostname))) throw new Error('Invalid lookup API URL');
  let apiBaseUrl=String(config.apiBaseUrl||'');
  const bakedApiBaseUrl=apiBaseUrl;
  loadLanProfile(config);
  if(config.environment==='local'&&config.backend==='api'&&!lanConnection){
    const overrideFile=process.env.APP_TEST_DATA ? path.join(app.getPath('userData'),'connection.json') : path.join(app.getPath('appData'),'Oufeidun','connection.json');
    if(require('node:fs').existsSync(overrideFile)){
      const override=JSON.parse(require('node:fs').readFileSync(overrideFile,'utf8').replace(/^\uFEFF/,''));
      const url=new URL(override.apiBaseUrl);
      if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/api/app/v1'||url.search||url.hash)throw new Error('Invalid local server URL');
      apiBaseUrl=url.toString().replace(/\/+$/,'');
    }
  }
  if(lanConnection)apiBaseUrl='shop://app/api/app/v1';
  return { lookupApiUrl, apiBaseUrl, bakedApiBaseUrl, updateProfile: config.backend !== 'api' ? null : config.environment === 'local' ? 'local-mysql' : config.environment === 'production' ? 'production-mysql' : null };
}
function createWindow() {
  const win = new BrowserWindow({ show:!process.env.APP_TEST_DATA||process.env.APP_TEST_VISIBLE==='1',width: 1500, height: 960, minWidth: 1000, minHeight: 700, backgroundColor: '#f4f7fa', autoHideMenuBar: true, title: 'Oufeidun • Quản lý bán hàng', icon: path.resolve(__dirname, '../assets/app-icon.ico'), webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false, zoomFactor: DEFAULT_UI_ZOOM, preload: path.resolve(__dirname, 'preload.cjs') } });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', e => e.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  win.webContents.on('will-prevent-unload', async event => {
    const answer = dialog.showMessageBoxSync(win, { type: 'question', buttons: ['Ở lại', 'Bỏ thay đổi và đóng'], defaultId: 0, cancelId: 0, message: 'Đơn đang soạn chưa được lưu.', detail: 'Lưu bản nháp trước khi đóng để giữ thay đổi.' });
    if (answer === 1) event.preventDefault();
  });
  win.loadURL('shop://app/index.html');
}
const ownInstance=app.requestSingleInstanceLock();
if(!ownInstance)app.quit();
app.on('second-instance',()=>{
  const win=BrowserWindow.getAllWindows()[0];
  if(win){if(win.isMinimized())win.restore();win.show();win.focus();}
});
if(ownInstance)app.whenReady().then(()=>{
  const root=path.resolve(__dirname,'../dist');
  const {lookupApiUrl,apiBaseUrl,bakedApiBaseUrl,updateProfile}=loadServerConfig();
  const { AppUpdates } = require('./app-updates.cjs');
  const updateConfig = require('./update-config.json');
  const updates = new AppUpdates({ version: app.getVersion(), profile: updateProfile, config: {
    feedUrl: new URL(`${updateProfile}-win32-${process.arch}.json`, updateConfig.feedBaseUrl).href,
    publicKey: updateProfile && process.platform === 'win32' ? updateConfig.publicKey : '',
  }, directory: path.join(app.getPath('userData'), 'app-updates') });
  const trustedUpdateSender = event => {
    if (event.senderFrame !== event.sender.mainFrame || event.senderFrame.url !== 'shop://app/index.html') throw Error('Forbidden');
  };
  ipcMain.handle('app-update-status', event => { trustedUpdateSender(event); return updates.snapshot(); });
  ipcMain.handle('app-update-check', event => { trustedUpdateSender(event); return updates.check(); });
  ipcMain.handle('app-update-download', event => { trustedUpdateSender(event); return updates.download(); });
  ipcMain.handle('app-update-show-file', async event => {
    trustedUpdateSender(event);
    try { const file = await updates.verifiedFile(); if (!file) return false; shell.showItemInFolder(file); return true; }
    catch { return false; }
  });
  if (app.isPackaged && process.platform === 'win32' && !process.env.APP_TEST_DATA) {
    setTimeout(() => void updates.check(), 10000).unref();
    setInterval(() => void updates.check(), 12 * 60 * 60 * 1000).unref();
  }
  if(process.argv.includes('--check-server')){
    if(!lanConnection)throw Error('Missing store server profile');
    return lanConnection.connect().then(status=>{
      dialog.showMessageBoxSync({type:'info',message:'Kết nối máy chủ thành công',detail:`${status.hostName}\nIP: ${status.ip||'DNS'}`});app.quit();
    }).catch(()=>{dialog.showErrorBox('Chưa kết nối được máy chủ','Kiểm tra máy chủ đã bật, cùng mạng Wi-Fi/LAN, UDP 47631 và HTTPS 443 không bị chặn.');app.exit(1);});
  }
  if(lanConnection)lanConnection.connect().catch(()=>{});
  ipcMain.on('runtime-config',(event)=>{event.returnValue={apiBaseUrl};});
  ipcMain.handle('find-server',async event=>{
    const sender=new URL(event.senderFrame.url);
    if(sender.protocol!=='shop:'||sender.host!=='app'||!lanConnection)throw Error('Forbidden');
    try{return await lanConnection.connect(true)}catch{return {connected:false,message:'Không tìm thấy máy chủ. Kiểm tra máy chủ đã bật, cùng mạng Wi-Fi/LAN và không bật Client Isolation.'}}
  });
  protocol.handle('shop',async request=>{
    const requestUrl=new URL(request.url);
    if(lanConnection&&requestUrl.host==='app'&&/^\/api\/app\/v1(?:\/|$)/.test(requestUrl.pathname)){
      try{
        if(!['GET','POST','PUT','PATCH','DELETE'].includes(request.method))return new Response('Forbidden',{status:403});
        const body=request.method==='GET'?undefined:Buffer.from(await request.arrayBuffer());
        if(body&&body.length>12*1024*1024)return new Response('File too large',{status:413});
        const headers={};for(const key of ['authorization','content-type','accept']){const value=request.headers.get(key);if(value)headers[key]=value}
        const response=await lanConnection.request(requestUrl.pathname+requestUrl.search,{method:request.method,headers,body});
        return new Response([204,304].includes(response.status)?null:response.body,{status:response.status,headers:{'content-type':response.headers['content-type']||'application/json'}});
      }catch{return new Response(JSON.stringify({error:'SERVER_UNAVAILABLE',message:'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.'}),{status:503,headers:{'content-type':'application/json'}})}
    }
    const url=new URL(request.url);const target=path.resolve(root,'.'+decodeURIComponent(url.pathname));
    if(url.host!=='app'||!target.startsWith(root+path.sep))return new Response('Forbidden',{status:403});
    if(target===path.join(root,'index.html')&&apiBaseUrl&&bakedApiBaseUrl){
      const html=require('node:fs').readFileSync(target,'utf8').replaceAll(new URL(bakedApiBaseUrl).origin,lanConnection?'shop:':new URL(apiBaseUrl).origin);
      return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}});
    }
    return net.fetch(pathToFileURL(target).toString());
  });
  protocol.handle('lookup-image',async request=>{
    const url=new URL(request.url);const imagePath=decodeURIComponent(url.pathname);
    if(url.host!=='app'||!/^\/api\/images\/[a-zA-Z0-9-]+$/.test(imagePath))return new Response('Forbidden',{status:403});
    const response=await net.fetch(new URL(imagePath,lookupApiUrl.origin).toString());
    const contentType=response.headers.get('content-type')||'';
    if(!response.ok||!/^image\/(jpeg|png|webp)$/.test(contentType))return new Response('Image unavailable',{status:response.ok?415:response.status});
    return response;
  });
  ipcMain.handle('lookup-glass',async(_event,rawQuery)=>{
    const query=String(rawQuery||'').trim();
    if(query.length<2||query.length>80)throw new Error('LOOKUP_QUERY_INVALID');
    const url=new URL(lookupApiUrl.toString());
    url.searchParams.set('q',query);url.searchParams.set('limit','20');
    const response=await net.fetch(url.toString(),{headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error(`LOOKUP_HTTP_${response.status}`);
    const text=await response.text();
    if(text.length>2_000_000)throw new Error('LOOKUP_RESPONSE_TOO_LARGE');
    return JSON.parse(text);
  });
  ipcMain.handle('save-export',async(event,payload)=>{
    const sender=new URL(event.senderFrame.url);
    if(sender.protocol!=='shop:'||sender.host!=='app')throw new Error('Forbidden');
    const filename=String(payload?.filename||'');
    if(!filename||filename.length>240||path.basename(filename)!==filename||/[<>:"/\\|?*\x00-\x1f]/.test(filename))throw new Error('Invalid export filename');
    const extension=path.extname(filename).toLowerCase();
    if(!['.png','.xlsx'].includes(extension)||!(payload.bytes instanceof Uint8Array)||!payload.bytes.length||payload.bytes.length>50*1024*1024)throw new Error('Invalid export file');
    const bytes=Buffer.from(payload.bytes);
    if(extension==='.png'&&!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('Invalid PNG');
    if(extension==='.xlsx'&&!bytes.subarray(0,4).equals(Buffer.from([80,75,3,4])))throw new Error('Invalid Excel');
    const result=await dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender),{
      title:'Lưu file đơn hàng',defaultPath:path.join(app.getPath('downloads'),filename),
      filters:[{name:extension==='.png'?'Ảnh PNG':'Excel',extensions:[extension.slice(1)]}],
    });
    if(result.canceled||!result.filePath)return false;
    await require('node:fs/promises').writeFile(result.filePath,bytes);
    return true;
  });
  createWindow();
}).catch(()=>{dialog.showErrorBox('Không thể mở Oufeidun','Cấu hình ứng dụng hoặc kết nối chưa hợp lệ. Chạy SUA-KET-NOI.bat trong bộ máy nhân viên để kiểm tra, hoặc liên hệ hỗ trợ.');app.quit();});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
