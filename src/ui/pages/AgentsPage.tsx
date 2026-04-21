import { useState, useEffect } from "react";
import { Section, EmptyState } from "@ui/components";
import { Activity, AlertTriangle, CheckCircle, Wrench, Shield, XCircle } from "lucide-react";

interface AgentStatus {
  id: string;
  name: string;
  state: "idle" | "running" | "stopped" | "error";
  tickCount: number;
  errorCount: number;
  lastError?: string;
}

const AGENT_INFO: Record<string, { description: string }> = {
  preventive: { description: "Détecte les problèmes avant qu'ils ne deviennent critiques (doublons, ports, crash loops)" },
  autofix: { description: "Propose et exécute des corrections automatiques selon le mode configuré" },
  advisor: { description: "Fournit des recommandations contextuelles et des insights sur ton environnement" },
  performance: { description: "Surveille les métriques de performance et suggère des optimisations" },
  onboarding: { description: "Guide les nouveaux utilisateurs et propose des actions de configuration" }
};

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
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!window.orchestra) {
        setLoading(false);
        return;
      }
      try {
        const status = await window.orchestra.getAgentStatus();
        setAgents(status);
      } catch {
        setAgents([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) {
    return (
      <div className="page">
        <Section title="Agents Intelligents" description="Chargement...">
          <div className="tile" style={{ textAlign: "center", padding: "48px" }}>
            Chargement des agents...
          </div>
        </Section>
      </div>
    );
  }

  if (!window.orchestra) {
    return (
      <div className="page">
        <Section title="Agents Intelligents" description="Les agents surveillent ton environnement.">
          <EmptyState
            title="Backend local introuvable"
            description="Ouvre l'app dans Electron pour voir les agents."
          />
        </Section>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="page">
        <Section title="Agents Intelligents" description="Les agents surveillent ton environnement.">
          <EmptyState
            title="Aucun agent actif"
            description="Les agents démarrent automatiquement avec l'application."
          />
        </Section>
      </div>
    );
  }

  return (
    <div className="page">
      <Section
        title="Agents Intelligents"
        description="Les agents surveillent ton environnement et proposent des actions automatiques."
      >
        <div className="stack">
          {agents.map((agent) => {
            const Icon = stateIcons[agent.state];
            const color = stateColors[agent.state];
            const info = AGENT_INFO[agent.id] || { description: "" };

            return (
              <div key={agent.id} className="tile">
                <div className="row" style={{ alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                      <Icon size={20} className={`icon-${color}`} />
                      <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>{agent.name}</h3>
                      <span className={`badge badge-${color}`}>{agent.state}</span>
                    </div>
                    <p style={{ margin: "0 0 12px 0", color: "var(--text-secondary)", fontSize: "14px" }}>
                      {info.description}
                    </p>
                    <div style={{ display: "flex", gap: "16px", fontSize: "13px", color: "var(--text-secondary)" }}>
                      <div>
                        <Shield size={14} style={{ verticalAlign: "middle", marginRight: "4px" }} />
                        {agent.tickCount} ticks
                      </div>
                      {agent.errorCount > 0 && (
                        <div>
                          <AlertTriangle size={14} style={{ verticalAlign: "middle", marginRight: "4px" }} />
                          {agent.errorCount} erreurs
                        </div>
                      )}
                    </div>
                    {agent.lastError && (
                      <div style={{ marginTop: "12px", fontSize: "13px", color: "var(--danger)", fontStyle: "italic" }}>
                        Dernière erreur : {agent.lastError}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        title="Configuration Globale"
        description="Les agents sont configurés automatiquement. Utilise les réglages pour ajuster le comportement."
      >
        <div className="tile">
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            Les agents tournent en arrière-plan et s'adaptent automatiquement à ton environnement.
            Pour des configurations avancées, modifie les fichiers de config dans <code>config/</code>.
          </p>
        </div>
      </Section>
    </div>
  );
}
