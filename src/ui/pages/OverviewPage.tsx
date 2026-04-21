import { useAppStore } from "@core/store";
import { AlertCard, DockerRow, MetricCard, Section, ServiceRow } from "@ui/components";
import { CheckCircle, AlertTriangle, XCircle, Zap } from "lucide-react";

export function OverviewPage() {
  const snapshot = useAppStore((s) => s.snapshot);
  const runAction = useAppStore((s) => s.runAction);
  const simpleMode = useAppStore((s) => s.simpleMode);

  const criticalServices = snapshot.services.filter((item) => !item.optional);
  const healthy = criticalServices.filter((item) => item.status === "healthy").length;
  const degraded = criticalServices.filter((item) => item.status === "degraded").length;
  const duplicates = criticalServices.filter((item) => item.status === "duplicate").length;
  const stopped = criticalServices.filter((item) => item.status === "stopped").length;
  const conflictPorts = new Set(snapshot.ports.filter((p) => p.status === "conflict").map((p) => p.port)).size;
  const runtimeOk = snapshot.metrics.length > 0;
  
  const problemServices = criticalServices.filter((s) => s.status === "degraded" || s.status === "duplicate" || s.status === "stopped");
  const conflictingPorts = snapshot.ports.filter((p) => p.status === "conflict");

  const overallState =
    !runtimeOk
      ? "ERREUR"
      : duplicates > 0 || degraded > 0 || stopped > 0 || conflictPorts > 0
        ? "ATTENTION"
        : "OK";

  const overallHint =
    overallState === "ERREUR"
      ? "Le backend local n'est pas joignable. Ouvre l'app dans Electron."
      : overallState === "ATTENTION"
        ? "Des services critiques ont un problème ou des ports sont en conflit."
        : "Tout est stable côté services critiques.";

  const recommendedAction: { label: string; actionId?: string; payload?: { profileId?: string } } =
    overallState === "ERREUR"
      ? { label: "Ouvrir dans Electron" }
      : overallState === "ATTENTION"
        ? { label: "Réparer maintenant", actionId: "repair-now" }
        : { label: "Scanner maintenant", actionId: "doctor" };

  return (
    <div className="page-stack">
      <Section title="État">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          <div className="metric-card" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <CheckCircle size={24} style={{ color: "#10b981" }} />
            <div>
              <div className="metric-label">OK</div>
              <div className="metric-value" style={{ color: "#10b981" }}>{healthy}</div>
            </div>
          </div>
          <div className="metric-card" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <AlertTriangle size={24} style={{ color: "#ef4444" }} />
            <div>
              <div className="metric-label">Problèmes</div>
              <div className="metric-value" style={{ color: "#ef4444" }}>{degraded + duplicates + stopped}</div>
            </div>
          </div>
          <div className="metric-card" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <XCircle size={24} style={{ color: conflictPorts > 0 ? "#f59e0b" : "#64748b" }} />
            <div>
              <div className="metric-label">Ports</div>
              <div className="metric-value" style={{ color: conflictPorts > 0 ? "#f59e0b" : "#64748b" }}>{conflictPorts}</div>
            </div>
          </div>
          <div className="metric-card" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Zap size={24} style={{ color: snapshot.alerts.length > 0 ? "#f59e0b" : "#64748b" }} />
            <div>
              <div className="metric-label">Alertes</div>
              <div className="metric-value" style={{ color: snapshot.alerts.length > 0 ? "#f59e0b" : "#64748b" }}>{snapshot.alerts.length}</div>
            </div>
          </div>
        </div>
      </Section>

      {problemServices.length > 0 && (
        <Section title="Fixes rapides">
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {problemServices.slice(0, 3).map((service) => (
              <button
                key={service.id}
                className="button button-primary"
                style={{ justifyContent: "flex-start", width: "100%" }}
                onClick={() => void runAction("service-restart", { serviceId: service.id })}
              >
                <Zap size={14} />
                Fix {service.name} ({service.status})
              </button>
            ))}
            {duplicates > 0 && (
              <button
                className="button button-secondary"
                style={{ justifyContent: "flex-start", width: "100%" }}
                onClick={() => void runAction("clean-duplicates")}
              >
                <Zap size={14} />
                Nettoyer {duplicates} doublon{duplicates > 1 ? "s" : ""}
              </button>
            )}
            {conflictingPorts.length > 0 && conflictingPorts.slice(0, 2).map((port) => (
              <button
                key={port.port}
                className="button button-secondary"
                style={{ justifyContent: "flex-start", width: "100%" }}
                onClick={() => void runAction("free-port", { port: port.port })}
              >
                <Zap size={14} />
                Libérer port {port.port}
              </button>
            ))}
          </div>
        </Section>
      )}

      <div className="metrics-grid">
        {snapshot.metrics.map((item) => <MetricCard key={item.id} item={item} />)}
      </div>

      {snapshot.alerts.length > 0 && (
        <Section title="Alertes">
          <div className="stack">
            {snapshot.alerts.slice(0, 3).map((item) => <AlertCard key={item.id} item={item} />)}
            {snapshot.alerts.length > 3 && (
              <a href="#/incidents" className="link-more">
                +{snapshot.alerts.length - 3} alertes
              </a>
            )}
          </div>
        </Section>
      )}

      <Section title="Services">
        <div className="stack">
          {criticalServices.length === 0 ? (
            <div className="tile" style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
              Aucun service
            </div>
          ) : (
            <>
              {criticalServices.slice(0, 5).map((item) => (
                <ServiceRow key={item.id} item={item} />
              ))}
              {criticalServices.length > 5 && (
                <a href="#/services" className="link-more">
                  +{criticalServices.length - 5} services
                </a>
              )}
            </>
          )}
        </div>
      </Section>

      {snapshot.docker.length > 0 && (
        <Section title="Docker">
          <div className="stack">
            {snapshot.docker.slice(0, 3).map((item) => <DockerRow key={item.id} item={item} />)}
            {snapshot.docker.length > 3 && (
              <a href="#/docker" className="link-more">
                +{snapshot.docker.length - 3} conteneurs
              </a>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}
