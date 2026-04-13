import { useMemo, useState } from "react";
import { CornerDownLeft } from "lucide-react";
import type { CommandAction } from "@shared/types";
import { useAppStore } from "@core/store";
import { toneClass } from "../design";

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
        <div className="section-kicker">Aperçu de l'action</div>
        <h3>{active?.title ?? "Aucune action"}</h3>
        <p>{active?.subtitle ?? ""}</p>
        <div className="preview-box">
          <div>
            <div className="section-kicker">Impact</div>
            <p>L'action s'exécute immédiatement en local. En mode sûr, Orchestra ne touche que les services connus.</p>
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
