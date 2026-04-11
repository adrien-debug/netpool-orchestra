import psList from "ps-list";
import pidusage from "pidusage";
import si from "systeminformation";
import { execa } from "execa";
import { promises as fs } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { z } from "zod";

type Severity = "info" | "success" | "warning" | "danger" | "neutral";
type HealthState = "healthy" | "degraded" | "duplicate" | "stopped" | "unknown";

type MetricItem = { id: string; label: string; value: string; hint?: string; tone: Severity };
type AlertItem = {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  actionLabel?: string;
  actionId?: string;
  actionPayload?: RuntimeActionPayload;
};
type ServiceItem = {
  id: string;
  name: string;
  kind: "mcp" | "web" | "dev" | "docker" | "system";
  status: HealthState;
  severity: Severity;
  optional?: boolean;
  instances: number;
  expectedInstances: number;
  pids: number[];
  cpu: string;
  memory: string;
  ports: number[];
  uptime: string;
};
type PortItem = {
  id: string;
  port: number;
  processName: string;
  pid: number;
  status: "ok" | "conflict" | "free";
  serviceName?: string;
};
type DockerItem = {
  id: string;
  containerId: string;
  name: string;
  image: string;
  state: string;
  status: string;
};
type LogItem = {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "success";
  message: string;
  scope: string;
};
type RuntimeActionPayload = { serviceId?: string; profileId?: string; port?: number };
type RuntimeActionResult = { ok: boolean; message: string; killed?: string[] };
type RuntimeSnapshot = {
  metrics: MetricItem[];
  alerts: AlertItem[];
  services: ServiceItem[];
  ports: PortItem[];
  docker: DockerItem[];
  logs: LogItem[];
};

const rootDir = path.resolve(process.cwd());
const servicesPath = path.join(rootDir, "config", "services.yaml");
const profilesPath = path.join(rootDir, "config", "profiles.yaml");
const portsRegistryPath = path.join(rootDir, "config", "ports.yaml");

const healthCheckSchema = z.object({
  type: z.enum(["port", "http"]),
  value: z.union([z.number().int().positive(), z.string()]),
  timeoutMs: z.number().int().positive().optional()
});

const serviceSchema = z.object({
  displayName: z.string().optional(),
  kind: z.enum(["mcp", "web", "dev", "docker", "system"]),
  cwd: z.string().optional(),
  start: z.string(),
  stop: z.string(),
  match: z.array(z.string()).min(1),
  maxInstances: z.number().int().positive(),
  ports: z.array(z.number()).default([]),
  healthCheck: healthCheckSchema.optional(),
  optional: z.boolean().optional()
});

const servicesSchema = z.object({
  services: z.record(serviceSchema)
});

const profileSchema = z.object({
  displayName: z.string().optional(),
  description: z.string().optional(),
  start: z.array(z.string()).optional(),
  stop: z.array(z.string()).optional(),
  steps: z.array(z.union([z.string(), z.record(z.any())])).optional()
});

const profilesSchema = z.object({
  profiles: z.record(profileSchema)
});

const reservedPortSchema = z.object({
  port: z.number().int().positive(),
  project: z.string().min(1),
  notes: z.string().optional()
});

const portsRegistrySchema = z.object({
  ports: z.array(reservedPortSchema).default([])
});

type ServicesConfig = z.infer<typeof servicesSchema>;
type PortsRegistryConfig = z.infer<typeof portsRegistrySchema>;
type ServiceMatch = {
  id: string;
  config: ServicesConfig["services"][string];
  processes: Awaited<ReturnType<typeof psList>>;
};

const runtimeLogs: LogItem[] = [];

function nowTime() {
  return new Date().toLocaleTimeString("fr-FR", { hour12: false });
}

function pushLog(level: LogItem["level"], message: string, scope: string) {
  runtimeLogs.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: nowTime(),
    level,
    message,
    scope
  });
  if (runtimeLogs.length > 200) runtimeLogs.length = 200;
}

function isProtectedProcess(cmd: string, name: string) {
  const cmdLower = (cmd ?? "").toLowerCase();
  const nameLower = (name ?? "").toLowerCase();

  if (nameLower === "cursor" || nameLower.includes("cursor helper")) return true;
  if (nameLower.includes("docker desktop")) return true;
  if (nameLower === "finder" || nameLower === "windowserver") return true;

  // Protect Electron shells but not regular Node runtimes.
  if (nameLower.includes("electron") && !nameLower.includes("node")) return true;
  if (cmdLower.includes("/applications/cursor.app/")) return true;
  if (cmdLower.includes("/applications/docker.app/")) return true;

  return false;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeKillPid(pid: number, reasonScope: string) {
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

async function readServiceConfig() {
  const raw = await fs.readFile(servicesPath, "utf8");
  return servicesSchema.parse(YAML.parse(raw));
}

async function readProfilesConfig() {
  const raw = await fs.readFile(profilesPath, "utf8");
  return profilesSchema.parse(YAML.parse(raw));
}

async function readPortsRegistryConfig(): Promise<PortsRegistryConfig> {
  try {
    const raw = await fs.readFile(portsRegistryPath, "utf8");
    return portsRegistrySchema.parse(YAML.parse(raw));
  } catch {
    return { ports: [] };
  }
}

function parseLsofPort(line: string) {
  const parts = line.trim().split(/\s+/);
  const name = parts[0] ?? "unknown";
  const pid = Number(parts[1] ?? 0);
  const address = parts[8] ?? "";
  const maybePort = Number(address.split(":").pop());
  if (!Number.isFinite(maybePort)) return null;
  return { name, pid, port: maybePort };
}

async function listPorts() {
  try {
    const { stdout } = await execa("bash", ["-lc", "lsof -nP -iTCP -sTCP:LISTEN | tail -n +2"]);
    return stdout
      .split("\n")
      .map(parseLsofPort)
      .filter((row): row is { name: string; pid: number; port: number } => Boolean(row));
  } catch {
    return [];
  }
}

async function listDockerContainers(): Promise<DockerItem[]> {
  try {
    const { stdout } = await execa("bash", [
      "-lc",
      "docker ps --format '{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.State}}\t{{.Status}}'"
    ]);

    if (!stdout.trim()) return [];

    return stdout.split("\n").map((line, index) => {
      const [containerId, name, image, state, status] = line.split("\t");
      return {
        id: `docker-${index}`,
        containerId,
        name,
        image,
        state,
        status
      };
    });
  } catch {
    return [];
  }
}

function elapsedToSeconds(raw: string) {
  // formats: MM:SS, HH:MM:SS, DD-HH:MM:SS
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

async function listZombieFindCandidates() {
  try {
    const { stdout } = await execa("bash", ["-lc", "ps -axo pid=,ppid=,stat=,comm=,etime="]);
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

function statusFromInstances(
  instances: number,
  max: number,
  optional: boolean
): { status: ServiceItem["status"]; severity: Severity } {
  if (instances === 0) return { status: "stopped", severity: optional ? "info" : "neutral" };
  if (instances > max) return { status: "duplicate", severity: optional ? "warning" : "danger" };
  return { status: "healthy", severity: "success" };
}

function formatMemoryMB(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
}

function processMatches(procCmd: string | undefined, procName: string | undefined, patterns: string[]) {
  const cmd = procCmd ?? "";
  const name = procName ?? "";
  return patterns.some((pattern) => cmd.includes(pattern) || name.includes(pattern));
}

async function collectServiceMatches(cfg: ServicesConfig) {
  const processes = await psList();

  const matches: ServiceMatch[] = Object.entries(cfg.services).map(([id, service]) => {
    const matched = processes.filter((proc) => processMatches(proc.cmd, proc.name, service.match));
    return { id, config: service, processes: matched };
  });

  return { processes, matches };
}

async function getServiceProcesses(serviceId: string, service: ServicesConfig["services"][string]) {
  const processes = await psList();
  const matched = processes.filter((proc) => processMatches(proc.cmd, proc.name, service.match));

  if (!matched.length) return matched;

  if (service.cwd) {
    const cwdScoped = matched.filter((proc) => (proc.cmd ?? "").includes(service.cwd!));
    if (cwdScoped.length) return cwdScoped;
  }

  if (service.kind === "web" && service.ports.length) {
    const portsRaw = await listPorts();
    const portScopedPids = new Set(
      portsRaw.filter((portRow) => service.ports.includes(portRow.port)).map((portRow) => portRow.pid)
    );
    const portScoped = matched.filter((proc) => portScopedPids.has(proc.pid));
    if (portScoped.length) return portScoped;
  }

  return matched;
}

async function cleanDuplicatesForService(
  serviceId: string,
  service: ServicesConfig["services"][string]
): Promise<string[]> {
  const matched = (await getServiceProcesses(serviceId, service)).sort((a, b) => a.pid - b.pid);
  const killed: string[] = [];
  if (matched.length <= service.maxInstances) return killed;

  const keep = matched.slice(0, service.maxInstances);
  const toKill = matched.filter((proc) => !keep.some((kept) => kept.pid === proc.pid));
  for (const proc of toKill) {
    const killedOk = await safeKillPid(proc.pid, `duplicates.clean.${serviceId}`);
    if (killedOk) killed.push(`${serviceId}:${proc.pid}`);
  }

  return killed;
}

async function getManagedPidSet(cfg: ServicesConfig) {
  const { matches } = await collectServiceMatches(cfg);
  return new Set(matches.flatMap((match) => match.processes.map((proc) => proc.pid)));
}

function secondsToHuman(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "active";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

async function checkServiceHealth(
  service: ServicesConfig["services"][string],
  portsRaw: { name: string; pid: number; port: number }[]
) {
  const healthCheck = service.healthCheck;
  if (!healthCheck) return true;

  if (healthCheck.type === "port") {
    const port = typeof healthCheck.value === "number" ? healthCheck.value : Number(healthCheck.value);
    if (!Number.isFinite(port)) return false;
    return portsRaw.some((row) => row.port === port);
  }

  if (healthCheck.type === "http") {
    const url = String(healthCheck.value);
    const timeoutMs = healthCheck.timeoutMs ?? 2000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  return true;
}

async function waitForServiceReady(
  serviceId: string,
  service: ServicesConfig["services"][string],
  timeoutMs = 10000
) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const processes = await getServiceProcesses(serviceId, service);
    if (processes.length) {
      if (!service.healthCheck) return true;
      const portsRaw = await listPorts();
      const healthy = await checkServiceHealth(service, portsRaw);
      if (healthy) return true;
    }
    await sleep(500);
  }
  return false;
}

function summarizeCriticalIssues(snapshot: RuntimeSnapshot) {
  const issues: string[] = [];

  for (const svc of snapshot.services) {
    if (svc.optional) continue;
    if (svc.instances === 0 || svc.status === "stopped") {
      issues.push(`${svc.id}: arrêté`);
    } else if (svc.instances > svc.expectedInstances || svc.status === "duplicate") {
      issues.push(`${svc.id}: doublon (${svc.instances}/${svc.expectedInstances})`);
    } else if (svc.status === "degraded") {
      issues.push(`${svc.id}: dégradé (check santé KO)`);
    }
  }

  const conflictPorts = [...new Set(snapshot.ports.filter((p) => p.status === "conflict").map((p) => p.port))];
  for (const port of conflictPorts) issues.push(`port ${port}: conflit`);

  return issues;
}

async function buildServiceRows(matches: ServiceMatch[], portRowsRaw: { name: string; pid: number; port: number }[]) {
  const rows: ServiceItem[] = [];
  for (const match of matches) {
    const pids = match.processes.map((p) => p.pid);
    const usage: Record<number, { cpu?: number; memory?: number; elapsed?: number }> = pids.length
      ? await pidusage(pids).catch(() => ({} as Record<number, { cpu?: number; memory?: number; elapsed?: number }>))
      : {};

    const cpu = Object.values(usage).reduce((sum, item) => sum + (item.cpu ?? 0), 0);
    const memory = Object.values(usage).reduce((sum, item) => sum + (item.memory ?? 0), 0);
    const maxElapsed = Object.values(usage).reduce((max, item) => Math.max(max, Math.floor((item.elapsed ?? 0) / 1000)), 0);
    const observedPorts = portRowsRaw
      .filter((portRow) => pids.includes(portRow.pid))
      .map((p) => p.port)
      .sort((a, b) => a - b);

    const state = statusFromInstances(match.processes.length, match.config.maxInstances, Boolean(match.config.optional));
    let status: ServiceItem["status"] = state.status;
    let severity: Severity = state.severity;

    if (state.status === "healthy" && match.config.healthCheck) {
      const healthy = await checkServiceHealth(match.config, portRowsRaw);
      if (!healthy) {
        status = "degraded";
        severity = "warning";
      }
    }

    rows.push({
      id: match.id,
      name: match.config.displayName ?? match.id,
      kind: match.config.kind,
      status,
      severity,
      optional: Boolean(match.config.optional),
      instances: match.processes.length,
      expectedInstances: match.config.maxInstances,
      pids,
      cpu: `${cpu.toFixed(1)}%`,
      memory: formatMemoryMB(memory),
      ports: observedPorts,
      uptime: match.processes.length ? secondsToHuman(maxElapsed) : "stopped"
    });
  }

  return rows.sort((a, b) => {
    const order = { duplicate: 0, degraded: 1, unknown: 2, healthy: 3, stopped: 4 } as const;
    return order[a.status] - order[b.status];
  });
}

async function buildPortRows(
  portsRaw: { name: string; pid: number; port: number }[],
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

  const rows = [...activeRows, ...freeReservedRows].sort((a, b) => a.port - b.port);
  return rows;
}

async function buildAlerts(
  services: ServiceItem[],
  ports: PortItem[],
  zombieFind: Awaited<ReturnType<typeof listZombieFindCandidates>>,
  memAvailable: number
) {
  const alerts: AlertItem[] = [];

  for (const svc of services) {
    if (svc.instances > svc.expectedInstances) {
      const optionalNote = svc.optional ? " (service optionnel)" : "";
      alerts.push({
        id: `${svc.id}-duplicate`,
        title: `${svc.instances}x ${svc.name} détecté${svc.instances > 1 ? "s" : ""}${optionalNote}`,
        description: `${svc.instances - svc.expectedInstances} doublon(s) peuvent être arrêtés en mode sécurisé.`,
        severity: svc.optional ? "warning" : "danger",
        actionLabel: "Nettoyer les doublons",
        actionId: "clean-duplicates"
      });
    }
    if (!svc.optional && svc.status === "degraded") {
      alerts.push({
        id: `${svc.id}-degraded`,
        title: `${svc.name} a échoué à un contrôle santé`,
        description: "Le service est démarré mais n’a pas passé le check de santé.",
        severity: "warning",
        actionLabel: "Relancer ce service",
        actionId: "service-restart",
        actionPayload: { serviceId: svc.id }
      });
    }
  }

  const conflictingPorts = [...new Set(ports.filter((p) => p.status === "conflict").map((p) => p.port))];
  for (const port of conflictingPorts) {
    alerts.push({
      id: `port-${port}`,
      title: `Conflit sur le port ${port}`,
      description: "Plusieurs processus écoutent le même port. Libération recommandée.",
      severity: "warning",
      actionLabel: "Libérer le port",
      actionId: "free-port",
      actionPayload: { port }
    });
  }

  if (zombieFind.length) {
    alerts.push({
      id: "zombie-find",
      title: `${zombieFind.length} processus find orphelin(s)`,
      description: "Des find anciens/orphelins ont été détectés et peuvent être nettoyés.",
      severity: "warning",
      actionLabel: "Nettoyer les zombies",
      actionId: "clean-zombies"
    });
  }

  if (memAvailable < 4 * 1024 * 1024 * 1024) {
    alerts.push({
      id: "memory-pressure",
      title: "Pression mémoire élevée",
      description: "La mémoire disponible est faible. Lance recovery pour stabiliser la machine.",
      severity: "warning",
      actionLabel: "Réparer maintenant",
      actionId: "repair-now"
    });
  }

  if (!alerts.length) {
    alerts.push({
      id: "healthy",
      title: "Aucune alerte critique détectée",
      description: "Les services critiques respectent les seuils de configuration.",
      severity: "success",
      actionLabel: "Scanner maintenant",
      actionId: "doctor"
    });
  }

  return alerts;
}

export async function getRuntimeSnapshot(): Promise<RuntimeSnapshot> {
  try {
    const [cfg, portsConfig, portsRaw, dockerRows, mem, load, zombieFind] = await Promise.all([
      readServiceConfig(),
      readPortsRegistryConfig(),
      listPorts(),
      listDockerContainers(),
      si.mem(),
      si.currentLoad(),
      listZombieFindCandidates()
    ]);

    const { processes, matches } = await collectServiceMatches(cfg);
    const services = await buildServiceRows(matches, portsRaw);
    const ports = await buildPortRows(portsRaw, services, portsConfig.ports);

    const managedPids = new Set(services.flatMap((svc) => svc.pids));
    const nodeProcesses = processes.filter((proc) => proc.name === "node");
    const unmanagedNode = nodeProcesses.filter((proc) => !managedPids.has(proc.pid));

    const memoryPressurePct = Math.max(0, Math.min(100, (1 - mem.available / mem.total) * 100));
    const metrics: MetricItem[] = [
      {
        id: "node",
        label: "Processus Node",
        value: `${nodeProcesses.length}`,
        hint: unmanagedNode.length ? `${unmanagedNode.length} non gérés` : "tous gérés",
        tone: unmanagedNode.length ? "warning" : "info"
      },
      {
        id: "docker",
        label: "Conteneurs Docker",
        value: `${dockerRows.length}`,
        hint: dockerRows.length ? "en cours" : "aucun",
        tone: dockerRows.length > 8 ? "warning" : "neutral"
      },
      {
        id: "cpu",
        label: "CPU",
        value: `${load.currentLoad.toFixed(1)}%`,
        hint: `idle ${(100 - load.currentLoad).toFixed(1)}%`,
        tone: load.currentLoad > 70 ? "warning" : "success"
      },
      {
        id: "ram",
        label: "RAM disponible",
        value: `${(mem.available / 1024 / 1024 / 1024).toFixed(1)} GB`,
        hint: `${memoryPressurePct.toFixed(0)}% de pression mémoire`,
        tone: mem.available < 4 * 1024 * 1024 * 1024 ? "warning" : "info"
      }
    ];

    const alerts = await buildAlerts(services, ports, zombieFind, mem.available);

    return {
      metrics,
      alerts,
      services,
      ports,
      docker: dockerRows,
      logs: ([
        {
          id: `snapshot-${Date.now()}`,
          timestamp: nowTime(),
          level: "info",
          message: "Snapshot actualisé.",
          scope: "runtime.snapshot"
        },
        ...runtimeLogs
      ] satisfies LogItem[]).slice(0, 100)
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur runtime inconnue";
    pushLog("error", `Snapshot failed: ${message}`, "runtime.snapshot");

    return {
      metrics: [],
      alerts: [
        {
          id: "snapshot-error",
          title: "Échec du snapshot runtime",
          description: message,
          severity: "danger",
          actionLabel: "Scanner maintenant",
          actionId: "doctor"
        }
      ],
      services: [],
      ports: [],
      docker: [],
      logs: [...runtimeLogs]
    };
  }
}

async function runShellCommand(command: string, cwd?: string) {
  const opts = cwd ? { cwd } : undefined;
  return execa("bash", ["-lc", command], opts);
}

async function startService(serviceId: string): Promise<RuntimeActionResult> {
  const cfg = await readServiceConfig();
  const service = cfg.services[serviceId];
  if (!service) return { ok: false, message: `Service not found: ${serviceId}` };

  let cwd: string | undefined;
  if (service.cwd) cwd = service.cwd;

  if (cwd) {
    try {
      await fs.access(cwd);
    } catch {
      const message = `Service path not found for ${serviceId}: ${cwd}`;
      pushLog("error", message, "service.start");
      return { ok: false, message };
    }
  }

  try {
    const child = execa("bash", ["-lc", service.start], {
      cwd,
      detached: true,
      stdio: "ignore"
    });
    child.unref();
    void child.catch((error: unknown) => {
      const msg = error instanceof Error ? error.message : "unknown spawn error";
      pushLog("error", `Detached start failed for ${serviceId}: ${msg}`, "service.start");
    });
    const ready = await waitForServiceReady(serviceId, service, service.healthCheck ? 14000 : 6000);
    if (!ready) {
      const message = `Démarrage ${serviceId} terminé mais santé non confirmée.`;
      pushLog("warn", message, "service.start");
      return { ok: false, message };
    }
    pushLog("success", `Service démarré: ${serviceId}.`, "service.start");
    return { ok: true, message: `Démarré: ${serviceId}.` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur de démarrage inconnue";
    pushLog("error", `Échec du démarrage ${serviceId}: ${message}`, "service.start");
    return { ok: false, message: `Échec du démarrage ${serviceId}: ${message}` };
  }
}

async function stopService(serviceId: string): Promise<RuntimeActionResult> {
  const cfg = await readServiceConfig();
  const service = cfg.services[serviceId];
  if (!service) return { ok: false, message: `Service not found: ${serviceId}` };

  let cwd: string | undefined;
  if (service.cwd) {
    try {
      await fs.access(service.cwd);
      cwd = service.cwd;
    } catch {
      cwd = undefined;
      pushLog("warn", `Service path missing for ${serviceId}, running stop without cwd.`, "service.stop");
    }
  }

  if (service.stop.includes("pkill")) {
    const matched = await getServiceProcesses(serviceId, service);
    if (!matched.length) {
      const message = `Aucun process en cours à arrêter pour ${serviceId}.`;
      pushLog("info", message, "service.stop");
      return { ok: true, message };
    }

    let killedCount = 0;
    for (const proc of matched) {
      if (await safeKillPid(proc.pid, `service.stop.${serviceId}`)) killedCount += 1;
    }

    const message = killedCount
      ? `Arrêté: ${serviceId} (${killedCount} process).`
      : `Arrêt partiel: ${serviceId} (aucun process stoppé).`;
    pushLog(killedCount ? "success" : "warn", message, "service.stop");
    return { ok: killedCount > 0, message };
  }

  try {
    await runShellCommand(service.stop, cwd);
    pushLog("success", `Service arrêté: ${serviceId}.`, "service.stop");
    return { ok: true, message: `Arrêté: ${serviceId}.` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur d’arrêt inconnue";
    pushLog("error", `Échec de l’arrêt ${serviceId}: ${message}`, "service.stop");
    return { ok: false, message: `Échec de l’arrêt ${serviceId}: ${message}` };
  }
}

async function restartService(serviceId: string): Promise<RuntimeActionResult> {
  const stopResult = await stopService(serviceId);
  await sleep(300);
  const startResult = await startService(serviceId);
  return {
    ok: stopResult.ok && startResult.ok,
    message: `Redémarrage ${serviceId}: ${stopResult.message} ${startResult.message}`
  };
}

async function cleanDuplicates(): Promise<RuntimeActionResult> {
  const cfg = await readServiceConfig();
  const killed: string[] = [];

  for (const [serviceId, service] of Object.entries(cfg.services)) {
    const serviceKilled = await cleanDuplicatesForService(serviceId, service);
    killed.push(...serviceKilled);
  }

  const message = killed.length ? `Doublons arrêtés: ${killed.length} process.` : "Aucun doublon détecté.";
  pushLog(killed.length ? "success" : "info", message, "duplicates.clean");
  return { ok: true, message, killed };
}

async function freePort(port: number): Promise<RuntimeActionResult> {
  if (!Number.isFinite(port) || port <= 0) {
    return { ok: false, message: "Port invalide." };
  }

  const cfg = await readServiceConfig();
  const managedPids = await getManagedPidSet(cfg);

  try {
    const { stdout } = await execa("bash", ["-lc", `lsof -ti tcp:${port}`]);
    const pids = stdout
      .split("\n")
      .filter(Boolean)
      .map((pid) => Number(pid))
      .filter((pid) => Number.isFinite(pid));
    const managedPortPids = pids.filter((pid) => managedPids.has(pid));

    let killedCount = 0;
    for (const pid of managedPortPids) {
      if (await safeKillPid(pid, "ports.free")) killedCount += 1;
    }

    const ignored = pids.length - managedPortPids.length;
    const message = killedCount
      ? `Port ${port} libéré (${killedCount} process gérés arrêtés${ignored > 0 ? `, ${ignored} process ignorés` : ""}).`
      : ignored > 0
        ? `Port ${port} non modifié (${ignored} process non gérés ignorés).`
        : `Port ${port} déjà libre.`;
    pushLog(killedCount ? "success" : "info", message, "ports.free");
    return { ok: true, message };
  } catch {
    const message = `Impossible d’inspecter le port ${port} (lsof a échoué).`;
    pushLog("error", message, "ports.free");
    return { ok: false, message };
  }
}

async function cleanZombieFind(): Promise<RuntimeActionResult> {
  const candidates = await listZombieFindCandidates();
  if (!candidates.length) {
    const message = "Aucun processus find zombie détecté.";
    pushLog("info", message, "zombies.clean");
    return { ok: true, message };
  }

  let killedCount = 0;
  for (const candidate of candidates) {
    if (await safeKillPid(candidate.pid, "zombies.clean")) killedCount += 1;
  }

  const message = killedCount
    ? `${killedCount} processus find zombie/orphelin(s) arrêtés.`
    : "Des find zombies ont été détectés mais aucun n’a pu être arrêté.";

  pushLog(killedCount ? "success" : "warn", message, "zombies.clean");
  return { ok: true, message };
}

async function runProfile(profileId: string): Promise<RuntimeActionResult> {
  const [profilesCfg, servicesCfg] = await Promise.all([readProfilesConfig(), readServiceConfig()]);
  const profile = profilesCfg.profiles[profileId];
  if (!profile) return { ok: false, message: `Profile not found: ${profileId}` };

  if (profile.steps && profile.steps.length) {
    const results: RuntimeActionResult[] = [];
    for (const step of profile.steps) {
      if (typeof step === "string") {
        if (step === "doctor") {
          await getRuntimeSnapshot();
          results.push({ ok: true, message: "doctor" });
          continue;
        }
        if (step === "cleanDuplicates") {
          results.push(await cleanDuplicates());
          continue;
        }
        if (step === "cleanZombies") {
          results.push(await cleanZombieFind());
          continue;
        }
        if (step === "freePort4000") {
          results.push(await freePort(4000));
          continue;
        }
        if (step.startsWith("profile:")) {
          const nextProfile = step.split(":")[1];
          if (nextProfile) results.push(await runProfile(nextProfile));
          continue;
        }
      }
      if (typeof step === "object" && step) {
        if ("profile" in step) {
          results.push(await runProfile(String((step as { profile: string }).profile)));
          continue;
        }
        if ("freePort" in step) {
          const value = Number((step as { freePort: number }).freePort);
          results.push(await freePort(value));
          continue;
        }
      }
      results.push({ ok: false, message: `Étape inconnue: ${JSON.stringify(step)}` });
    }
    const failed = results.filter((r) => !r.ok);
    const message = failed.length
      ? `Profil ${profileId} exécuté avec ${failed.length} problème(s).`
      : `Profil ${profileId} exécuté.`;
    pushLog(failed.length ? "warn" : "success", message, "profile.run");
    return { ok: failed.length === 0, message };
  }

  let startCount = 0;
  let stopCount = 0;
  const errors: string[] = [];

  for (const serviceId of profile.stop ?? []) {
    if (!servicesCfg.services[serviceId]) {
      errors.push(`Unknown service in profile stop: ${serviceId}`);
      continue;
    }
    const result = await stopService(serviceId);
    if (result.ok) stopCount += 1;
    else errors.push(result.message);
  }

  for (const serviceId of profile.start ?? []) {
    if (!servicesCfg.services[serviceId]) {
      errors.push(`Unknown service in profile start: ${serviceId}`);
      continue;
    }
    const service = servicesCfg.services[serviceId];
    const current = await getServiceProcesses(serviceId, service);
    if (current.length > service.maxInstances) {
      const cleaned = await cleanDuplicatesForService(serviceId, service);
      pushLog("warn", `Doublons nettoyés avant relance ${serviceId}: ${cleaned.length}`, "profile.run");
    }
    const postClean = await getServiceProcesses(serviceId, service);
    if (postClean.length > service.maxInstances) {
      errors.push(`Service ${serviceId} toujours en doublon (${postClean.length}/${service.maxInstances}).`);
      continue;
    }

    if (postClean.length > 0) {
      if (service.healthCheck) {
        const portsRaw = await listPorts();
        const healthy = await checkServiceHealth(service, portsRaw);
        if (!healthy) {
          const result = await restartService(serviceId);
          if (result.ok) startCount += 1;
          else errors.push(result.message);
          continue;
        }
      }
      pushLog("info", `Service déjà actif, démarrage ignoré: ${serviceId}.`, "profile.run");
      continue;
    }

    const result = await startService(serviceId);
    if (result.ok) startCount += 1;
    else errors.push(result.message);
  }

  const message = `Profil ${profileId} appliqué (start=${startCount}, stop=${stopCount}${errors.length ? `, erreurs=${errors.length}` : ""}).`;
  pushLog(errors.length ? "warn" : "success", message, "profile.run");
  return { ok: errors.length === 0, message };
}

async function freeSecondaryWebPorts() {
  const cfg = await readServiceConfig();
  const { matches } = await collectServiceMatches(cfg);
  const portsRaw = await listPorts();
  const results: string[] = [];

  for (const [serviceId, service] of Object.entries(cfg.services)) {
    if (service.kind !== "web" || service.ports.length === 0) continue;
    const matched = matches.find((match) => match.id === serviceId);
    const servicePids = new Set((matched?.processes ?? []).map((proc) => proc.pid));
    const primaryPort = service.ports[0] ?? 0;
    const related = portsRaw.filter((p) => servicePids.has(p.pid));

    for (const entry of related) {
      if (entry.port !== primaryPort) {
        const killed = await safeKillPid(entry.pid, "recovery.free-secondary-web-ports");
        if (killed) results.push(`${serviceId}:${entry.port}:${entry.pid}`);
      }
    }
  }

  if (results.length) {
    pushLog("success", `Ports web secondaires libérés: ${results.length}.`, "recovery.free-secondary-web-ports");
  }
}

async function runRecovery(): Promise<RuntimeActionResult> {
  const steps: RuntimeActionResult[] = [];

  steps.push(await cleanDuplicates());
  steps.push(await cleanZombieFind());
  steps.push(await freePort(4000));
  await freeSecondaryWebPorts();
  steps.push(await runProfile("focus"));

  const post = await getRuntimeSnapshot();
  const issues = summarizeCriticalIssues(post);
  const failed = steps.filter((step) => !step.ok);
  const message = failed.length
    ? `Récupération terminée avec ${failed.length} problème(s).`
    : issues.length
      ? `Récupération terminée, mais ${issues.length} problème(s) critique(s) subsistent.`
    : "Récupération terminée avec succès.";

  const ok = failed.length === 0 && issues.length === 0;
  pushLog(ok ? "success" : "warn", message, "recovery.run");
  return { ok, message };
}

async function runRepairNow(): Promise<RuntimeActionResult> {
  const snapshot = await getRuntimeSnapshot();
  const managedPids = new Set(snapshot.services.flatMap((svc) => svc.pids));
  const conflictPorts = [...new Set(snapshot.ports.filter((p) => p.status === "conflict").map((p) => p.port))];

  const steps: RuntimeActionResult[] = [];
  steps.push(await cleanDuplicates());
  steps.push(await cleanZombieFind());

  for (const port of conflictPorts) {
    try {
      const { stdout } = await execa("bash", ["-lc", `lsof -ti tcp:${port}`]);
      const pids = stdout
        .split("\n")
        .filter(Boolean)
        .map((pid) => Number(pid))
        .filter((pid) => Number.isFinite(pid) && managedPids.has(pid));

      let killedCount = 0;
      for (const pid of pids) {
        if (await safeKillPid(pid, "repair.free-port")) killedCount += 1;
      }

      const message = killedCount
        ? `Libération du port ${port} : ${killedCount} processus arrêté(s).`
        : `Port ${port} inchangé (aucun process géré à arrêter).`;
      steps.push({ ok: true, message });
    } catch {
      steps.push({ ok: true, message: `Port ${port} inchangé (non accessible).` });
    }
  }

  await freeSecondaryWebPorts();
  steps.push(await runProfile("focus"));

  const post = await getRuntimeSnapshot();
  const issues = summarizeCriticalIssues(post);
  const failed = steps.filter((step) => !step.ok);
  const message = failed.length
    ? `Réparation terminée avec ${failed.length} problème(s).`
    : issues.length
      ? `Réparation terminée, mais ${issues.length} problème(s) critique(s) subsistent.`
    : "Réparation terminée avec succès.";

  const ok = failed.length === 0 && issues.length === 0;
  pushLog(ok ? "success" : "warn", message, "repair.now");
  return { ok, message };
}

export async function runNamedAction(
  actionId: string,
  payload: RuntimeActionPayload = {}
): Promise<RuntimeActionResult | RuntimeSnapshot> {
  if (actionId === "doctor") {
    pushLog("info", "Scan demandé.", "doctor.run");
    return getRuntimeSnapshot();
  }

  if (actionId === "clean-duplicates") return cleanDuplicates();
  if (actionId === "clean-zombies") return cleanZombieFind();
  if (actionId === "free-port") return freePort(payload.port ?? 4000);
  if (actionId === "service-start") return payload.serviceId ? startService(payload.serviceId) : { ok: false, message: "Missing serviceId." };
  if (actionId === "service-stop") return payload.serviceId ? stopService(payload.serviceId) : { ok: false, message: "Missing serviceId." };
  if (actionId === "service-restart") return payload.serviceId ? restartService(payload.serviceId) : { ok: false, message: "Missing serviceId." };
  if (actionId === "profile-run") return payload.profileId ? runProfile(payload.profileId) : { ok: false, message: "Missing profileId." };
  if (actionId === "recovery-run") return runRecovery();
  if (actionId === "repair-now") return runRepairNow();

  return { ok: false, message: `Action inconnue: ${actionId}` };
}
