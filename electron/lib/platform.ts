import os from "node:os";
import { execa } from "execa";

export type Platform = "darwin" | "win32" | "linux";

export function currentPlatform(): Platform {
  return os.platform() as Platform;
}

export async function listPortsCrossPlatform(): Promise<{ name: string; pid: number; port: number }[]> {
  const platform = currentPlatform();

  if (platform === "darwin" || platform === "linux") {
    return listPortsUnix();
  }

  if (platform === "win32") {
    return listPortsWindows();
  }

  return [];
}

async function listPortsUnix(): Promise<{ name: string; pid: number; port: number }[]> {
  try {
    const cmd = currentPlatform() === "darwin"
      ? "lsof -nP -iTCP -sTCP:LISTEN | tail -n +2"
      : "ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null";

    const { stdout } = await execa("bash", ["-lc", cmd]);

    if (currentPlatform() === "darwin") {
      return stdout.split("\n").map((line) => {
        const parts = line.trim().split(/\s+/);
        const name = parts[0] ?? "unknown";
        const pid = Number(parts[1] ?? 0);
        const address = parts[8] ?? "";
        const port = Number(address.split(":").pop());
        if (!Number.isFinite(port)) return null;
        return { name, pid, port };
      }).filter((r): r is { name: string; pid: number; port: number } => r !== null);
    }

    // Linux ss output parsing
    return stdout.split("\n").filter((l) => l.includes("LISTEN")).map((line) => {
      const parts = line.trim().split(/\s+/);
      const local = parts[3] ?? "";
      const port = Number(local.split(":").pop());
      const pidMatch = (parts[5] ?? "").match(/pid=(\d+)/);
      const pid = pidMatch ? Number(pidMatch[1]) : 0;
      if (!Number.isFinite(port)) return null;
      return { name: "process", pid, port };
    }).filter((r): r is { name: string; pid: number; port: number } => r !== null);
  } catch {
    return [];
  }
}

async function listPortsWindows(): Promise<{ name: string; pid: number; port: number }[]> {
  try {
    const { stdout } = await execa("cmd", ["/c", "netstat -ano | findstr LISTENING"]);
    return stdout.split("\n").map((line) => {
      const parts = line.trim().split(/\s+/);
      const local = parts[1] ?? "";
      const port = Number(local.split(":").pop());
      const pid = Number(parts[4] ?? 0);
      if (!Number.isFinite(port)) return null;
      return { name: "process", pid, port };
    }).filter((r): r is { name: string; pid: number; port: number } => r !== null);
  } catch {
    return [];
  }
}

export async function killProcessCrossPlatform(pid: number, signal: "SIGTERM" | "SIGKILL" = "SIGTERM"): Promise<boolean> {
  const platform = currentPlatform();
  try {
    if (platform === "win32") {
      const flag = signal === "SIGKILL" ? "/F" : "";
      await execa("taskkill", [flag, "/PID", String(pid)].filter(Boolean));
    } else {
      process.kill(pid, signal);
    }
    return true;
  } catch {
    return false;
  }
}

export async function getProcessListCrossPlatform(): Promise<{ pid: number; name: string; cmd?: string }[]> {
  const platform = currentPlatform();
  try {
    if (platform === "win32") {
      const { stdout } = await execa("cmd", ["/c", 'tasklist /fo csv /nh']);
      return stdout.split("\n").filter(Boolean).map((line) => {
        const parts = line.replace(/"/g, "").split(",");
        return { pid: Number(parts[1] ?? 0), name: parts[0] ?? "unknown" };
      });
    }
    // macOS/Linux — use ps-list (already imported elsewhere)
    const psList = (await import("ps-list")).default;
    const procs = await psList();
    return procs.map((p) => ({ pid: p.pid, name: p.name ?? "", cmd: p.cmd }));
  } catch {
    return [];
  }
}
