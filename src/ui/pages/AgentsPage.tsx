import { Section } from "@ui/components";
import { Activity, AlertTriangle, CheckCircle, Wrench, Shield, XCircle } from "lucide-react";

interface AgentStatus {
  id: string;
  name: string;
  description: string;
  state: "idle" | "running" | "stopped" | "error";
  mode?: "suggest" | "auto";
  activeAlerts?: number;
  proposals?: number;
  executionCount?: number;
  lastAction?: string;
}

// Mock data - à remplacer par des vrais appels IPC
const AGENTS: AgentStatus[] = [
  {
    id: "preventive",
    name: "Preventive Agent",
    description: "Détecte les problèmes avant qu'ils ne deviennent critiques (doublons, ports, crash loops)",
    state: "running",
    activeAlerts: 2,
    lastAction: "Détection de 2 services dupliqués"
  },
  {
    id: "autofix",
    name: "Auto-Fix Agent",
    description: "Propose et exécute des corrections automatiques selon le mode configuré",
    state: "running",
    mode: "suggest",
    proposals: 3,
    executionCount: 0,
    lastAction: "Proposition: Nettoyer les doublons"
  },
  {
    id: "advisor",
    name: "Advisor Agent",
    description: "Fournit des recommandations contextuelles et des insights sur ton environnement",
    state: "idle",
    lastAction: "Aucune action récente"
  },
  {
    id: "performance",
    name: "Performance Agent",
    description: "Surveille les métriques de performance et suggère des optimisations",
    state: "stopped",
    lastAction: "Agent désactivé"
  },
  {
    id: "onboarding",
    name: "Onboarding Agent",
    description: "Guide les nouveaux utilisateurs et propose des actions de configuration",
    state: "idle",
    lastAction: "Tour guidé complété"
  }
];

const stateIcons = {
  idle: Activity,
  running: CheckCircle,
  stopped: XCircle,
  error: AlertTriangle
};

const stateColors = {
  idle: "neutral",
  running: "success",
  stopped: "neutral",
  error: "danger"
};

export function AgentsPage() {
  return (
    <div className="page">
      <Section
        title="Agents Intelligents"
        description="Les agents surveillent ton environnement et proposent des actions automatiques."
      >
        <div className="stack">
          {AGENTS.map((agent) => {
            const Icon = stateIcons[agent.state];
            const color = stateColors[agent.state];

            return (
              <div key={agent.id} className="tile">
                <div className="row" style={{ alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                      <Icon size={20} className={`icon-${color}`} />
                      <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>{agent.name}</h3>
                      <span className={`badge badge-${color}`}>{agent.state}</span>
                      {agent.mode && (
                        <span className="badge badge-info">{agent.mode}</span>
                      )}
                    </div>
                    <p style={{ margin: "0 0 12px 0", color: "var(--text-secondary)", fontSize: "14px" }}>
                      {agent.description}
                    </p>
                    <div style={{ display: "flex", gap: "16px", fontSize: "13px", color: "var(--text-secondary)" }}>
                      {agent.activeAlerts !== undefined && (
                        <div>
                          <AlertTriangle size={14} style={{ verticalAlign: "middle", marginRight: "4px" }} />
                          {agent.activeAlerts} alertes actives
                        </div>
                      )}
                      {agent.proposals !== undefined && (
                        <div>
                          <Wrench size={14} style={{ verticalAlign: "middle", marginRight: "4px" }} />
                          {agent.proposals} propositions
                        </div>
                      )}
                      {agent.executionCount !== undefined && (
                        <div>
                          <Shield size={14} style={{ verticalAlign: "middle", marginRight: "4px" }} />
                          {agent.executionCount} exécutions
                        </div>
                      )}
                    </div>
                    {agent.lastAction && (
                      <div style={{ marginTop: "12px", fontSize: "13px", color: "var(--text-secondary)", fontStyle: "italic" }}>
                        Dernière action : {agent.lastAction}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {agent.state === "stopped" ? (
                      <button className="button button-ghost">Démarrer</button>
                    ) : (
                      <button className="button button-ghost">Arrêter</button>
                    )}
                    <button className="button button-secondary">Configurer</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        title="Configuration Globale"
        description="Paramètres généraux pour tous les agents."
      >
        <div className="tile">
          <div className="stack">
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                Mode Auto-Fix
              </label>
              <select className="input" defaultValue="suggest">
                <option value="suggest">Suggérer uniquement (recommandé)</option>
                <option value="auto">Exécuter automatiquement (avancé)</option>
              </select>
              <p style={{ margin: "8px 0 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>
                En mode "Suggérer", les agents proposent des actions que tu dois valider. En mode "Auto", ils exécutent directement.
              </p>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                Fréquence de scan
              </label>
              <select className="input" defaultValue="15">
                <option value="5">5 secondes (intensif)</option>
                <option value="15">15 secondes (recommandé)</option>
                <option value="30">30 secondes</option>
                <option value="60">1 minute</option>
              </select>
            </div>

            <div>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input type="checkbox" defaultChecked />
                <span>Activer les notifications desktop</span>
              </label>
              <p style={{ margin: "8px 0 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>
                Recevoir une notification lorsqu'un agent détecte un problème critique.
              </p>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
