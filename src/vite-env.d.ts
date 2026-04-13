/// <reference types="vite/client" />

import type { RuntimeActionPayload } from "@shared/types";

declare global {
  interface Window {
    orchestra: {
      version: () => Promise<string>;
      toggleLauncher: () => Promise<boolean>;
      getRuntimeSnapshot: () => Promise<unknown>;
      runAction: (actionId: string, payload?: RuntimeActionPayload) => Promise<unknown>;
      getAgentStatus: () => Promise<{ id: string; name: string; state: string }[]>;
      getMetricsHistory: () => Promise<unknown[]>;
      ai: {
        setKey: (providerId: string, key: string) => Promise<boolean>;
        removeKey: (providerId: string) => Promise<boolean>;
        listProviders: () => Promise<{ providers: { id: string; name: string }[]; active: string | null; configured: string[] }>;
        setActive: (providerId: string) => Promise<boolean>;
        chat: (messages: { role: string; content: string }[], options?: Record<string, unknown>) => Promise<{ content: string; finishReason: string }>;
        chatStream: (messages: { role: string; content: string }[], options?: Record<string, unknown>) => Promise<void>;
        onStreamChunk: (cb: (chunk: string) => void) => () => void;
        onStreamDone: (cb: () => void) => () => void;
        onStreamError: (cb: (err: string) => void) => () => void;
      };
    };
  }
}

export {};
