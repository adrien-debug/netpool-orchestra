import { BaseAgent } from "./base-agent.js";
import type { AgentConfig } from "./base-agent.js";
import type { EventBus } from "./event-bus.js";
import type { RuntimeSnapshot, ServiceItem } from "../../src/shared/types.js";
import { metricsHistory } from "../lib/metrics-history.js";

export interface HealthScore {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  factors: HealthFactor[];
}

interface HealthFactor {
  id: string;
  label: string;
  score: number;
  weight: number;
  detail: string;
}

export interface TopConsumer {
  serviceId: string;
  serviceName: string;
  cpuPct: number;
  memoryMB: number;
}

export interface PerformanceRecommendation {
  id: string;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  actionId?: string;
  actionPayload?: Record<string, unknown>;
}

export class PerformanceAgent extends BaseAgent {
  private lastSnapshot: RuntimeSnapshot | null = null;
  private lastScore: HealthScore | null = null;
  private recommendations: PerformanceRecommendation[] = [];

  constructor(bus: EventBus) {
    const config: AgentConfig = {
      id: "performance",
      name: "Performance Agent",
      tickIntervalMs: 60_000,
      enabled: true
    };
    super(config, bus);
  }

  protected async onInit() {
    this.subscribe("snapshot:updated", (data) => this.onSnapshot(data as RuntimeSnapshot));
  }

  protected async onTick() {
    if (this.lastSnapshot) {
      this.lastScore = this.computeHealthScore(this.lastSnapshot);
      this.recommendations = this.generateRecommendations(this.lastSnapshot);
      this.bus.emit("performance:score-updated", this.lastScore);
    }
  }

  protected async onCleanup() {
    this.lastSnapshot = null;
    this.lastScore = null;
  }

  onSnapshot(snapshot: RuntimeSnapshot) {
    this.lastSnapshot = snapshot;
  }

  computeHealthScore(snapshot: RuntimeSnapshot): HealthScore {
    const factors: HealthFactor[] = [];

    // CPU factor (weight 25)
    const cpuMetric = snapshot.metrics.find((m) => m.id === "cpu");
    const cpuVal = cpuMetric ? parseFloat(cpuMetric.value) : 0;
    const cpuScore = Math.max(0, 100 - cpuVal);
    factors.push({ id: "cpu", label: "CPU", score: cpuScore, weight: 25, detail: `${cpuVal.toFixed(1)}% utilisé` });

    // RAM factor (weight 25)
    const ramMetric = snapshot.metrics.find((m) => m.id === "ram");
    const ramGB = ramMetric ? parseFloat(ramMetric.value) : 0;
    const ramScore = Math.min(100, ramGB * 10);
    factors.push({ id: "ram", label: "RAM", score: ramScore, weight: 25, detail: `${ramGB.toFixed(1)} GB disponible` });

    // Services health (weight 30)
    const total = snapshot.services.length || 1;
    const healthy = snapshot.services.filter((s) => s.status === "healthy").length;
    const svcScore = (healthy / total) * 100;
    factors.push({ id: "services", label: "Services", score: svcScore, weight: 30, detail: `${healthy}/${total} en bonne santé` });

    // Conflicts & duplicates (weight 20)
    const conflicts = snapshot.ports.filter((p) => p.status === "conflict").length;
    const duplicates = snapshot.services.filter((s) => s.instances > s.expectedInstances).length;
    const issueScore = Math.max(0, 100 - (conflicts * 15) - (duplicates * 10));
    factors.push({ id: "issues", label: "Problèmes", score: issueScore, weight: 20, detail: `${conflicts} conflits, ${duplicates} doublons` });

    const weightedSum = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
    const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
    const score = Math.round(weightedSum / totalWeight);

    const grade: HealthScore["grade"] =
      score >= 90 ? "A" :
      score >= 75 ? "B" :
      score >= 60 ? "C" :
      score >= 40 ? "D" : "F";

    return { score, grade, factors };
  }

  getTopConsumers(snapshot: RuntimeSnapshot, n = 5): TopConsumer[] {
    return snapshot.services
      .filter((s) => s.instances > 0)
      .map((s) => ({
        serviceId: s.id,
        serviceName: s.name,
        cpuPct: parseFloat(s.cpu) || 0,
        memoryMB: parseFloat(s.memory) || 0
      }))
      .sort((a, b) => b.memoryMB - a.memoryMB)
      .slice(0, n);
  }

  generateRecommendations(snapshot: RuntimeSnapshot): PerformanceRecommendation[] {
    const recs: PerformanceRecommendation[] = [];

    const duplicates = snapshot.services.filter((s) => s.instances > s.expectedInstances);
    if (duplicates.length) {
      recs.push({
        id: "clean-dups",
        title: "Nettoyer les doublons",
        description: `${duplicates.length} service(s) en doublon gaspillent des ressources.`,
        impact: "high",
        actionId: "clean-duplicates"
      });
    }

    const optionalRunning = snapshot.services.filter((s) => s.optional && s.instances > 0);
    const ramMetric = snapshot.metrics.find((m) => m.id === "ram");
    const ramGB = ramMetric ? parseFloat(ramMetric.value) : 99;
    if (ramGB < 4 && optionalRunning.length > 0) {
      recs.push({
        id: "stop-optional",
        title: "Arrêter les services optionnels",
        description: `${optionalRunning.length} service(s) optionnel(s) en cours. RAM faible (${ramGB.toFixed(1)} GB).`,
        impact: "medium"
      });
    }

    const avgCpu = metricsHistory.average("cpu", 10);
    if (avgCpu > 70) {
      recs.push({
        id: "reduce-cpu",
        title: "Réduire la charge CPU",
        description: `CPU moyen à ${avgCpu.toFixed(1)}% sur les dernières minutes.`,
        impact: "medium"
      });
    }

    const conflicts = snapshot.ports.filter((p) => p.status === "conflict");
    if (conflicts.length) {
      recs.push({
        id: "fix-ports",
        title: "Résoudre les conflits de ports",
        description: `${conflicts.length} port(s) en conflit.`,
        impact: "high",
        actionId: "repair-now"
      });
    }

    return recs;
  }

  getScore() { return this.lastScore; }
  getRecommendations() { return this.recommendations; }
}
