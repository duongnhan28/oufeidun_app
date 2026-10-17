const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('oufeidun', {
  apiBaseUrl: ipcRenderer.sendSync('runtime-config').apiBaseUrl,
  findServer: () => ipcRenderer.invoke('find-server'),
  lookupGlass: (query) => ipcRenderer.invoke('lookup-glass', query),
  saveExport: (filename, bytes) => ipcRenderer.invoke('save-export', { filename, bytes }),
});
