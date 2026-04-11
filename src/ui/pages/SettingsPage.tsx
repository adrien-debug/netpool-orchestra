import { useAppStore } from "@core/store";
import { Section } from "@ui/components";

export function SettingsPage() {
  const runAction = useAppStore((s) => s.runAction);
  const simpleMode = useAppStore((s) => s.simpleMode);
  const toggleSimpleMode = useAppStore((s) => s.toggleSimpleMode);
  const services = useAppStore((s) => s.snapshot.services);
  const critical = services.filter((svc) => !svc.optional).map((svc) => svc.name);
  const optional = services.filter((svc) => svc.optional).map((svc) => svc.name);

  return (
    <div className="page-stack">
      <div className="split-grid equal">
        <Section title="Préférences" description="À quoi sert cette page: régler le mode d’affichage et l’accès rapide.">
          <div className="stack">
            <div className="tile">Raccourci lanceur global: Cmd + Shift + Space</div>
            <div className="tile">Mode de sécurité: Safe (services gérés uniquement)</div>
            <div className="tile">
              Mode d’affichage: <strong>{simpleMode ? "Simple" : "Avancé"}</strong>
              <div className="tile-actions">
                <button className="button button-secondary" onClick={() => toggleSimpleMode()}>
                  Basculer le mode
                </button>
              </div>
            </div>
            <button className="button button-secondary" onClick={() => void runAction("profile-run", { profileId: "focus" })}>
              Relancer le profil focus
            </button>
            <button className="button button-primary" onClick={() => void runAction("repair-now")}>
              Réparer maintenant
            </button>
          </div>
        </Section>
        <Section title="Configuration" description="À quoi sert cette page: retrouver les fichiers de registre et profils.">
          <div className="stack">
            <div className="tile mono">config/services.yaml (registre des services)</div>
            <div className="tile mono">config/profiles.yaml (profils de démarrage)</div>
            <div className="tile mono">config/ports.yaml (registre des ports projets)</div>
            <div className="tile mono">logs/runtime (mémoire, pas de fichier pour l’instant)</div>
            <div className="tile">
              Services critiques: {critical.length ? critical.join(", ") : "aucun détecté"}
            </div>
            <div className="tile">
              Services optionnels: {optional.length ? optional.join(", ") : "aucun"}
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
