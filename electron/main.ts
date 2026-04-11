import { app, BrowserWindow, globalShortcut, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Store from "electron-store";
import { getRuntimeSnapshot, runNamedAction } from "./runtime.js";

type RuntimeActionPayload = { serviceId?: string; profileId?: string; port?: number };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = !app.isPackaged;
const store = new Store<{ launcherShortcut: string }>({
  defaults: { launcherShortcut: "CommandOrControl+Shift+Space" }
});

let mainWindow: BrowserWindow | null = null;
let launcherWindow: BrowserWindow | null = null;
const rendererPort = 3322;

function rendererUrl(hash = "/") {
  return isDev ? `http://localhost:${rendererPort}/#${hash}` : `file://${path.join(__dirname, "../dist/index.html")}#${hash}`;
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1460,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: "#0B1020",
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  await mainWindow.loadURL(rendererUrl("/"));
}

async function createLauncherWindow() {
  launcherWindow = new BrowserWindow({
    width: 980,
    height: 660,
    show: false,
    frame: false,
    resizable: false,
    movable: true,
    transparent: true,
    backgroundColor: "#00000000",
    vibrancy: "under-window",
    titleBarStyle: "hidden",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  await launcherWindow.loadURL(rendererUrl("/launcher"));
  launcherWindow.on("blur", () => launcherWindow?.hide());
}

function toggleLauncher() {
  if (!launcherWindow) return;
  if (launcherWindow.isVisible()) {
    launcherWindow.hide();
    return;
  }
  launcherWindow.center();
  launcherWindow.show();
  launcherWindow.focus();
}

function registerShortcuts() {
  globalShortcut.unregisterAll();
  globalShortcut.register(store.get("launcherShortcut"), () => toggleLauncher());
}

function registerIpcHandlers() {
  ipcMain.removeHandler("orchestra:get-version");
  ipcMain.removeHandler("orchestra:toggle-launcher");
  ipcMain.removeHandler("orchestra:get-runtime-snapshot");
  ipcMain.removeHandler("orchestra:run-action");

  ipcMain.handle("orchestra:get-version", () => app.getVersion());
  ipcMain.handle("orchestra:toggle-launcher", () => {
    toggleLauncher();
    return true;
  });
  ipcMain.handle("orchestra:get-runtime-snapshot", async () => getRuntimeSnapshot());
  ipcMain.handle("orchestra:run-action", async (_event, actionId: string, payload?: RuntimeActionPayload) =>
    runNamedAction(actionId, payload)
  );
}

app.whenReady().then(async () => {
  registerIpcHandlers();
  await createMainWindow();
  await createLauncherWindow();
  registerShortcuts();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
      await createLauncherWindow();
      registerShortcuts();
    }
  });
});

app.on("will-quit", () => globalShortcut.unregisterAll());
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
