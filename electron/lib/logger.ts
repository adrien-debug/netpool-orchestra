import type { LogItem } from "../../src/shared/types.js";

const runtimeLogs: LogItem[] = [];

export function nowTime() {
  return new Date().toLocaleTimeString("fr-FR", { hour12: false });
}

export function pushLog(level: LogItem["level"], message: string, scope: string) {
  runtimeLogs.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: nowTime(),
    level,
    message,
    scope
  });
  if (runtimeLogs.length > 200) runtimeLogs.length = 200;
}

export function getLogs(): readonly LogItem[] {
  return runtimeLogs;
}
