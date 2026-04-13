import { useAppStore } from "@core/store";
import { AlertCard, DockerRow, MetricCard, Section, ServiceRow } from "@ui/components";

export function OverviewPage() {
  const snapshot = useAppStore((s) => s.snapshot);
  const runAction = useAppStore((s) => s.runAction);

  const criticalServices = snapshot.services.filter((item) => !item.optional);
  const optionalServices = snapshot.services.filter((item) => item.optional);
  const healthy = criticalServices.filter((item) => item.status === "healthy").length;
  const degraded = criticalServices.filter((item) => item.status === "degraded").length;
  const duplicates = criticalServices.filter((item) => item.status === "duplicate").length;
  const stopped = criticalServices.filter((item) => item.status === "stopped").length;
  const optionalStopped = optionalServices.filter((item) => item.status === "stopped").length;
  const conflictPorts = new Set(snapshot.ports.filter((p) => p.status === "conflict").map((p) => p.port)).size;
  const runtimeOk = snapshot.metrics.length > 0;

  const overallState =
    !runtimeOk
      ? "ERREUR"
      : duplicates > 0 || degraded > 0 || stopped > 0 || conflictPorts > 0
        ? "ATTENTION"
        : optionalStopped > 0
          ? "PARTIEL"
          : "OK";

  const overallHint =
    overallState === "ERREUR"
      ? "Le backend local n’est pas joignable. Ouvre l’app dans Electron."
      : overallState === "ATTENTION"
        ? "Des services critiques ont un problème ou des ports sont en conflit."
        : overallState === "PARTIEL"
          ? "Seuls des services optionnels sont arrêtés."
          : "Tout est stable côté services critiques.";

  const recommendedAction: { label: string; actionId?: string; payload?: { profileId?: string } } =
    overallState === "ERREUR"
      ? { label: "Ouvrir dans Electron" }
      : overallState === "ATTENTION"
        ? { label: "Réparer maintenant", actionId: "repair-now" }
        : overallState === "PARTIEL"
          ? { label: "Lancer le profil complet", actionId: "profile-run", payload: { profileId: "fullstack" } }
          : { label: "Scanner maintenant", actionId: "doctor" };

  return (
    <div className="page-stack">
      <Section title="Commencer ici" description="Résumé clair de ce qui marche, ce qui bloque et quoi cliquer en premier.">
        <div className="start-grid">
          <div className="info-card info-card-primary">
            <div className="info-kicker">État global</div>
            <div className="info-title">Statut: {overallState}</div>
            <p>{overallHint}</p>
            <p>
              Critiques OK: {healthy}. Dégradés: {degraded}. Doublons: {duplicates}. Arrêtés: {stopped}.
            </p>
            <p>Ports en conflit: {conflictPorts}. Optionnels arrêtés: {optionalStopped}.</p>
            <p>Données en direct du système local (pas de mock).</p>
            {recommendedAction.actionId ? (
              <button
                className="button button-primary"
                onClick={() => void runAction(recommendedAction.actionId!, recommendedAction.payload)}
              >
                {recommendedAction.label}
              </button>
            ) : (
              <div className="row-subtle">Ouvre l’app via npm run dev.</div>
            )}
          </div>

          <div className="info-card">
            <div className="info-kicker">Boutons principaux</div>
            <ul className="info-list">
              <li><strong>Scanner maintenant</strong>: re-scanne la machine et met à jour l’écran.</li>
              <li><strong>Réparer maintenant</strong>: nettoie les doublons sûrs, libère les ports secondaires et relance le profil principal.</li>
              <li><strong>Ouvrir le lanceur</strong>: palette d’actions rapide type Spotlight.</li>
            </ul>
          </div>

          <div className="info-card">
            <div className="info-kicker">Boutons par service</div>
            <ul className="info-list">
              <li><strong>Démarrer</strong>: exécute la commande de démarrage configurée.</li>
              <li><strong>Redémarrer</strong>: stoppe puis relance le service.</li>
              <li><strong>Arrêter</strong>: stoppe uniquement ce service géré.</li>
              <li><strong>Libérer le port</strong>: stoppe le process géré sur ce port.</li>
            </ul>
          </div>

          <div className="info-card">
            <div className="info-kicker">Ordre recommandé</div>
            <ol className="info-list ordered">
              <li>Cliquer <strong>Scanner maintenant</strong>.</li>
              <li>Si doublons ou conflits, cliquer <strong>Réparer maintenant</strong>.</li>
              <li>Vérifier que les services critiques passent en <strong>healthy</strong>.</li>
              <li>Aller dans <strong>Services</strong> uniquement pour un contrôle fin.</li>
            </ol>
          </div>
        </div>

        <div className="legend-row">
          <span className="badge tone-success">healthy</span>
          <span className="legend-text">service actif et OK</span>
          <span className="badge tone-warning">degraded</span>
          <span className="legend-text">service actif mais check santé KO</span>
          <span className="badge tone-danger">duplicate</span>
          <span className="legend-text">trop d’instances</span>
          <span className="badge tone-neutral">stopped</span>
          <span className="legend-text">service arrêté</span>
        </div>
      </Section>

      <div className="metrics-grid">
        {snapshot.metrics.map((item) => <MetricCard key={item.id} item={item} />)}
      </div>

      <div className="split-grid">
        <Section title="Incidents actifs" description="Priorités détectées par le dernier scan.">
          <div className="stack">
            {snapshot.alerts.map((item) => <AlertCard key={item.id} item={item} />)}
          </div>
        </Section>

        <Section title="Services critiques" description="Aperçu rapide des services essentiels.">
          <div className="stack">
            {criticalServices.slice(0, 3).map((item) => (
              <ServiceRow key={item.id} item={item} />
            ))}
            {criticalServices.length > 3 && (
              <a href="#/services" className="link-more">
                Voir les {criticalServices.length} services →
              </a>
            )}
          </div>
        </Section>
      </div>

      <Section title="Docker" description="Conteneurs détectés sur la machine.">
        <div className="stack">
          {snapshot.docker.slice(0, 3).map((item) => <DockerRow key={item.id} item={item} />)}
          {snapshot.docker.length > 3 && (
            <a href="#/docker" className="link-more">
              Voir les {snapshot.docker.length} conteneurs →
            </a>
          )}
        </div>
      </Section>
    </div>
  );
}
