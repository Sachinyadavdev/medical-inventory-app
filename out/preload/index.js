"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    send: (channel, data) => electron.ipcRenderer.send(channel, data),
    on: (channel, func) => electron.ipcRenderer.on(channel, (event, ...args) => func(...args)),
    invoke: (channel, data) => electron.ipcRenderer.invoke(channel, data),
    removeAllListeners: (channel) => electron.ipcRenderer.removeAllListeners(channel)
  }
});
