import { promises as fs } from "node:fs";
import path from "node:path";
import { rootDir } from "./config.js";

export interface MetricPoint {
  ts: number;
  cpu: number;
  ramAvailableGB: number;
  ramPressurePct: number;
  nodeProcesses: number;
  dockerContainers: number;
}

const MAX_POINTS = 120; // 1h at 30s intervals

class MetricsHistory {
  private buffer: MetricPoint[] = [];

  push(point: MetricPoint) {
    this.buffer.push(point);
    if (this.buffer.length > MAX_POINTS) {
      this.buffer = this.buffer.slice(-MAX_POINTS);
    }
  }

  getAll(): readonly MetricPoint[] {
    return this.buffer;
  }

  getLast(n: number): MetricPoint[] {
    return this.buffer.slice(-n);
  }

  get length() {
    return this.buffer.length;
  }

  trend(key: keyof Omit<MetricPoint, "ts">, windowSize = 10): "up" | "down" | "stable" {
    if (this.buffer.length < windowSize) return "stable";
    const window = this.buffer.slice(-windowSize);
    const first = window[0][key] as number;
    const last = window[window.length - 1][key] as number;
    const delta = last - first;
    const threshold = Math.abs(first) * 0.05 || 1;
    if (delta > threshold) return "up";
    if (delta < -threshold) return "down";
    return "stable";
  }

  average(key: keyof Omit<MetricPoint, "ts">, windowSize = 10): number {
    if (!this.buffer.length) return 0;
    const window = this.buffer.slice(-windowSize);
    return window.reduce((sum, p) => sum + (p[key] as number), 0) / window.length;
  }

  clear() {
    this.buffer = [];
  }
}

export const metricsHistory = new MetricsHistory();

const logsDir = path.join(rootDir, "logs");

export async function persistLogEntry(entry: { timestamp: string; level: string; message: string; scope: string }) {
  try {
    await fs.mkdir(logsDir, { recursive: true });
    const dateStr = new Date().toISOString().slice(0, 10);
    const logFile = path.join(logsDir, `orchestra-${dateStr}.log`);
    const line = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.scope}] ${entry.message}\n`;
    await fs.appendFile(logFile, line, "utf8");
  } catch {
    // silently fail — disk logging is best-effort
  }
}

export async function cleanOldLogs(retainDays = 7) {
  try {
    const files = await fs.readdir(logsDir);
    const cutoff = Date.now() - retainDays * 86400 * 1000;
    for (const file of files) {
      if (!file.startsWith("orchestra-") || !file.endsWith(".log")) continue;
      const dateMatch = file.match(/orchestra-(\d{4}-\d{2}-\d{2})\.log/);
      if (!dateMatch) continue;
      const fileDate = new Date(dateMatch[1]).getTime();
      if (fileDate < cutoff) {
        await fs.unlink(path.join(logsDir, file));
      }
    }
  } catch {
    // best-effort
  }
}
