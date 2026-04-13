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

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

export interface ConfirmRequest {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}

interface AppState {
  currentPath: string;
  snapshot: RuntimeSnapshot;
  simpleMode: boolean;
  loading: boolean;
  toasts: Toast[];
  confirmDialog: ConfirmRequest | null;
  setPath: (path: string) => void;
  setSimpleMode: (value: boolean) => void;
  toggleSimpleMode: () => void;
  refresh: () => Promise<void>;
  runAction: (actionId: string, payload?: RuntimeActionPayload) => Promise<void>;
  addToast: (message: string, type?: Toast["type"]) => void;
  dismissToast: (id: string) => void;
  requestConfirm: (req: ConfirmRequest) => void;
  clearConfirm: () => void;
}

let toastCounter = 0;

const DESTRUCTIVE_ACTIONS = new Set([
  "repair-now", "recovery-run", "clean-duplicates",
  "clean-zombies", "service-stop", "service-restart"
]);

export const useAppStore = create<AppState>((set, get) => ({
  currentPath: "/",
  snapshot: emptySnapshot,
  simpleMode: initialSimpleMode,
  loading: false,
  toasts: [],
  confirmDialog: null,

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

  addToast: (message, type = "info") => {
    const id = `toast-${++toastCounter}`;
    set((s) => ({ toasts: [...s.toasts.slice(-4), { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  requestConfirm: (req) => set({ confirmDialog: req }),
  clearConfirm: () => set({ confirmDialog: null }),

  refresh: async () => {
    if (!window.orchestra) {
      get().addToast("Backend local introuvable. Ouvre l'app dans Electron.", "error");
      set({ snapshot: emptySnapshot });
      return;
    }

    set({ loading: true });
    try {
      const snapshot = (await window.orchestra.getRuntimeSnapshot()) as RuntimeSnapshot;
      set({ snapshot, loading: false });
    } catch {
      set({ snapshot: emptySnapshot, loading: false });
      get().addToast("Backend runtime injoignable.", "error");
    }
  },

  runAction: async (actionId, payload) => {
    const { addToast } = get();

    const executeAction = async () => {
      set({ loading: true });
      try {
        const result = (await window.orchestra.runAction(actionId, payload)) as RuntimeActionResult | RuntimeSnapshot;
        if ("metrics" in result) {
          set({ snapshot: result, loading: false });
          addToast("Scan terminé.", "success");
        } else {
          set({ loading: false });
          addToast(result.message ?? "Action exécutée.", result.ok ? "success" : "warning");
        }

        if (actionId !== "doctor") {
          try {
            const snapshot = (await window.orchestra.getRuntimeSnapshot()) as RuntimeSnapshot;
            set({ snapshot });
          } catch { /* noop */ }
        }
      } catch {
        set({ loading: false });
        addToast(`Action échouée: ${actionId}`, "error");
      }
    };

    if (DESTRUCTIVE_ACTIONS.has(actionId)) {
      get().requestConfirm({
        title: "Confirmer l'action",
        description: `Exécuter "${actionId}"${payload?.serviceId ? ` sur ${payload.serviceId}` : ""} ?`,
        confirmLabel: "Confirmer",
        onConfirm: () => {
          get().clearConfirm();
          void executeAction();
        }
      });
    } else {
      await executeAction();
    }
  }
}));
