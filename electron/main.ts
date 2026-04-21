import { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, nativeImage, Notification } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Store from "electron-store";
import { getRuntimeSnapshot, runNamedAction, getMetricsHistory } from "./runtime.js";
import { agentRuntime } from "./agents/agent-runtime.js";
import { aiRouter } from "./ai/router.js";
import { OpenAIProvider } from "./ai/openai.js";
import { AnthropicProvider } from "./ai/anthropic.js";
import { OllamaProvider } from "./ai/ollama.js";
import { getApiKey, setApiKey, removeApiKey, listConfiguredProviders } from "./ai/key-store.js";
import type { ChatMessage, ChatOptions } from "./ai/provider.js";
import { AdvisorAgent } from "./agents/advisor-agent.js";
import { OnboardingAgent } from "./agents/onboarding-agent.js";
import { PreventiveAgent } from "./agents/preventive-agent.js";
import { AutoFixAgent } from "./agents/autofix-agent.js";
import { PerformanceAgent } from "./agents/performance-agent.js";
import { bus } from "./agents/event-bus.js";
import { checkForUpdates, promptUpdate, validateLicense, setAuthToken, clearAuth } from "./updater.js";
import type { RuntimeActionPayload } from "../src/shared/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = !app.isPackaged;
const store = new Store<{ launcherShortcut: string }>({
  defaults: { launcherShortcut: "CommandOrControl+Shift+Space" }
});

let mainWindow: BrowserWindow | null = null;
let launcherWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
const rendererPort = 3322;

function rendererUrl(hash = "/") {
  return isDev ? `http://localhost:${rendererPort}/#${hash}` : `file://${path.join(__dirname, "../../dist/index.html")}#${hash}`;
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

  ipcMain.removeHandler("orchestra:get-agent-status");
  ipcMain.handle("orchestra:get-agent-status", () => agentRuntime.getStatus());

  ipcMain.removeHandler("orchestra:get-metrics-history");
  ipcMain.handle("orchestra:get-metrics-history", () => getMetricsHistory());

  ipcMain.removeHandler("orchestra:get-performance-score");
  ipcMain.handle("orchestra:get-performance-score", () => {
    const agent = agentRuntime.getAgent("performance") as PerformanceAgent | undefined;
    return agent ? { score: agent.getScore(), recommendations: agent.getRecommendations() } : null;
  });

  ipcMain.removeHandler("orchestra:onboarding-scan");
  ipcMain.handle("orchestra:onboarding-scan", async () => {
    const agent = agentRuntime.getAgent("onboarding") as OnboardingAgent | undefined;
    if (!agent) return [];
    return agent.scanMachine();
  });

  ipcMain.removeHandler("orchestra:onboarding-system-info");
  ipcMain.handle("orchestra:onboarding-system-info", () => {
    const agent = agentRuntime.getAgent("onboarding") as OnboardingAgent | undefined;
    return agent?.getSystemInfo() ?? {};
  });

  ipcMain.removeHandler("orchestra:license-validate");
  ipcMain.handle("orchestra:license-validate", () => validateLicense());

  ipcMain.removeHandler("orchestra:auth-set-token");
  ipcMain.handle("orchestra:auth-set-token", (_e, token: string) => { setAuthToken(token); return true; });

  ipcMain.removeHandler("orchestra:auth-logout");
  ipcMain.handle("orchestra:auth-logout", () => { clearAuth(); return true; });

  ipcMain.removeHandler("orchestra:check-updates");
  ipcMain.handle("orchestra:check-updates", () => checkForUpdates());

  ipcMain.removeHandler("orchestra:ai-set-key");
  ipcMain.handle("orchestra:ai-set-key", (_e, providerId: string, key: string) => {
    setApiKey(providerId, key);
    initAIProviders();
    return true;
  });

  ipcMain.removeHandler("orchestra:ai-remove-key");
  ipcMain.handle("orchestra:ai-remove-key", (_e, providerId: string) => {
    removeApiKey(providerId);
    initAIProviders();
    return true;
  });

  ipcMain.removeHandler("orchestra:ai-list-providers");
  ipcMain.handle("orchestra:ai-list-providers", () => ({
    providers: aiRouter.listProviders(),
    active: aiRouter.activeId,
    configured: listConfiguredProviders()
  }));

  ipcMain.removeHandler("orchestra:ai-set-active");
  ipcMain.handle("orchestra:ai-set-active", (_e, providerId: string) => {
    aiRouter.setActive(providerId);
    return true;
  });

  ipcMain.removeHandler("orchestra:ai-chat");
  ipcMain.handle("orchestra:ai-chat", async (_e, messages: ChatMessage[], options?: ChatOptions) => {
    return aiRouter.chat(messages, options);
  });

  ipcMain.removeHandler("orchestra:ai-chat-stream");
  ipcMain.handle("orchestra:ai-chat-stream", async (event, messages: ChatMessage[], options?: ChatOptions) => {
    try {
      for await (const chunk of aiRouter.chatStream(messages, options)) {
        event.sender.send("orchestra:ai-stream-chunk", chunk);
      }
      event.sender.send("orchestra:ai-stream-done");
    } catch (err) {
      event.sender.send("orchestra:ai-stream-error", err instanceof Error ? err.message : "Stream error");
    }
  });
}

function createTray() {
  const icon = nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAKklEQVQ4T2NkoBAwUqifYdQAhtEwYBgNA4bRMBj0iYlxNDExjKYmAGUHAEF0EBGcGjY3AAAAAElFTkSuQmCC"
  );
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip("Orchestra");
  updateTrayMenu("idle");

  tray.on("click", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function updateTrayMenu(status: "ok" | "warning" | "error" | "idle") {
  if (!tray) return;
  const statusLabel =
    status === "ok" ? "Tout est stable" :
    status === "warning" ? "Alertes actives" :
    status === "error" ? "Erreurs détectées" :
    "Scan en cours...";

  const menu = Menu.buildFromTemplate([
    { label: `Orchestra — ${statusLabel}`, enabled: false },
    { type: "separator" },
    { label: "Ouvrir Orchestra", click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { label: "Scanner maintenant", click: () => { void getRuntimeSnapshot(); } },
    { label: "Réparer maintenant", click: () => { void runNamedAction("repair-now"); } },
    { type: "separator" },
    { label: "Quitter", click: () => app.quit() }
  ]);
  tray.setContextMenu(menu);
}

function showNativeNotification(title: string, body: string) {
  if (!Notification.isSupported()) return;
  new Notification({ title, body, silent: true }).show();
}

async function autoScanOnStartup() {
  try {
    const snapshot = await getRuntimeSnapshot();
    agentRuntime.dispatchSnapshot(snapshot);

    const hasDanger = snapshot.alerts.some((a) => a.severity === "danger");
    const hasWarning = snapshot.alerts.some((a) => a.severity === "warning");

    if (hasDanger) {
      updateTrayMenu("error");
      showNativeNotification("Orchestra", `${snapshot.alerts.length} alerte(s) détectée(s) au démarrage.`);
    } else if (hasWarning) {
      updateTrayMenu("warning");
    } else {
      updateTrayMenu("ok");
    }
  } catch {
    updateTrayMenu("error");
  }
}

function initAIProviders() {
  const openaiKey = getApiKey("openai");
  const anthropicKey = getApiKey("anthropic");

  if (openaiKey) aiRouter.register(new OpenAIProvider(openaiKey));
  if (anthropicKey) aiRouter.register(new AnthropicProvider(anthropicKey));
  aiRouter.register(new OllamaProvider());
  aiRouter.setFallback("ollama");
}

app.whenReady().then(async () => {
  initAIProviders();

  const advisorAgent = new AdvisorAgent(bus);
  const onboardingAgent = new OnboardingAgent(bus);
  const preventiveAgent = new PreventiveAgent(bus);
  const autoFixAgent = new AutoFixAgent(bus);
  const performanceAgent = new PerformanceAgent(bus);
  agentRuntime.register(advisorAgent);
  agentRuntime.register(onboardingAgent);
  agentRuntime.register(preventiveAgent);
  agentRuntime.register(autoFixAgent);
  agentRuntime.register(performanceAgent);
  await agentRuntime.startAll();

  bus.on("preventive:alert", (data) => {
    const alert = data as { title: string; description: string; severity: string };
    showNativeNotification(`Orchestra: ${alert.title}`, alert.description);
    updateTrayMenu(alert.severity === "danger" ? "error" : "warning");
  });

  registerIpcHandlers();
  createTray();
  await createMainWindow();
  await createLauncherWindow();
  registerShortcuts();

  void autoScanOnStartup();

  setTimeout(async () => {
    const update = await checkForUpdates();
    if (update.available && update.version && update.releaseNotes) {
      void promptUpdate(update.version, update.releaseNotes);
    }
  }, 10_000);

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
      await createLauncherWindow();
      registerShortcuts();
    }
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  void agentRuntime.stopAll();
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
