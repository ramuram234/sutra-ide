const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sutraDesktop", {
  platform: process.platform,
  setNativeTheme(source) {
    ipcRenderer.send("sutra-theme", source);
  },
  openFolder() {
    return ipcRenderer.invoke("sutra:openFolder");
  },
  openFiles() {
    return ipcRenderer.invoke("sutra:openFiles");
  },
  saveAs(name) {
    return ipcRenderer.invoke("sutra:saveAs", name);
  },
  newWindow() {
    return ipcRenderer.invoke("sutra:newWindow");
  },
  quit() {
    return ipcRenderer.invoke("sutra:quit");
  },
});
