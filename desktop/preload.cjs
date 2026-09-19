const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("sutraDesktop", {
  platform: process.platform,
});
