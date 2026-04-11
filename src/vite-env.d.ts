/// <reference types="vite/client" />

import type { RuntimeActionPayload } from "@shared/types";

declare global {
  interface Window {
    orchestra: {
      version: () => Promise<string>;
      toggleLauncher: () => Promise<boolean>;
      getRuntimeSnapshot: () => Promise<unknown>;
      runAction: (actionId: string, payload?: RuntimeActionPayload) => Promise<unknown>;
    };
  }
}

export {};
