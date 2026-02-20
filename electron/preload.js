const { contextBridge, ipcRenderer } = require('electron');

// Safely expose selective APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Listen to custom menu events
  onMenuAction: (callback) => ipcRenderer.on('menu-new-task', (_event, ...args) => callback(...args)),
  onMenuNavigate: (callback) => ipcRenderer.on('menu-navigate', (_event, ...args) => callback(...args)),

  // Provide platform info
  platform: process.platform,

  // Request app version
  getVersion: () => ipcRenderer.invoke('get-version')
});
