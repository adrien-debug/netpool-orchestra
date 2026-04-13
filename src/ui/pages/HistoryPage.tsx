import { Section } from "@ui/components";
import { CheckCircle, XCircle, Clock, RotateCcw } from "lucide-react";

interface HistoryItem {
  id: string;
  timestamp: string;
  actionId: string;
  actionLabel: string;
  status: "success" | "error" | "pending";
  duration?: number;
  message?: string;
  payload?: Record<string, unknown>;
}

// Mock data - à remplacer par des vrais appels IPC
const HISTORY: HistoryItem[] = [
  {
    id: "1",
    timestamp: "2026-04-13T06:10:00Z",
    actionId: "repair-now",
    actionLabel: "Réparer maintenant",
    status: "success",
    duration: 2340,
    message: "2 doublons nettoyés, 1 port libéré, profil principal relancé"
  },
  {
    id: "2",
    timestamp: "2026-04-13T06:05:00Z",
    actionId: "doctor",
    actionLabel: "Scanner maintenant",
    status: "success",
    duration: 1250,
    message: "Scan complet terminé"
  },
  {
    id: "3",
    timestamp: "2026-04-13T06:00:00Z",
    actionId: "service-restart",
    actionLabel: "Redémarrer service",
    status: "success",
    duration: 850,
    message: "Service 'clawd-main' redémarré",
    payload: { serviceId: "clawd-main" }
  },
  {
    id: "4",
    timestamp: "2026-04-13T05:55:00Z",
    actionId: "free-port",
    actionLabel: "Libérer port",
    status: "error",
    duration: 120,
    message: "Échec: port 3010 introuvable",
    payload: { port: 3010 }
  },
  {
    id: "5",
    timestamp: "2026-04-13T05:50:00Z",
    actionId: "profile-run",
    actionLabel: "Lancer profil",
    status: "success",
    duration: 3200,
    message: "Profil 'dev-full' lancé avec succès",
    payload: { profileId: "dev-full" }
  }
];

const statusIcons = {
  success: CheckCircle,
  error: XCircle,
  pending: Clock
};

const statusColors = {
  success: "success",
  error: "danger",
  pending: "info"
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes}min`;
  if (hours < 24) return `Il y a ${hours}h`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function HistoryPage() {
  return (
    <div className="page">
      <Section
        title="Historique des Actions"
        description="Toutes les actions exécutées par Orchestra, avec possibilité de ré-exécuter."
      >
        <div className="stack">
          {HISTORY.map((item) => {
            const Icon = statusIcons[item.status];
            const color = statusColors[item.status];

            return (
              <div key={item.id} className="tile">
                <div className="row" style={{ alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                      <Icon size={18} className={`icon-${color}`} />
                      <span style={{ fontWeight: 600, fontSize: "15px" }}>{item.actionLabel}</span>
                      <span className={`badge badge-${color}`}>{item.status}</span>
                      {item.duration && (
                        <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                          {formatDuration(item.duration)}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                      {formatTimestamp(item.timestamp)}
                    </div>

                    {item.message && (
                      <div style={{ fontSize: "14px", color: "var(--text)", marginBottom: "8px" }}>
                        {item.message}
                      </div>
                    )}

                    {item.payload && (
                      <details style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "8px" }}>
                        <summary style={{ cursor: "pointer", userSelect: "none" }}>
                          Détails
                        </summary>
                        <pre style={{
                          marginTop: "8px",
                          padding: "8px",
                          background: "rgba(0, 0, 0, 0.2)",
                          borderRadius: "4px",
                          fontSize: "12px",
                          overflow: "auto"
                        }}>
                          {JSON.stringify(item.payload, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="button button-ghost"
                      title="Ré-exécuter cette action"
                    >
                      <RotateCcw size={14} />
                      Ré-exécuter
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        title="Statistiques"
        description="Résumé de l'activité."
      >
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">Actions totales</div>
            <div className="metric-value">{HISTORY.length}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Succès</div>
            <div className="metric-value" style={{ color: "var(--success)" }}>
              {HISTORY.filter((h) => h.status === "success").length}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Échecs</div>
            <div className="metric-value" style={{ color: "var(--danger)" }}>
              {HISTORY.filter((h) => h.status === "error").length}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Durée moyenne</div>
            <div className="metric-value">
              {formatDuration(
                HISTORY.filter((h) => h.duration).reduce((sum, h) => sum + (h.duration || 0), 0) /
                  HISTORY.filter((h) => h.duration).length
              )}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
