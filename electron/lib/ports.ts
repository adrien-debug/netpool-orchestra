import { execa } from "execa";
import type { PortItem, ServiceItem } from "../../src/shared/types.js";
import type { PortsRegistryConfig } from "./config.js";

export function parseLsofPort(line: string) {
  const parts = line.trim().split(/\s+/);
  const name = parts[0] ?? "unknown";
  const pid = Number(parts[1] ?? 0);
  const address = parts[8] ?? "";
  const maybePort = Number(address.split(":").pop());
  if (!Number.isFinite(maybePort)) return null;
  return { name, pid, port: maybePort };
}

export type PortRow = { name: string; pid: number; port: number };

export async function listPorts(): Promise<PortRow[]> {
  try {
    const { stdout } = await execa("bash", ["-lc", "lsof -nP -iTCP -sTCP:LISTEN | tail -n +2"], { timeout: 10000 });
    return stdout
      .split("\n")
      .map(parseLsofPort)
      .filter((row): row is PortRow => Boolean(row));
  } catch {
    return [];
  }
}

export async function buildPortRows(
  portsRaw: PortRow[],
  services: ServiceItem[],
  reservedPorts: PortsRegistryConfig["ports"]
): Promise<PortItem[]> {
  const reservedByPort = new Map<number, { project: string; notes?: string }>(
    reservedPorts.map((item) => [item.port, { project: item.project, notes: item.notes }])
  );

  const deduped = Array.from(
    new Map(portsRaw.map((row) => [`${row.pid}:${row.port}:${row.name}`, row])).values()
  );

  const activeRows = deduped
    .slice()
    .sort((a, b) => a.port - b.port)
    .map((row) => {
      const uniquePidsOnPort = new Set(deduped.filter((x) => x.port === row.port).map((x) => x.pid)).size;
      const service = services.find((svc) => svc.pids.includes(row.pid));
      const reserved = reservedByPort.get(row.port);
      return {
        id: `${row.pid}-${row.port}`,
        port: row.port,
        processName: row.name,
        pid: row.pid,
        status: uniquePidsOnPort > 1 ? "conflict" : "ok",
        serviceName: service?.name ?? reserved?.project
      } satisfies PortItem;
    });

  const activePortSet = new Set(activeRows.map((row) => row.port));
  const freeReservedRows: PortItem[] = reservedPorts
    .filter((item) => !activePortSet.has(item.port))
    .map((item) => ({
      id: `reserved-${item.port}`,
      port: item.port,
      processName: "libre",
      pid: 0,
      status: "free",
      serviceName: item.project
    }));

  return [...activeRows, ...freeReservedRows].sort((a, b) => a.port - b.port);
}
