"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("orchestra", {
    version: () => ipcRenderer.invoke("orchestra:get-version"),
    toggleLauncher: () => ipcRenderer.invoke("orchestra:toggle-launcher"),
    getRuntimeSnapshot: () => ipcRenderer.invoke("orchestra:get-runtime-snapshot"),
    runAction: (actionId, payload) => ipcRenderer.invoke("orchestra:run-action", actionId, payload)
});
