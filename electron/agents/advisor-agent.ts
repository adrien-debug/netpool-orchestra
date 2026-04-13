import { BaseAgent } from "./base-agent.js";
import type { AgentConfig } from "./base-agent.js";
import type { EventBus } from "./event-bus.js";
import type { RuntimeSnapshot } from "../../src/shared/types.js";
import { aiRouter } from "../ai/router.js";
import { getRuntimeSnapshot, runNamedAction } from "../runtime.js";
import type { ChatMessage, ToolDefinition, ToolCall } from "../ai/provider.js";

const TOOLS: ToolDefinition[] = [
  {
    name: "scan_system",
    description: "Déclenche un scan complet et retourne le snapshot de la machine.",
    parameters: { type: "object", properties: {}, required: [] }
  },
  {
    name: "start_service",
    description: "Démarre un service géré par Orchestra.",
    parameters: { type: "object", properties: { serviceId: { type: "string", description: "ID du service" } }, required: ["serviceId"] }
  },
  {
    name: "stop_service",
    description: "Arrête un service géré par Orchestra.",
    parameters: { type: "object", properties: { serviceId: { type: "string", description: "ID du service" } }, required: ["serviceId"] }
  },
  {
    name: "restart_service",
    description: "Redémarre un service géré par Orchestra.",
    parameters: { type: "object", properties: { serviceId: { type: "string", description: "ID du service" } }, required: ["serviceId"] }
  },
  {
    name: "free_port",
    description: "Libère un port occupé par un process géré.",
    parameters: { type: "object", properties: { port: { type: "number", description: "Numéro du port" } }, required: ["port"] }
  },
  {
    name: "clean_duplicates",
    description: "Nettoie tous les doublons de services.",
    parameters: { type: "object", properties: {}, required: [] }
  },
  {
    name: "run_profile",
    description: "Exécute un profil Orchestra (focus, fullstack, etc.).",
    parameters: { type: "object", properties: { profileId: { type: "string", description: "ID du profil" } }, required: ["profileId"] }
  }
];

function buildSystemPrompt(snapshot: RuntimeSnapshot): string {
  const svcSummary = snapshot.services
    .map((s) => `- ${s.name} (${s.kind}): ${s.status}, ${s.instances}/${s.expectedInstances} instances, CPU ${s.cpu}, RAM ${s.memory}`)
    .join("\n") || "Aucun service détecté.";

  const alertSummary = snapshot.alerts
    .map((a) => `- [${a.severity}] ${a.title}: ${a.description}`)
    .join("\n") || "Aucune alerte.";

  const portConflicts = snapshot.ports.filter((p) => p.status === "conflict");
  const portSummary = portConflicts.length
    ? portConflicts.map((p) => `- Port ${p.port}: conflit (${p.processName} PID ${p.pid})`).join("\n")
    : "Aucun conflit de port.";

  const cpuMetric = snapshot.metrics.find((m) => m.id === "cpu");
  const ramMetric = snapshot.metrics.find((m) => m.id === "ram");

  return `Tu es Orchestra, un assistant expert en infrastructure de développement local macOS.
Tu aides le développeur à comprendre et optimiser son environnement de dev.

ÉTAT ACTUEL DE LA MACHINE :
CPU: ${cpuMetric?.value ?? "N/A"} (${cpuMetric?.hint ?? ""})
RAM disponible: ${ramMetric?.value ?? "N/A"} (${ramMetric?.hint ?? ""})

SERVICES :
${svcSummary}

ALERTES :
${alertSummary}

CONFLITS DE PORTS :
${portSummary}

RÈGLES :
- Réponds toujours en français.
- Sois concis et actionnable.
- Si tu recommandes une action, utilise les tools disponibles.
- Explique pourquoi avant d'agir.
- Ne fais jamais d'action destructive sans expliquer l'impact.`;
}

async function executeTool(call: ToolCall): Promise<string> {
  const args = call.arguments;
  switch (call.name) {
    case "scan_system": {
      const snap = await getRuntimeSnapshot();
      return `Scan terminé. ${snap.services.length} services, ${snap.alerts.length} alertes.`;
    }
    case "start_service": {
      const result = await runNamedAction("service-start", { serviceId: args.serviceId as string });
      return "message" in result ? (result as { message: string }).message : "Service démarré.";
    }
    case "stop_service": {
      const result = await runNamedAction("service-stop", { serviceId: args.serviceId as string });
      return "message" in result ? (result as { message: string }).message : "Service arrêté.";
    }
    case "restart_service": {
      const result = await runNamedAction("service-restart", { serviceId: args.serviceId as string });
      return "message" in result ? (result as { message: string }).message : "Service redémarré.";
    }
    case "free_port": {
      const result = await runNamedAction("free-port", { port: args.port as number });
      return "message" in result ? (result as { message: string }).message : "Port libéré.";
    }
    case "clean_duplicates": {
      const result = await runNamedAction("clean-duplicates");
      return "message" in result ? (result as { message: string }).message : "Doublons nettoyés.";
    }
    case "run_profile": {
      const result = await runNamedAction("profile-run", { profileId: args.profileId as string });
      return "message" in result ? (result as { message: string }).message : "Profil exécuté.";
    }
    default:
      return `Tool inconnu: ${call.name}`;
  }
}

export class AdvisorAgent extends BaseAgent {
  private lastSnapshot: RuntimeSnapshot | null = null;

  constructor(bus: EventBus) {
    const config: AgentConfig = {
      id: "advisor",
      name: "Advisor Agent",
      tickIntervalMs: 60_000,
      enabled: true
    };
    super(config, bus);
  }

  protected async onInit() {
    this.subscribe("snapshot:updated", (data) => {
      this.lastSnapshot = data as RuntimeSnapshot;
    });
  }

  protected async onTick() {
    // Advisor is reactive (chat-driven), no proactive tick needed
  }

  protected async onCleanup() {
    this.lastSnapshot = null;
  }

  onSnapshot(snapshot: RuntimeSnapshot) {
    this.lastSnapshot = snapshot;
  }

  async processChat(
    userMessages: ChatMessage[],
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const snapshot = this.lastSnapshot ?? await getRuntimeSnapshot();
    const systemPrompt = buildSystemPrompt(snapshot);

    const messages: ChatMessage[] = [...userMessages];
    const MAX_TOOL_ROUNDS = 5;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await aiRouter.chat(messages, {
        systemPrompt,
        tools: TOOLS
      });

      if (!response.toolCalls?.length) {
        if (onChunk) onChunk(response.content);
        return response.content;
      }

      messages.push({ role: "assistant", content: response.content || "" });

      for (const call of response.toolCalls) {
        const result = await executeTool(call);
        messages.push({
          role: "tool",
          content: result,
          toolCallId: call.id,
          name: call.name
        });
        this.bus.emit("advisor:tool-executed", { tool: call.name, result });
      }
    }

    return "Trop d'appels d'outils. Essaie de reformuler ta demande.";
  }
}
