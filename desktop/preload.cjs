const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sutraDesktop", {
  platform: process.platform,
  setNativeTheme(source) {
    ipcRenderer.send("sutra-theme", source);
  },
});
