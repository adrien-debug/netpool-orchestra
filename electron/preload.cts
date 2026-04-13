const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("orchestra", {
  version: () =>
    ipcRenderer.invoke("orchestra:get-version").catch(() => "unknown"),
  toggleLauncher: () =>
    ipcRenderer.invoke("orchestra:toggle-launcher").catch(() => false),
  getRuntimeSnapshot: () =>
    ipcRenderer.invoke("orchestra:get-runtime-snapshot").catch(() => ({
      metrics: [], alerts: [], services: [], ports: [], docker: [], logs: []
    })),
  runAction: (actionId: string, payload?: { serviceId?: string; profileId?: string; port?: number }) =>
    ipcRenderer.invoke("orchestra:run-action", actionId, payload).catch(() => ({
      ok: false, message: "Erreur IPC — le process principal ne répond pas."
    })),
  getAgentStatus: () =>
    ipcRenderer.invoke("orchestra:get-agent-status").catch(() => []),
  getMetricsHistory: () =>
    ipcRenderer.invoke("orchestra:get-metrics-history").catch(() => []),
  ai: {
    setKey: (providerId: string, key: string) =>
      ipcRenderer.invoke("orchestra:ai-set-key", providerId, key).catch(() => false),
    removeKey: (providerId: string) =>
      ipcRenderer.invoke("orchestra:ai-remove-key", providerId).catch(() => false),
    listProviders: () =>
      ipcRenderer.invoke("orchestra:ai-list-providers").catch(() => ({ providers: [], active: null, configured: [] })),
    setActive: (providerId: string) =>
      ipcRenderer.invoke("orchestra:ai-set-active", providerId).catch(() => false),
    chat: (messages: { role: string; content: string }[], options?: Record<string, unknown>) =>
      ipcRenderer.invoke("orchestra:ai-chat", messages, options).catch((e: Error) => ({ content: e.message, finishReason: "error" })),
    chatStream: (messages: { role: string; content: string }[], options?: Record<string, unknown>) =>
      ipcRenderer.invoke("orchestra:ai-chat-stream", messages, options),
    onStreamChunk: (cb: (chunk: string) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, chunk: string) => cb(chunk);
      ipcRenderer.on("orchestra:ai-stream-chunk", handler);
      return () => ipcRenderer.removeListener("orchestra:ai-stream-chunk", handler);
    },
    onStreamDone: (cb: () => void) => {
      const handler = () => cb();
      ipcRenderer.on("orchestra:ai-stream-done", handler);
      return () => ipcRenderer.removeListener("orchestra:ai-stream-done", handler);
    },
    onStreamError: (cb: (err: string) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, err: string) => cb(err);
      ipcRenderer.on("orchestra:ai-stream-error", handler);
      return () => ipcRenderer.removeListener("orchestra:ai-stream-error", handler);
    }
  }
});
