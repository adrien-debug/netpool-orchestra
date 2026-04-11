import { useAppStore } from "@core/store";
import { Section } from "@ui/components";

export function HowItWorksPage() {
  const simpleMode = useAppStore((s) => s.simpleMode);

  return (
    <div className="page-stack">
      <Section
        title="Comment ça marche"
        description="Vue simple du fonctionnement de l’orchestrateur et de ses actions principales."
      >
        <div className="stack">
          <div className="tile">
            <strong>Scanner maintenant</strong> lance un scan local: process, ports, Docker, doublons et check santé.
          </div>
          <div className="tile">
            <strong>Réparer maintenant</strong> nettoie les doublons gérés, libère les ports sûrs et relance le profil principal.
          </div>
          <div className="tile">
            <strong>Relancer le profil</strong> démarre les services essentiels et coupe les optionnels lourds.
          </div>
          <div className="tile">
            En mode sécurisé, Orchestra n’agit que sur les services définis dans `config/services.yaml`.
          </div>
        </div>
      </Section>

      <Section title="Statuts" description="Ce que signifient les badges de santé.">
        <div className="stack">
          <div className="tile"><strong>healthy</strong>: service actif et check santé OK.</div>
          <div className="tile"><strong>degraded</strong>: service actif mais check santé KO.</div>
          <div className="tile"><strong>duplicate</strong>: trop d’instances en cours pour ce service.</div>
          <div className="tile"><strong>stopped</strong>: service non démarré actuellement.</div>
        </div>
      </Section>

      <Section title="Services critiques vs optionnels" description="Ce qui influence l’état global.">
        <div className="stack">
          <div className="tile">
            Les services <strong>critiques</strong> déterminent le statut global. Un doublon critique = état Attention.
          </div>
          <div className="tile">
            Les services <strong>optionnels</strong> peuvent être arrêtés sans bloquer l’état global.
          </div>
        </div>
      </Section>

      {simpleMode ? (
        <Section title="Mode simple" description="Interface épurée pour aller vite.">
          <div className="stack">
            <div className="tile">Actions visibles: Scanner, Réparer, Relancer, Ouvrir le lanceur.</div>
            <div className="tile">Les pages avancées sont masquées pour éviter la confusion.</div>
          </div>
        </Section>
      ) : (
        <Section title="Mode avancé" description="Contrôle détaillé et actions fines.">
          <div className="stack">
            <div className="tile">Tu peux agir service par service, port par port et voir tous les journaux.</div>
            <div className="tile">La récupération avancée est disponible en haut de l’écran.</div>
          </div>
        </Section>
      )}
    </div>
  );
}
