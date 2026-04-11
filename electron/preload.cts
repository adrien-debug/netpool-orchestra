const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("orchestra", {
  version: () => ipcRenderer.invoke("orchestra:get-version"),
  toggleLauncher: () => ipcRenderer.invoke("orchestra:toggle-launcher"),
  getRuntimeSnapshot: () => ipcRenderer.invoke("orchestra:get-runtime-snapshot"),
  runAction: (actionId: string, payload?: { serviceId?: string; profileId?: string; port?: number }) =>
    ipcRenderer.invoke("orchestra:run-action", actionId, payload)
});
