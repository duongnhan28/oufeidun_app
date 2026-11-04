const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('oufeidun', {
  apiBaseUrl: ipcRenderer.sendSync('runtime-config').apiBaseUrl,
  updateStatus: () => ipcRenderer.invoke('app-update-status'),
  checkUpdate: () => ipcRenderer.invoke('app-update-check'),
  downloadUpdate: () => ipcRenderer.invoke('app-update-download'),
  showUpdateFile: () => ipcRenderer.invoke('app-update-show-file'),
  findServer: () => ipcRenderer.invoke('find-server'),
  lookupGlass: (query) => ipcRenderer.invoke('lookup-glass', query),
  saveExport: (filename, bytes) => ipcRenderer.invoke('save-export', { filename, bytes }),
});
