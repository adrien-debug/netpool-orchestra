import psList from "ps-list";
import { execa } from "execa";
import type { Severity, ServiceItem } from "../../src/shared/types.js";
import { pushLog } from "./logger.js";

export function isProtectedProcess(cmd: string, name: string) {
  const cmdLower = (cmd ?? "").toLowerCase();
  const nameLower = (name ?? "").toLowerCase();

  if (nameLower === "cursor" || nameLower.includes("cursor helper")) return true;
  if (nameLower.includes("docker desktop")) return true;
  if (nameLower === "finder" || nameLower === "windowserver") return true;
  if (nameLower.includes("electron") && !nameLower.includes("node")) return true;
  if (cmdLower.includes("/applications/cursor.app/")) return true;
  if (cmdLower.includes("/applications/docker.app/")) return true;

  return false;
}

export async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function safeKillPid(pid: number, reasonScope: string) {
  const processes = await psList();
  const proc = processes.find((p) => p.pid === pid);
  if (!proc) return false;
  if (isProtectedProcess(proc.cmd ?? "", proc.name ?? "")) {
    pushLog("warn", `Skipped protected process ${proc.name} (${pid}).`, reasonScope);
    return false;
  }

  try {
    process.kill(pid, "SIGTERM");
    await sleep(250);
  } catch {
    return false;
  }

  const stillAlive = (await psList()).some((p) => p.pid === pid);
  if (stillAlive) {
    try {
      process.kill(pid, "SIGKILL");
      pushLog("warn", `Force killed PID ${pid}.`, reasonScope);
    } catch {
      pushLog("error", `Could not kill PID ${pid}.`, reasonScope);
      return false;
    }
  }
  return true;
}

export function processMatches(procCmd: string | undefined, procName: string | undefined, patterns: string[]) {
  const cmd = procCmd ?? "";
  const name = procName ?? "";
  return patterns.some((pattern) => cmd.includes(pattern) || name.includes(pattern));
}

export function elapsedToSeconds(raw: string) {
  const daySplit = raw.includes("-") ? raw.split("-") : null;
  let days = 0;
  let timePart = raw;
  if (daySplit) {
    days = Number(daySplit[0]) || 0;
    timePart = daySplit[1] ?? "00:00";
  }
  const t = timePart.split(":").map((x) => Number(x) || 0);
  if (t.length === 2) {
    const [m, s] = t;
    return days * 86400 + m * 60 + s;
  }
  const [h, m, s] = t;
  return days * 86400 + h * 3600 + m * 60 + s;
}

export function secondsToHuman(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "active";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatMemoryMB(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
}

export function statusFromInstances(
  instances: number,
  max: number,
  optional: boolean
): { status: ServiceItem["status"]; severity: Severity } {
  if (instances === 0) return { status: "stopped", severity: optional ? "info" : "neutral" };
  if (instances > max) return { status: "duplicate", severity: optional ? "warning" : "danger" };
  return { status: "healthy", severity: "success" };
}

export async function listZombieFindCandidates() {
  try {
    const { stdout } = await execa("bash", ["-lc", "ps -axo pid=,ppid=,stat=,comm=,etime="], { timeout: 10000 });
    if (!stdout.trim()) return [];

    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [pid, ppid, stat, comm, etime] = line.split(/\s+/);
        return {
          pid: Number(pid),
          ppid: Number(ppid),
          stat,
          comm,
          etime,
          ageSeconds: elapsedToSeconds(etime)
        };
      })
      .filter((row) => row.comm === "find" && (row.stat.includes("Z") || (row.ppid <= 1 && row.ageSeconds > 300)));
  } catch {
    return [];
  }
}
