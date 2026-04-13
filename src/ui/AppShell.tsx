import { Activity, AlertTriangle, Boxes, Command, Container, HelpCircle, Logs, Settings, Shield, Wrench } from "lucide-react";
import { useAppStore } from "@core/store";
import { ToastContainer, ConfirmModal, LoadingBar } from "@ui/components";
import { ChatPanel } from "@ui/ChatPanel";

const nav = [
  { path: "/", label: "Accueil", icon: Activity },
  { path: "/services", label: "Services", icon: Wrench, advancedOnly: true },
  { path: "/incidents", label: "Incidents", icon: AlertTriangle, advancedOnly: true },
  { path: "/ports", label: "Ports", icon: Boxes, advancedOnly: true },
  { path: "/docker", label: "Docker", icon: Container, advancedOnly: true },
  { path: "/launcher", label: "Lanceur", icon: Command, advancedOnly: true },
  { path: "/logs", label: "Journal", icon: Logs, advancedOnly: true },
  { path: "/how-it-works", label: "Comment ça marche", icon: HelpCircle },
  { path: "/settings", label: "Réglages", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const currentPath = useAppStore((s) => s.currentPath);
  const refresh = useAppStore((s) => s.refresh);
  const runAction = useAppStore((s) => s.runAction);
  const simpleMode = useAppStore((s) => s.simpleMode);

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Shield size={18} />
          </div>
          <div>
            <div className="brand-title">Orchestra</div>
            <div className="brand-subtitle">Orchestrateur local</div>
          </div>
        </div>

        <nav className="nav">
          {nav.filter((item) => !(simpleMode && item.advancedOnly)).map((item) => {
            const Icon = item.icon;
            const active = currentPath === item.path;
            return (
              <a key={item.path} className={`nav-item ${active ? "active" : ""}`} href={`#${item.path}`}>
                <Icon size={16} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-title">Action recommandée</div>
          <p>Nettoyage sécurisé des doublons, libération des ports secondaires et relance du profil principal.</p>
          <div className="stack">
            <button className="button button-secondary" onClick={() => void refresh()}>
              Scanner maintenant
            </button>
            <button className="button button-primary" onClick={() => void runAction("repair-now")}>
              Réparer maintenant
            </button>
          </div>
        </div>
      </aside>

      <section className="content">
        <div className="window-drag-region" title="Drag window" />
        <header className="topbar">
          <div>
            <h1>Orchestra</h1>
            <p>Voir ce qui tourne, ce qui bloque, et la prochaine action sûre à lancer.</p>
          </div>
          <div className="topbar-actions">
            <button className="search-chip" title="Ouvrir le lanceur global" onClick={() => void window.orchestra.toggleLauncher()}>
              <Command size={15} />
              <span>Ouvrir le lanceur</span>
              <kbd>⌘⇧Space</kbd>
            </button>
            <button className="button button-secondary" title="Scanner la machine et rafraîchir le tableau de bord" onClick={() => void runAction("doctor")}>
              Scanner maintenant
            </button>
            <button className="button button-primary" title="Nettoyage sécurisé + relance du profil principal" onClick={() => void runAction("repair-now")}>
              Réparer maintenant
            </button>
            {simpleMode ? (
              <button className="button button-ghost" title="Relancer le profil principal" onClick={() => void runAction("profile-run", { profileId: "focus" })}>
                Relancer le profil
              </button>
            ) : (
              <button className="button button-ghost" title="Récupération avancée (nettoyage complet)" onClick={() => void runAction("recovery-run")}>
                Récupération avancée
              </button>
            )}
          </div>
        </header>

        {children}
      </section>
      <LoadingBar />
      <ToastContainer />
      <ConfirmModal />
      <ChatPanel />
    </main>
  );
}
