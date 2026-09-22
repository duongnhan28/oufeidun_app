const { app, BrowserWindow, dialog, protocol, net } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
protocol.registerSchemesAsPrivileged([{scheme:'shop',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
if(process.env.APP_TEST_DATA)app.setPath('userData',process.env.APP_TEST_DATA);
if (require('electron-squirrel-startup')) app.quit();
if (process.platform === 'win32') app.setAppUserModelId('com.squirrel.KinhBanHang.Oufeidun');
function createWindow() {
  const win = new BrowserWindow({ show:!process.env.APP_TEST_DATA,width: 1500, height: 960, minWidth: 1000, minHeight: 700, backgroundColor: '#f4f7fa', autoHideMenuBar: true, title: 'Oufeidun • Quản lý bán hàng', icon: path.resolve(__dirname, '../assets/app-icon.ico'), webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
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
  protocol.handle('shop',request=>{
    const url=new URL(request.url);const target=path.resolve(root,'.'+decodeURIComponent(url.pathname));
    if(url.host!=='app'||!target.startsWith(root+path.sep))return new Response('Forbidden',{status:403});
    return net.fetch(pathToFileURL(target).toString());
  });
  createWindow();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
