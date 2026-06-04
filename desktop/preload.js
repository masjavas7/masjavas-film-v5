import { contextBridge, ipcRenderer } from 'electron';

let apiBaseUrl = 'http://localhost:3000';

// Terima update API Base URL dari Main Process secara real-time
ipcRenderer.on('masjavas:api-base-url', (_event, url) => {
  apiBaseUrl = url;
});

// Ekspos API aman ke objek window global
contextBridge.exposeInMainWorld('masjavas', {
  getApiBaseUrl: () => apiBaseUrl,
  platform: 'desktop-windows'
});
