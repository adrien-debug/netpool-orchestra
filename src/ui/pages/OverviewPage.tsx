import { useAppStore } from "@core/store";
import { AlertCard, DockerRow, MetricCard, Section, ServiceRow } from "@ui/components";

export function OverviewPage() {
  const snapshot = useAppStore((s) => s.snapshot);
  const runAction = useAppStore((s) => s.runAction);

  const criticalServices = snapshot.services.filter((item) => !item.optional);
  const healthy = criticalServices.filter((item) => item.status === "healthy").length;
  const degraded = criticalServices.filter((item) => item.status === "degraded").length;
  const duplicates = criticalServices.filter((item) => item.status === "duplicate").length;
  const stopped = criticalServices.filter((item) => item.status === "stopped").length;
  const conflictPorts = new Set(snapshot.ports.filter((p) => p.status === "conflict").map((p) => p.port)).size;
  const runtimeOk = snapshot.metrics.length > 0;

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
      <Section title="État Global" description="Résumé de ton environnement de dev local.">
        <div className="start-grid">
          <div className="info-card info-card-primary">
            <div className="info-kicker">Statut</div>
            <div className="info-title">{overallState}</div>
            <p style={{ marginBottom: "16px" }}>{overallHint}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "16px", fontSize: "14px" }}>
              <div>
                <div style={{ color: "var(--text-secondary)", fontSize: "12px" }}>Services OK</div>
                <div style={{ fontSize: "20px", fontWeight: 600, color: "var(--success)" }}>{healthy}</div>
              </div>
              <div>
                <div style={{ color: "var(--text-secondary)", fontSize: "12px" }}>Problèmes</div>
                <div style={{ fontSize: "20px", fontWeight: 600, color: "var(--danger)" }}>{degraded + duplicates + stopped}</div>
              </div>
              <div>
                <div style={{ color: "var(--text-secondary)", fontSize: "12px" }}>Ports conflits</div>
                <div style={{ fontSize: "20px", fontWeight: 600, color: conflictPorts > 0 ? "var(--warning)" : "var(--text-secondary)" }}>{conflictPorts}</div>
              </div>
              <div>
                <div style={{ color: "var(--text-secondary)", fontSize: "12px" }}>Alertes</div>
                <div style={{ fontSize: "20px", fontWeight: 600, color: snapshot.alerts.length > 0 ? "var(--warning)" : "var(--text-secondary)" }}>{snapshot.alerts.length}</div>
              </div>
            </div>
            {recommendedAction.actionId ? (
              <button
                className="button button-primary"
                style={{ width: "100%" }}
                onClick={() => void runAction(recommendedAction.actionId!, recommendedAction.payload)}
              >
                {recommendedAction.label}
              </button>
            ) : (
              <div className="row-subtle">Ouvre l'app via npm run dev.</div>
            )}
          </div>

          <div className="info-card">
            <div className="info-kicker">Actions Rapides</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button
                className="button button-secondary"
                style={{ width: "100%", justifyContent: "flex-start" }}
                onClick={() => void runAction("doctor")}
              >
                Scanner maintenant
              </button>
              <button
                className="button button-secondary"
                style={{ width: "100%", justifyContent: "flex-start" }}
                onClick={() => void runAction("repair-now")}
              >
                Réparer maintenant
              </button>
              <a href="#/agents" className="button button-ghost" style={{ width: "100%", justifyContent: "flex-start", display: "flex" }}>
                Voir les agents
              </a>
              <a href="#/history" className="button button-ghost" style={{ width: "100%", justifyContent: "flex-start", display: "flex" }}>
                Voir l'historique
              </a>
            </div>
          </div>
        </div>
      </Section>

      <div className="metrics-grid">
        {snapshot.metrics.map((item) => <MetricCard key={item.id} item={item} />)}
      </div>

      <div className="split-grid">
        <Section title="Incidents actifs" description="Priorités détectées par le dernier scan.">
          <div className="stack">
            {snapshot.alerts.length === 0 ? (
              <div className="tile" style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
                Aucune alerte détectée. Tout semble stable.
              </div>
            ) : (
              snapshot.alerts.slice(0, 3).map((item) => <AlertCard key={item.id} item={item} />)
            )}
            {snapshot.alerts.length > 3 && (
              <a href="#/incidents" className="link-more">
                Voir les {snapshot.alerts.length} alertes →
              </a>
            )}
          </div>
        </Section>

        <Section title="Services critiques" description="Aperçu rapide des services essentiels.">
          <div className="stack">
            {criticalServices.length === 0 ? (
              <div className="tile" style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
                Aucun service critique configuré. Ajoute-les dans <code style={{ backgroundColor: "#1e293b", padding: "0.25rem 0.5rem", borderRadius: "4px" }}>config/services.yaml</code>.
              </div>
            ) : (
              <>
                {criticalServices.slice(0, 3).map((item) => (
                  <ServiceRow key={item.id} item={item} />
                ))}
                {criticalServices.length > 3 && (
                  <a href="#/services" className="link-more">
                    Voir les {criticalServices.length} services →
                  </a>
                )}
              </>
            )}
          </div>
        </Section>
      </div>

      <Section title="Docker" description="Conteneurs détectés sur la machine.">
        <div className="stack">
          {snapshot.docker.length === 0 ? (
            <div className="tile" style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
              Aucun conteneur Docker détecté. Lance Docker Desktop pour voir tes conteneurs ici.
            </div>
          ) : (
            <>
              {snapshot.docker.slice(0, 3).map((item) => <DockerRow key={item.id} item={item} />)}
              {snapshot.docker.length > 3 && (
                <a href="#/docker" className="link-more">
                  Voir les {snapshot.docker.length} conteneurs →
                </a>
              )}
            </>
          )}
        </div>
      </Section>
    </div>
  );
}
