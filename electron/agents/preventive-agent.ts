import { BaseAgent } from "./base-agent.js";
import type { AgentConfig } from "./base-agent.js";
import type { EventBus } from "./event-bus.js";
import type { RuntimeSnapshot } from "../../src/shared/types.js";
import { metricsHistory } from "../lib/metrics-history.js";

export interface PreventiveAlert {
  id: string;
  type: "ram_rising" | "cpu_spike" | "duplicate_detected" | "crash_loop" | "port_conflict_new";
  title: string;
  description: string;
  severity: "warning" | "danger";
  timestamp: number;
}

const THRESHOLDS = {
  ramPressureWarning: 80,
  ramPressureCritical: 90,
  cpuSpikeThreshold: 85,
  duplicateReaction: true,
  crashLoopCount: 3,
  crashLoopWindowMs: 3600_000
};

interface ServiceCrashRecord {
  serviceId: string;
  timestamps: number[];
}

export class PreventiveAgent extends BaseAgent {
  private activeAlerts = new Map<string, PreventiveAlert>();
  private crashHistory = new Map<string, ServiceCrashRecord>();
  private previousServiceMap = new Map<string, number>();

  constructor(bus: EventBus) {
    const config: AgentConfig = {
      id: "preventive",
      name: "Preventive Agent",
      tickIntervalMs: 30_000,
      enabled: true
    };
    super(config, bus);
  }

  protected async onInit() {
    this.subscribe("snapshot:updated", (data) => this.onSnapshot(data as RuntimeSnapshot));
  }

  protected async onTick() {
    this.checkRamTrend();
    this.checkCpuSpike();
    this.cleanOldCrashes();
  }

  protected async onCleanup() {
    this.activeAlerts.clear();
    this.crashHistory.clear();
  }

  onSnapshot(snapshot: RuntimeSnapshot) {
    this.checkDuplicates(snapshot);
    this.checkPortConflicts(snapshot);
    this.trackCrashLoops(snapshot);
  }

  private checkRamTrend() {
    const trend = metricsHistory.trend("ramPressurePct", 10);
    const avgPressure = metricsHistory.average("ramPressurePct", 5);

    if (trend === "up" && avgPressure > THRESHOLDS.ramPressureWarning) {
      this.raiseAlert({
        id: "ram-rising",
        type: "ram_rising",
        title: "RAM en hausse constante",
        description: `Pression mémoire à ${avgPressure.toFixed(0)}% et en augmentation. Risque de swap dans ~20 min.`,
        severity: avgPressure > THRESHOLDS.ramPressureCritical ? "danger" : "warning",
        timestamp: Date.now()
      });
    } else if (trend !== "up" || avgPressure < THRESHOLDS.ramPressureWarning - 10) {
      this.resolveAlert("ram-rising");
    }
  }

  private checkCpuSpike() {
    const avg = metricsHistory.average("cpu", 5);
    if (avg > THRESHOLDS.cpuSpikeThreshold) {
      this.raiseAlert({
        id: "cpu-spike",
        type: "cpu_spike",
        title: "CPU élevé",
        description: `Moyenne CPU à ${avg.toFixed(1)}% sur les 2.5 dernières minutes.`,
        severity: "warning",
        timestamp: Date.now()
      });
    } else {
      this.resolveAlert("cpu-spike");
    }
  }

  private checkDuplicates(snapshot: RuntimeSnapshot) {
    for (const svc of snapshot.services) {
      if (svc.instances > svc.expectedInstances) {
        this.raiseAlert({
          id: `dup-${svc.id}`,
          type: "duplicate_detected",
          title: `Doublons détectés: ${svc.name}`,
          description: `${svc.instances} instances au lieu de ${svc.expectedInstances}.`,
          severity: svc.optional ? "warning" : "danger",
          timestamp: Date.now()
        });
      } else {
        this.resolveAlert(`dup-${svc.id}`);
      }
    }
  }

  private checkPortConflicts(snapshot: RuntimeSnapshot) {
    const conflicting = new Set(snapshot.ports.filter((p) => p.status === "conflict").map((p) => p.port));
    for (const port of conflicting) {
      this.raiseAlert({
        id: `port-conflict-${port}`,
        type: "port_conflict_new",
        title: `Conflit port ${port}`,
        description: `Plusieurs processus écoutent sur le port ${port}.`,
        severity: "warning",
        timestamp: Date.now()
      });
    }
  }

  private trackCrashLoops(snapshot: RuntimeSnapshot) {
    const now = Date.now();
    for (const svc of snapshot.services) {
      const prev = this.previousServiceMap.get(svc.id) ?? 0;
      if (prev > 0 && svc.instances === 0 && !svc.optional) {
        let record = this.crashHistory.get(svc.id);
        if (!record) {
          record = { serviceId: svc.id, timestamps: [] };
          this.crashHistory.set(svc.id, record);
        }
        record.timestamps.push(now);
        record.timestamps = record.timestamps.filter((t) => now - t < THRESHOLDS.crashLoopWindowMs);

        if (record.timestamps.length >= THRESHOLDS.crashLoopCount) {
          this.raiseAlert({
            id: `crash-loop-${svc.id}`,
            type: "crash_loop",
            title: `Crash loop: ${svc.name}`,
            description: `${svc.name} a crashé ${record.timestamps.length} fois dans la dernière heure.`,
            severity: "danger",
            timestamp: now
          });
        }
      }
      this.previousServiceMap.set(svc.id, svc.instances);
    }
  }

  private cleanOldCrashes() {
    const now = Date.now();
    for (const [id, record] of this.crashHistory) {
      record.timestamps = record.timestamps.filter((t) => now - t < THRESHOLDS.crashLoopWindowMs);
      if (!record.timestamps.length) this.crashHistory.delete(id);
    }
  }

  private raiseAlert(alert: PreventiveAlert) {
    const existing = this.activeAlerts.get(alert.id);
    if (existing && existing.description === alert.description) return;
    this.activeAlerts.set(alert.id, alert);
    this.bus.emit("preventive:alert", alert);
  }

  private resolveAlert(id: string) {
    if (this.activeAlerts.has(id)) {
      this.activeAlerts.delete(id);
      this.bus.emit("preventive:alert-resolved", { id });
    }
  }

  getActiveAlerts(): PreventiveAlert[] {
    return Array.from(this.activeAlerts.values());
  }
}
