import psList from "ps-list";
import pidusage from "pidusage";
import si from "systeminformation";
import { execa } from "execa";
import { promises as fs } from "node:fs";
import type {
  Severity,
  MetricItem,
  AlertItem,
  ServiceItem,
  PortItem,
  LogItem,
  RuntimeActionPayload,
  RuntimeActionResult,
  RuntimeSnapshot
} from "../src/shared/types.js";

import { nowTime, pushLog, getLogs } from "./lib/logger.js";
import { readServiceConfig, readProfilesConfig, readPortsRegistryConfig } from "./lib/config.js";
import type { ServicesConfig } from "./lib/config.js";
import {
  sleep,
  safeKillPid,
  processMatches,
  statusFromInstances,
  formatMemoryMB,
  secondsToHuman,
  listZombieFindCandidates
} from "./lib/process-utils.js";
import { listPorts, buildPortRows } from "./lib/ports.js";
import type { PortRow } from "./lib/ports.js";
import { listDockerContainers } from "./lib/docker.js";
import { checkServiceHealth } from "./lib/health.js";
import { actionQueue } from "./action-queue.js";
import { metricsHistory, persistLogEntry } from "./lib/metrics-history.js";
import type { MetricPoint } from "./lib/metrics-history.js";

type ServiceMatch = {
  id: string;
  config: ServicesConfig["services"][string];
  processes: Awaited<ReturnType<typeof psList>>;
};

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
    if (await safeKillPid(proc.pid, `duplicates.clean.${serviceId}`)) killed.push(`${serviceId}:${proc.pid}`);
  }
  return killed;
}

async function getManagedPidSet(cfg: ServicesConfig) {
  const { matches } = await collectServiceMatches(cfg);
  return new Set(matches.flatMap((match) => match.processes.map((proc) => proc.pid)));
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
    if (svc.instances === 0 || svc.status === "stopped") issues.push(`${svc.id}: arrêté`);
    else if (svc.instances > svc.expectedInstances || svc.status === "duplicate")
      issues.push(`${svc.id}: doublon (${svc.instances}/${svc.expectedInstances})`);
    else if (svc.status === "degraded") issues.push(`${svc.id}: dégradé (check santé KO)`);
  }
  const conflictPorts = [...new Set(snapshot.ports.filter((p) => p.status === "conflict").map((p) => p.port))];
  for (const port of conflictPorts) issues.push(`port ${port}: conflit`);
  return issues;
}

async function buildServiceRows(matches: ServiceMatch[], portRowsRaw: PortRow[]) {
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
        description: "Le service est démarré mais n'a pas passé le check de santé.",
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

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

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

    const point: MetricPoint = {
      ts: Date.now(),
      cpu: load.currentLoad,
      ramAvailableGB: mem.available / 1024 / 1024 / 1024,
      ramPressurePct: memoryPressurePct,
      nodeProcesses: nodeProcesses.length,
      dockerContainers: dockerRows.length
    };
    metricsHistory.push(point);

    const logEntry = { timestamp: nowTime(), level: "info" as const, message: "Snapshot actualisé.", scope: "runtime.snapshot" };
    void persistLogEntry(logEntry);

    return {
      metrics,
      alerts,
      services,
      ports,
      docker: dockerRows,
      logs: ([
        { id: `snapshot-${Date.now()}`, ...logEntry },
        ...getLogs()
      ] satisfies LogItem[]).slice(0, 100)
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur runtime inconnue";
    pushLog("error", `Snapshot failed: ${message}`, "runtime.snapshot");
    return {
      metrics: [],
      alerts: [{ id: "snapshot-error", title: "Échec du snapshot runtime", description: message, severity: "danger", actionLabel: "Scanner maintenant", actionId: "doctor" }],
      services: [],
      ports: [],
      docker: [],
      logs: [...getLogs()]
    };
  }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

async function runShellCommand(command: string, cwd?: string) {
  return execa("bash", ["-lc", command], cwd ? { cwd } : undefined);
}

async function startService(serviceId: string): Promise<RuntimeActionResult> {
  const cfg = await readServiceConfig();
  const service = cfg.services[serviceId];
  if (!service) return { ok: false, message: `Service not found: ${serviceId}` };

  let cwd: string | undefined;
  if (service.cwd) cwd = service.cwd;
  if (cwd) {
    try { await fs.access(cwd); } catch {
      const message = `Service path not found for ${serviceId}: ${cwd}`;
      pushLog("error", message, "service.start");
      return { ok: false, message };
    }
  }

  try {
    const child = execa("bash", ["-lc", service.start], { cwd, detached: true, stdio: "ignore" });
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
    try { await fs.access(service.cwd); cwd = service.cwd; } catch {
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
    const message = error instanceof Error ? error.message : "Erreur d'arrêt inconnue";
    pushLog("error", `Échec de l'arrêt ${serviceId}: ${message}`, "service.stop");
    return { ok: false, message: `Échec de l'arrêt ${serviceId}: ${message}` };
  }
}

async function restartService(serviceId: string): Promise<RuntimeActionResult> {
  const stopResult = await stopService(serviceId);
  await sleep(300);
  const startResult = await startService(serviceId);
  return { ok: stopResult.ok && startResult.ok, message: `Redémarrage ${serviceId}: ${stopResult.message} ${startResult.message}` };
}

async function cleanDuplicates(): Promise<RuntimeActionResult> {
  const cfg = await readServiceConfig();
  const killed: string[] = [];
  for (const [serviceId, service] of Object.entries(cfg.services)) {
    killed.push(...await cleanDuplicatesForService(serviceId, service));
  }
  const message = killed.length ? `Doublons arrêtés: ${killed.length} process.` : "Aucun doublon détecté.";
  pushLog(killed.length ? "success" : "info", message, "duplicates.clean");
  return { ok: true, message, killed };
}

async function freePort(port: number): Promise<RuntimeActionResult> {
  if (!Number.isFinite(port) || port <= 0) return { ok: false, message: "Port invalide." };
  const cfg = await readServiceConfig();
  const managedPids = await getManagedPidSet(cfg);

  try {
    const { stdout } = await execa("bash", ["-lc", `lsof -ti tcp:${port}`], { timeout: 5000 });
    const pids = stdout.split("\n").filter(Boolean).map(Number).filter((pid) => Number.isFinite(pid));
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
    if (ignored > 0) pushLog("warn", `Port ${port}: ${ignored} process non géré(s) ignoré(s) — vérifier manuellement (lsof -ti tcp:${port}).`, "ports.free");
    return { ok: killedCount > 0 || ignored === 0, message };
  } catch {
    const message = `Impossible d'inspecter le port ${port} (lsof a échoué).`;
    pushLog("error", message, "ports.free");
    return { ok: false, message };
  }
}

async function cleanZombieFind(): Promise<RuntimeActionResult> {
  const candidates = await listZombieFindCandidates();
  if (!candidates.length) {
    pushLog("info", "Aucun processus find zombie détecté.", "zombies.clean");
    return { ok: true, message: "Aucun processus find zombie détecté." };
  }
  let killedCount = 0;
  for (const candidate of candidates) {
    if (await safeKillPid(candidate.pid, "zombies.clean")) killedCount += 1;
  }
  const message = killedCount
    ? `${killedCount} processus find zombie/orphelin(s) arrêtés.`
    : "Des find zombies ont été détectés mais aucun n'a pu être arrêté.";
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
        if (step === "doctor") { await getRuntimeSnapshot(); results.push({ ok: true, message: "doctor" }); continue; }
        if (step === "cleanDuplicates") { results.push(await cleanDuplicates()); continue; }
        if (step === "cleanZombies") { results.push(await cleanZombieFind()); continue; }
        if (step.startsWith("freePort")) {
          const portNum = parseInt(step.replace("freePort", ""), 10);
          if (Number.isFinite(portNum) && portNum > 0) { results.push(await freePort(portNum)); continue; }
        }
        if (step.startsWith("profile:")) { const next = step.split(":")[1]; if (next) results.push(await runProfile(next)); continue; }
      }
      if (typeof step === "object" && step) {
        if ("profile" in step) { results.push(await runProfile(String((step as { profile: string }).profile))); continue; }
        if ("freePort" in step) { results.push(await freePort(Number((step as { freePort: number }).freePort))); continue; }
      }
      results.push({ ok: false, message: `Étape inconnue: ${JSON.stringify(step)}` });
    }
    const failed = results.filter((r) => !r.ok);
    const message = failed.length ? `Profil ${profileId} exécuté avec ${failed.length} problème(s).` : `Profil ${profileId} exécuté.`;
    pushLog(failed.length ? "warn" : "success", message, "profile.run");
    return { ok: failed.length === 0, message };
  }

  let startCount = 0;
  let stopCount = 0;
  const errors: string[] = [];

  for (const serviceId of profile.stop ?? []) {
    if (!servicesCfg.services[serviceId]) { errors.push(`Unknown service in profile stop: ${serviceId}`); continue; }
    const result = await stopService(serviceId);
    if (result.ok) stopCount += 1; else errors.push(result.message);
  }

  for (const serviceId of profile.start ?? []) {
    if (!servicesCfg.services[serviceId]) { errors.push(`Unknown service in profile start: ${serviceId}`); continue; }
    const service = servicesCfg.services[serviceId];
    const current = await getServiceProcesses(serviceId, service);
    if (current.length > service.maxInstances) {
      const cleaned = await cleanDuplicatesForService(serviceId, service);
      pushLog("warn", `Doublons nettoyés avant relance ${serviceId}: ${cleaned.length}`, "profile.run");
    }
    const postClean = await getServiceProcesses(serviceId, service);
    if (postClean.length > service.maxInstances) { errors.push(`Service ${serviceId} toujours en doublon (${postClean.length}/${service.maxInstances}).`); continue; }

    if (postClean.length > 0) {
      if (service.healthCheck) {
        const portsRaw = await listPorts();
        const healthy = await checkServiceHealth(service, portsRaw);
        if (!healthy) {
          const result = await restartService(serviceId);
          if (result.ok) startCount += 1; else errors.push(result.message);
          continue;
        }
      }
      pushLog("info", `Service déjà actif, démarrage ignoré: ${serviceId}.`, "profile.run");
      continue;
    }

    const result = await startService(serviceId);
    if (result.ok) startCount += 1; else errors.push(result.message);
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
        if (await safeKillPid(entry.pid, "recovery.free-secondary-web-ports")) results.push(`${serviceId}:${entry.port}:${entry.pid}`);
      }
    }
  }

  if (results.length) pushLog("success", `Ports web secondaires libérés: ${results.length}.`, "recovery.free-secondary-web-ports");
}

async function runRecovery(): Promise<RuntimeActionResult> {
  const steps: RuntimeActionResult[] = [];
  steps.push(await cleanDuplicates());
  steps.push(await cleanZombieFind());
  const cfg = await readServiceConfig();
  const webPorts = Object.values(cfg.services).flatMap((s) => s.ports);
  for (const port of webPorts) {
    steps.push(await freePort(port));
  }
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
  pushLog(failed.length === 0 && issues.length === 0 ? "success" : "warn", message, "recovery.run");
  return { ok: failed.length === 0 && issues.length === 0, message };
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
      const { stdout } = await execa("bash", ["-lc", `lsof -ti tcp:${port}`], { timeout: 5000 });
      const pids = stdout.split("\n").filter(Boolean).map(Number).filter((pid) => Number.isFinite(pid) && managedPids.has(pid));
      let killedCount = 0;
      for (const pid of pids) { if (await safeKillPid(pid, "repair.free-port")) killedCount += 1; }
      steps.push({ ok: true, message: killedCount ? `Port ${port}: ${killedCount} processus arrêté(s).` : `Port ${port} inchangé.` });
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
  pushLog(failed.length === 0 && issues.length === 0 ? "success" : "warn", message, "repair.now");
  return { ok: failed.length === 0 && issues.length === 0, message };
}

export function getMetricsHistory() {
  return metricsHistory.getAll();
}

// ---------------------------------------------------------------------------
// Action Router (all actions go through the ActionQueue)
// ---------------------------------------------------------------------------

export async function runNamedAction(
  actionId: string,
  payload: RuntimeActionPayload = {}
): Promise<RuntimeActionResult | RuntimeSnapshot> {
  if (actionId === "doctor") {
    pushLog("info", "Scan demandé.", "doctor.run");
    return getRuntimeSnapshot();
  }

  return actionQueue.enqueue(actionId, async () => {
    if (actionId === "clean-duplicates") return cleanDuplicates();
    if (actionId === "clean-zombies") return cleanZombieFind();
    if (actionId === "free-port") {
      if (!payload.port) return { ok: false, message: "Missing port number." };
      return freePort(payload.port);
    }
    if (actionId === "service-start") return payload.serviceId ? startService(payload.serviceId) : { ok: false, message: "Missing serviceId." };
    if (actionId === "service-stop") return payload.serviceId ? stopService(payload.serviceId) : { ok: false, message: "Missing serviceId." };
    if (actionId === "service-restart") return payload.serviceId ? restartService(payload.serviceId) : { ok: false, message: "Missing serviceId." };
    if (actionId === "profile-run") return payload.profileId ? runProfile(payload.profileId) : { ok: false, message: "Missing profileId." };
    if (actionId === "recovery-run") return runRecovery();
    if (actionId === "repair-now") return runRepairNow();
    return { ok: false, message: `Action inconnue: ${actionId}` };
  });
}
