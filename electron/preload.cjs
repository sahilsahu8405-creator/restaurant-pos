const { contextBridge, ipcRenderer } = require('electron');

// Expose safe POS hardware and window APIs to the frontend React app
contextBridge.exposeInMainWorld('restohubNative', {
  isElectron: true,
  platform: process.platform,
  
  // Hardware printing
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printSilent: (options) => ipcRenderer.invoke('print-silent', options),
  
  // Window management
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  minimize: () => ipcRenderer.invoke('window-minimize'),
  close: () => ipcRenderer.invoke('window-close'),
});
