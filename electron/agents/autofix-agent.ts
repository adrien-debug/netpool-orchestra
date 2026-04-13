import { BaseAgent } from "./base-agent.js";
import type { AgentConfig } from "./base-agent.js";
import type { EventBus } from "./event-bus.js";
import type { RuntimeSnapshot, RuntimeActionResult } from "../../src/shared/types.js";
import { runNamedAction } from "../runtime.js";
import { pushLog } from "../lib/logger.js";

export type AutoFixMode = "suggest" | "auto";

interface FixRule {
  id: string;
  name: string;
  check: (snapshot: RuntimeSnapshot) => FixProposal | null;
  action: () => Promise<RuntimeActionResult>;
}

export interface FixProposal {
  ruleId: string;
  ruleName: string;
  description: string;
  severity: "warning" | "danger";
}

export interface FixExecutionLog {
  ruleId: string;
  timestamp: number;
  success: boolean;
  message: string;
}

const RATE_LIMIT = {
  maxActionsPerMinute: 5,
  circuitBreakerThreshold: 3
};

export class AutoFixAgent extends BaseAgent {
  private mode: AutoFixMode = "suggest";
  private pendingProposals: FixProposal[] = [];
  private executionLog: FixExecutionLog[] = [];
  private actionTimestamps: number[] = [];
  private consecutiveFailures = 0;
  private circuitOpen = false;
  private rules: FixRule[] = [];
  private protectedServices = new Set<string>();

  constructor(bus: EventBus) {
    const config: AgentConfig = {
      id: "autofix",
      name: "Auto-Fix Agent",
      tickIntervalMs: 30_000,
      enabled: true
    };
    super(config, bus);
    this.initRules();
  }

  protected async onInit() {
    this.subscribe("snapshot:updated", (data) => this.onSnapshot(data as RuntimeSnapshot));
  }

  protected async onTick() {
    this.cleanRateLimit();
    if (this.circuitOpen) {
      pushLog("warn", "Auto-Fix circuit breaker ouvert — mode suggest forcé.", "autofix");
    }
  }

  protected async onCleanup() {
    this.pendingProposals = [];
  }

  onSnapshot(snapshot: RuntimeSnapshot) {
    this.pendingProposals = [];

    for (const rule of this.rules) {
      const proposal = rule.check(snapshot);
      if (proposal) {
        this.pendingProposals.push(proposal);

        if (this.mode === "auto" && !this.circuitOpen && this.canExecute()) {
          void this.executeRule(rule);
        }
      }
    }

    if (this.pendingProposals.length) {
      this.bus.emit("autofix:proposals", this.pendingProposals);
    }
  }

  private initRules() {
    this.rules = [
      {
        id: "clean-duplicates",
        name: "Nettoyage doublons",
        check: (snapshot) => {
          const dups = snapshot.services.filter((s) => s.instances > s.expectedInstances);
          if (!dups.length) return null;
          return {
            ruleId: "clean-duplicates",
            ruleName: "Nettoyage doublons",
            description: `${dups.length} service(s) en doublon: ${dups.map((s) => s.name).join(", ")}`,
            severity: dups.some((s) => !s.optional) ? "danger" : "warning"
          };
        },
        action: () => runNamedAction("clean-duplicates") as Promise<RuntimeActionResult>
      },
      {
        id: "clean-zombies",
        name: "Nettoyage zombies find",
        check: (snapshot) => {
          const zombie = snapshot.alerts.find((a) => a.id === "zombie-find");
          if (!zombie) return null;
          return {
            ruleId: "clean-zombies",
            ruleName: "Nettoyage zombies",
            description: zombie.title,
            severity: "warning"
          };
        },
        action: () => runNamedAction("clean-zombies") as Promise<RuntimeActionResult>
      },
      {
        id: "restart-degraded",
        name: "Redémarrage services dégradés",
        check: (snapshot) => {
          const degraded = snapshot.services.filter(
            (s) => s.status === "degraded" && !s.optional && !this.protectedServices.has(s.id)
          );
          if (!degraded.length) return null;
          return {
            ruleId: "restart-degraded",
            ruleName: "Redémarrage dégradés",
            description: `${degraded.length} service(s) dégradé(s): ${degraded.map((s) => s.name).join(", ")}`,
            severity: "warning"
          };
        },
        action: async () => {
          // restart first degraded non-protected
          return runNamedAction("doctor") as Promise<RuntimeActionResult>;
        }
      },
      {
        id: "ram-emergency",
        name: "Urgence RAM",
        check: (snapshot) => {
          const ram = snapshot.metrics.find((m) => m.id === "ram");
          if (!ram) return null;
          const gb = parseFloat(ram.value);
          if (gb >= 2) return null;
          const optional = snapshot.services.filter((s) => s.optional && s.instances > 0);
          if (!optional.length) return null;
          return {
            ruleId: "ram-emergency",
            ruleName: "Urgence mémoire",
            description: `RAM disponible critique (${ram.value}). ${optional.length} service(s) optionnel(s) à arrêter.`,
            severity: "danger"
          };
        },
        action: async () => {
          return runNamedAction("clean-duplicates") as Promise<RuntimeActionResult>;
        }
      }
    ];
  }

  private canExecute(): boolean {
    this.cleanRateLimit();
    return this.actionTimestamps.length < RATE_LIMIT.maxActionsPerMinute;
  }

  private cleanRateLimit() {
    const cutoff = Date.now() - 60_000;
    this.actionTimestamps = this.actionTimestamps.filter((t) => t > cutoff);
  }

  private async executeRule(rule: FixRule) {
    this.actionTimestamps.push(Date.now());
    const log: FixExecutionLog = {
      ruleId: rule.id,
      timestamp: Date.now(),
      success: false,
      message: ""
    };

    try {
      const result = await rule.action();
      log.success = result.ok;
      log.message = result.message;

      if (result.ok) {
        this.consecutiveFailures = 0;
        pushLog("success", `Auto-fix: ${rule.name} — ${result.message}`, "autofix");
      } else {
        this.consecutiveFailures++;
        pushLog("warn", `Auto-fix: ${rule.name} partiel — ${result.message}`, "autofix");
      }
    } catch (err) {
      this.consecutiveFailures++;
      log.message = err instanceof Error ? err.message : "Erreur inconnue";
      pushLog("error", `Auto-fix: ${rule.name} échoué — ${log.message}`, "autofix");
    }

    this.executionLog.push(log);
    if (this.executionLog.length > 100) this.executionLog.splice(0, this.executionLog.length - 100);

    if (this.consecutiveFailures >= RATE_LIMIT.circuitBreakerThreshold) {
      this.circuitOpen = true;
      this.mode = "suggest";
      pushLog("error", "Auto-Fix: circuit breaker activé après 3 échecs consécutifs. Passage en mode suggest.", "autofix");
      this.bus.emit("autofix:circuit-open");
    }

    this.bus.emit("autofix:executed", log);
  }

  setMode(mode: AutoFixMode) {
    this.mode = mode;
    if (mode === "auto") {
      this.circuitOpen = false;
      this.consecutiveFailures = 0;
    }
    this.bus.emit("autofix:mode-changed", { mode });
  }

  getMode() { return this.mode; }
  isCircuitOpen() { return this.circuitOpen; }
  getProposals() { return this.pendingProposals; }
  getExecutionLog() { return this.executionLog; }

  protectService(serviceId: string) { this.protectedServices.add(serviceId); }
  unprotectService(serviceId: string) { this.protectedServices.delete(serviceId); }
}
