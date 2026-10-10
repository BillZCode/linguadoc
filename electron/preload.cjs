const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('desktopApi', {
  isDesktop: true,
  platform: process.platform,
  version: '1.0.0',
});
