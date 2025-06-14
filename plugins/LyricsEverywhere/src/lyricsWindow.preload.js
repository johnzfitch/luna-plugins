const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onLyevUpdate: (callback) => ipcRenderer.on('lyev.update', (_, data) => callback(data))
});
