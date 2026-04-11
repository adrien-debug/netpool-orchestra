import { AlertTriangle, CornerDownLeft } from "lucide-react";
import { useMemo, useState } from "react";
import type { AlertItem, CommandAction, DockerItem, LogItem, MetricItem, PortItem, ServiceItem } from "@shared/types";
import { useAppStore } from "@core/store";
import { toneClass } from "./design";

export function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="section">
      <div className="section-header">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function MetricCard({ item }: { item: MetricItem }) {
  return (
    <div className={`metric-card ${toneClass[item.tone]}`}>
      <div className="metric-label">{item.label}</div>
      <div className="metric-value">{item.value}</div>
      {item.hint ? <div className="metric-hint">{item.hint}</div> : null}
    </div>
  );
}

export function AlertCard({ item }: { item: AlertItem }) {
  const runAction = useAppStore((s) => s.runAction);

  let actionId: string = item.actionId ?? "doctor";
  let payload: { port?: number; serviceId?: string; profileId?: string } | undefined = item.actionPayload;

  if (!item.actionId && item.actionLabel) {
    const lower = item.actionLabel.toLowerCase();
    if (lower.includes("doublon")) actionId = "clean-duplicates";
    if (lower.includes("port")) {
      actionId = "free-port";
      payload = { port: 4000 };
    }
    if (lower.includes("zombie")) actionId = "clean-zombies";
    if (lower.includes("réparer") || lower.includes("recovery")) actionId = "repair-now";
  }

  return (
    <div className="alert-card">
      <div className="alert-icon">
        <AlertTriangle size={18} />
      </div>
      <div className="alert-main">
        <div className="alert-title">{item.title}</div>
        <div className="alert-desc">{item.description}</div>
      </div>
      {item.actionLabel ? (
        <button
          className="button button-secondary"
          title="Lancer l’action recommandée pour ce problème"
          onClick={() => void runAction(actionId, payload)}
        >
          {item.actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export function ServiceRow({ item }: { item: ServiceItem }) {
  const runAction = useAppStore((s) => s.runAction);

  return (
    <div className="row grid-service">
      <div>
        <div className="row-title">{item.name}</div>
        <div className="row-subtle">
          {item.kind}
          {item.optional ? " · optionnel" : ""}
        </div>
        <div className="row-subtle mono">{item.pids.slice(0, 3).join(", ") || "-"}</div>
      </div>
      <div>
        <span className={`badge ${toneClass[item.severity]}`}>{item.status}</span>
      </div>
      <div>
        {item.instances}/{item.expectedInstances}
      </div>
      <div>{item.cpu}</div>
      <div>{item.memory}</div>
      <div>{item.ports.length ? item.ports.join(", ") : "—"}</div>
      <div>{item.uptime}</div>
      <div className="row-actions">
        <button
          className="button button-ghost"
          title="Démarre ce service avec la commande configurée dans services.yaml"
          onClick={() => void runAction("service-start", { serviceId: item.id })}
        >
          Démarrer
        </button>
        <button
          className="button button-secondary"
          title="Arrête puis relance ce service"
          onClick={() => void runAction("service-restart", { serviceId: item.id })}
        >
          Redémarrer
        </button>
        <button
          className="button button-danger"
          title="Arrête uniquement ce service géré"
          onClick={() => void runAction("service-stop", { serviceId: item.id })}
        >
          Arrêter
        </button>
      </div>
    </div>
  );
}

export function PortRow({ item }: { item: PortItem }) {
  const runAction = useAppStore((s) => s.runAction);
  const tone = item.status === "conflict" ? "danger" : item.status === "ok" ? "success" : "neutral";
  const isFree = item.status === "free";
  return (
    <div className="row grid-port">
      <div className="row-title">{item.port}</div>
      <div>{item.processName}</div>
      <div>{item.pid > 0 ? item.pid : "—"}</div>
      <div>
        <span className={`badge ${toneClass[tone]}`}>{item.status}</span>
      </div>
      <div>{item.serviceName ?? "Inconnu"}</div>
      <div>
        <button
          className="button button-secondary"
          title={isFree ? "Port déjà libre" : "Arrête le process géré sur ce port"}
          disabled={isFree}
          onClick={() => void runAction("free-port", { port: item.port })}
        >
          Libérer le port
        </button>
      </div>
    </div>
  );
}

export function DockerRow({ item }: { item: DockerItem }) {
  const tone = item.state.toLowerCase().includes("running") ? "success" : "warning";
  return (
    <div className="row grid-docker">
      <div className="mono">{item.containerId.slice(0, 12)}</div>
      <div className="row-title">{item.name}</div>
      <div>{item.image}</div>
      <div>
        <span className={`badge ${toneClass[tone]}`}>{item.state}</span>
      </div>
      <div className="row-subtle">{item.status}</div>
    </div>
  );
}

export function LogRow({ item }: { item: LogItem }) {
  const tone = item.level === "error" ? "danger" : item.level === "warn" ? "warning" : item.level === "success" ? "success" : "info";
  return (
    <div className="row grid-log">
      <div className="mono subtle">{item.timestamp}</div>
      <div>
        <span className={`badge ${toneClass[tone]}`}>{item.level}</span>
      </div>
      <div>{item.message}</div>
      <div className="mono subtle">{item.scope}</div>
    </div>
  );
}

export function CommandPalette({ actions }: { actions: CommandAction[] }) {
  const runAction = useAppStore((s) => s.runAction);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((action) => `${action.title} ${action.subtitle}`.toLowerCase().includes(q));
  }, [actions, query]);

  const safeIndex = Math.min(activeIndex, Math.max(filtered.length - 1, 0));
  const active = filtered[safeIndex] ?? actions[0];

  function runSelected(action: CommandAction) {
    if (action.navigateTo) {
      window.location.hash = action.navigateTo;
      return;
    }
    if (action.runActionId) {
      void runAction(action.runActionId, action.payload);
    }
  }

  return (
    <div className="palette">
      <div className="palette-left">
        <input
          className="palette-search-input"
          placeholder="Rechercher une action, un service, un profil..."
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((prev) => Math.min(prev + 1, Math.max(filtered.length - 1, 0)));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((prev) => Math.max(prev - 1, 0));
            }
            if (event.key === "Enter" && active) {
              event.preventDefault();
              runSelected(active);
            }
          }}
          autoFocus
        />
        <div className="palette-list">
          {filtered.map((action, index) => (
            <button
              key={action.id}
              type="button"
              className={`palette-item ${index === safeIndex ? "active" : ""}`}
              onClick={() => {
                setActiveIndex(index);
                runSelected(action);
              }}
            >
              <div>
                <div className="row-title">{action.title}</div>
                <div className="row-subtle">{action.subtitle}</div>
              </div>
              <span className={`badge ${toneClass[action.risk === "safe" ? "success" : action.risk === "guided" ? "warning" : "danger"]}`}>
                {action.risk === "safe" ? "sûr" : action.risk === "guided" ? "guidé" : "forcé"}
              </span>
            </button>
          ))}
          {!filtered.length ? <div className="palette-empty">Aucune action trouvée.</div> : null}
        </div>
      </div>
      <div className="palette-right">
        <div className="section-kicker">Aperçu de l’action</div>
        <h3>{active?.title ?? "Aucune action"}</h3>
        <p>{active?.subtitle ?? ""}</p>
        <div className="preview-box">
          <div>
            <div className="section-kicker">Impact</div>
            <p>L’action s’exécute immédiatement en local. En mode sûr, Orchestra ne touche que les services connus.</p>
          </div>
          <div>
            <div className="section-kicker">Mode</div>
            <p>{active?.risk === "safe" ? "sûr" : active?.risk === "guided" ? "guidé" : "forcé"}</p>
          </div>
          <div>
            <div className="section-kicker">Commande</div>
            <code>{active?.runActionId ? `devctl ${active.runActionId}` : active?.navigateTo ? `navigate ${active.navigateTo}` : "-"}</code>
          </div>
        </div>
        <div className="palette-actions">
          <button className="button button-primary" onClick={() => active && runSelected(active)}>
            <CornerDownLeft size={16} />
            Exécuter
          </button>
        </div>
      </div>
    </div>
  );
}
