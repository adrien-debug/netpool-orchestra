import { useState, useEffect } from "react";
import { useAppStore } from "@core/store";
import { Section } from "@ui/components";

interface ProviderInfo {
  providers: { id: string; name: string }[];
  active: string | null;
  configured: string[];
}

function AISettings() {
  const [info, setInfo] = useState<ProviderInfo | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("");
  const addToast = useAppStore((s) => s.addToast);

  const loadProviders = () => {
    if (!window.orchestra?.ai) return;
    window.orchestra.ai.listProviders().then(setInfo).catch(() => setInfo(null));
  };

  useEffect(() => { loadProviders(); }, []);

  if (!info) {
    return <div className="tile">AI non disponible (ouvre l'app dans Electron).</div>;
  }

  const handleSetKey = async () => {
    if (!selectedProvider || !keyInput.trim()) return;
    await window.orchestra.ai.setKey(selectedProvider, keyInput.trim());
    setKeyInput("");
    addToast(`Clé ${selectedProvider} enregistrée.`, "success");
    loadProviders();
  };

  const handleRemoveKey = async (providerId: string) => {
    await window.orchestra.ai.removeKey(providerId);
    addToast(`Clé ${providerId} supprimée.`, "info");
    loadProviders();
  };

  const handleSetActive = async (providerId: string) => {
    await window.orchestra.ai.setActive(providerId);
    addToast(`Provider actif: ${providerId}`, "success");
    loadProviders();
  };

  return (
    <div className="stack">
      <div className="tile">
        Provider actif: <strong>{info.active ?? "aucun"}</strong>
      </div>

      {info.providers.map((p) => {
        const isConfigured = info.configured.includes(p.id);
        const isActive = info.active === p.id;
        return (
          <div key={p.id} className="tile">
            <div>
              <strong>{p.name}</strong>
              {isConfigured && <span className="badge tone-success" style={{ marginLeft: 8 }}>configuré</span>}
              {isActive && <span className="badge tone-info" style={{ marginLeft: 4 }}>actif</span>}
            </div>
            <div className="tile-actions">
              {!isActive && (
                <button className="button button-ghost" onClick={() => void handleSetActive(p.id)}>
                  Activer
                </button>
              )}
              {isConfigured && p.id !== "ollama" && (
                <button className="button button-ghost" onClick={() => void handleRemoveKey(p.id)}>
                  Supprimer clé
                </button>
              )}
            </div>
          </div>
        );
      })}

      <div className="tile">
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select
            className="palette-search-input"
            style={{ width: "auto", minWidth: 120 }}
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
          >
            <option value="">Provider…</option>
            {info.providers.filter((p) => p.id !== "ollama").map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input
            className="palette-search-input"
            style={{ flex: 1, minWidth: 200 }}
            type="password"
            placeholder="sk-… ou sk-ant-…"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleSetKey(); }}
          />
          <button
            className="button button-primary"
            disabled={!selectedProvider || !keyInput.trim()}
            onClick={() => void handleSetKey()}
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

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
        <Section title="Préférences" description="Mode d'affichage et accès rapide.">
          <div className="stack">
            <div className="tile">Raccourci lanceur global: Cmd + Shift + Space</div>
            <div className="tile">Mode de sécurité: Safe (services gérés uniquement)</div>
            <div className="tile">
              Mode d'affichage: <strong>{simpleMode ? "Simple" : "Avancé"}</strong>
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
        <Section title="Configuration" description="Fichiers de registre et profils.">
          <div className="stack">
            <div className="tile mono">config/services.yaml (registre des services)</div>
            <div className="tile mono">config/profiles.yaml (profils de démarrage)</div>
            <div className="tile mono">config/ports.yaml (registre des ports projets)</div>
            <div className="tile">
              Services critiques: {critical.length ? critical.join(", ") : "aucun détecté"}
            </div>
            <div className="tile">
              Services optionnels: {optional.length ? optional.join(", ") : "aucun"}
            </div>
          </div>
        </Section>
      </div>

      <Section title="Intelligence artificielle" description="Gérer les clés API et choisir le provider actif.">
        <AISettings />
      </Section>
    </div>
  );
}
