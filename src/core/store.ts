import { create } from "zustand";
import type { RuntimeActionPayload, RuntimeActionResult, RuntimeSnapshot } from "@shared/types";

const emptySnapshot: RuntimeSnapshot = {
  metrics: [],
  alerts: [],
  services: [],
  ports: [],
  docker: [],
  logs: []
};

const initialSimpleMode = (() => {
  if (typeof window === "undefined") return true;
  const raw = window.localStorage.getItem("orchestra.simpleMode");
  if (raw === "false") return false;
  if (raw === "true") return true;
  return true;
})();

interface AppState {
  currentPath: string;
  snapshot: RuntimeSnapshot;
  actionMessage: string | null;
  simpleMode: boolean;
  setPath: (path: string) => void;
  setSimpleMode: (value: boolean) => void;
  toggleSimpleMode: () => void;
  refresh: () => Promise<void>;
  runAction: (actionId: string, payload?: RuntimeActionPayload) => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  currentPath: "/",
  snapshot: emptySnapshot,
  actionMessage: null,
  simpleMode: initialSimpleMode,
  setPath: (path) => set({ currentPath: path }),
  setSimpleMode: (value) => {
    if (typeof window !== "undefined") window.localStorage.setItem("orchestra.simpleMode", String(value));
    set({ simpleMode: value });
  },
  toggleSimpleMode: () =>
    set((state) => {
      const next = !state.simpleMode;
      if (typeof window !== "undefined") window.localStorage.setItem("orchestra.simpleMode", String(next));
      return { simpleMode: next };
    }),
  refresh: async () => {
    if (!window.orchestra) {
      set({
        snapshot: emptySnapshot,
        actionMessage: "Backend local introuvable. Ouvre l’app dans Electron (npm run dev), pas dans un onglet navigateur."
      });
      return;
    }

    try {
      const snapshot = (await window.orchestra.getRuntimeSnapshot()) as RuntimeSnapshot;
      set({ snapshot, actionMessage: "Snapshot actualisé." });
    } catch {
      set({ snapshot: emptySnapshot, actionMessage: "Backend runtime injoignable. Vérifie la console Electron." });
    }
  },
  runAction: async (actionId, payload) => {
    try {
      const result = (await window.orchestra.runAction(actionId, payload)) as RuntimeActionResult | RuntimeSnapshot;
      if ("metrics" in result) {
        set({ snapshot: result, actionMessage: "Scan terminé." });
      } else {
        set({ actionMessage: result.message ?? "Action exécutée." });
      }

      if (actionId !== "doctor") {
        try {
          const snapshot = (await window.orchestra.getRuntimeSnapshot()) as RuntimeSnapshot;
          set({ snapshot });
        } catch {
          // noop
        }
      }
    } catch {
      set({ actionMessage: `Action échouée: ${actionId}` });
    }
  }
}));
