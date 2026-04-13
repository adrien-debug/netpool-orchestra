import { app, dialog } from "electron";
import Store from "electron-store";

const API_BASE = process.env.ORCHESTRA_API_URL ?? "https://orchestra-api-production.up.railway.app";

const store = new Store<{ authToken: string | null; userTier: string }>({
  defaults: { authToken: null, userTier: "free" }
});

export async function checkForUpdates(): Promise<{ available: boolean; version?: string; releaseNotes?: string }> {
  try {
    const res = await fetch(`${API_BASE}/updates/latest`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return { available: false };

    const data = await res.json() as {
      version: string;
      releaseNotes: string;
      downloadUrl: string | null;
      mandatory: boolean;
    };

    const current = app.getVersion();
    if (compareVersions(data.version, current) > 0) {
      return { available: true, version: data.version, releaseNotes: data.releaseNotes };
    }
    return { available: false };
  } catch {
    return { available: false };
  }
}

export async function promptUpdate(version: string, releaseNotes: string) {
  const { response } = await dialog.showMessageBox({
    type: "info",
    title: "Mise à jour disponible",
    message: `Orchestra ${version} est disponible.`,
    detail: releaseNotes,
    buttons: ["Mettre à jour", "Plus tard"],
    defaultId: 0
  });

  if (response === 0) {
    const { shell } = await import("electron");
    void shell.openExternal("https://orchestra.dev/download");
  }
}

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export interface LicenseStatus {
  valid: boolean;
  tier: "free" | "pro" | "team";
  features: {
    agents: boolean;
    chat: boolean;
    configSync: boolean;
    teamDashboard: boolean;
    metricsHistory30d: boolean;
  };
}

export async function validateLicense(): Promise<LicenseStatus> {
  const token = store.get("authToken");
  if (!token) {
    return {
      valid: false,
      tier: "free",
      features: { agents: false, chat: false, configSync: false, teamDashboard: false, metricsHistory30d: false }
    };
  }

  try {
    const res = await fetch(`${API_BASE}/license/validate`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) {
      return {
        valid: false,
        tier: "free",
        features: { agents: false, chat: false, configSync: false, teamDashboard: false, metricsHistory30d: false }
      };
    }

    const data = await res.json() as LicenseStatus;
    store.set("userTier", data.tier);
    return data;
  } catch {
    const cached = store.get("userTier") as string;
    return {
      valid: cached !== "free",
      tier: (cached ?? "free") as "free" | "pro" | "team",
      features: {
        agents: cached !== "free",
        chat: cached !== "free",
        configSync: cached !== "free",
        teamDashboard: cached === "team",
        metricsHistory30d: cached !== "free"
      }
    };
  }
}

export function setAuthToken(token: string) {
  store.set("authToken", token);
}

export function getAuthToken(): string | null {
  return store.get("authToken");
}

export function clearAuth() {
  store.set("authToken", null);
  store.set("userTier", "free");
}
