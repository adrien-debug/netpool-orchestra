import { useState, useEffect } from "react";
import { Section, EmptyState } from "@ui/components";
import { CheckCircle, XCircle, Clock, RotateCcw } from "lucide-react";
import { useAppStore } from "@core/store";
import type { LogEntry } from "@shared/types";

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
  const snapshot = useAppStore((s) => s.snapshot);
  const runAction = useAppStore((s) => s.runAction);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (!snapshot) return;
    
    const actionLogs = snapshot.logs.filter((log) => log.scope === "runtime" && log.level === "success");
    const items: HistoryItem[] = actionLogs.slice(0, 50).map((log, idx) => ({
      id: `${log.timestamp}-${idx}`,
      timestamp: new Date(log.timestamp).toISOString(),
      actionId: "unknown",
      actionLabel: log.message.split(" — ")[0] || "Action",
      status: "success" as const,
      message: log.message
    }));
    
    setHistory(items);
  }, [snapshot]);

  if (!window.orchestra) {
    return (
      <div className="page">
        <Section title="Historique des Actions" description="Toutes les actions exécutées par Orchestra.">
          <EmptyState
            title="Backend local introuvable"
            description="Ouvre l'app dans Electron pour voir l'historique."
          />
        </Section>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="page">
        <Section title="Historique des Actions" description="Toutes les actions exécutées par Orchestra.">
          <EmptyState
            title="Aucune action enregistrée"
            description="Les actions apparaîtront ici une fois exécutées."
          />
        </Section>
      </div>
    );
  }

  const successCount = history.filter((h) => h.status === "success").length;
  const errorCount = history.filter((h) => h.status === "error").length;
  const withDuration = history.filter((h) => h.duration);
  const avgDuration = withDuration.length > 0
    ? withDuration.reduce((sum, h) => sum + (h.duration || 0), 0) / withDuration.length
    : 0;

  return (
    <div className="page">
      <Section
        title="Historique des Actions"
        description="Toutes les actions exécutées par Orchestra."
      >
        <div className="stack">
          {history.map((item) => {
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
            <div className="metric-value">{history.length}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Succès</div>
            <div className="metric-value" style={{ color: "var(--success)" }}>
              {successCount}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Échecs</div>
            <div className="metric-value" style={{ color: "var(--danger)" }}>
              {errorCount}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Durée moyenne</div>
            <div className="metric-value">
              {avgDuration > 0 ? formatDuration(avgDuration) : "N/A"}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
