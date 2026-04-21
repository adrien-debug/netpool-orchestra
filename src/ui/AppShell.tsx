import { Activity, AlertTriangle, Boxes, Clock, Command, Container, HelpCircle, Loader, Logs, Settings, Shield, Wrench } from "lucide-react";
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
  { path: "/agents", label: "Agents", icon: Shield, advancedOnly: true },
  { path: "/history", label: "Historique", icon: Clock, advancedOnly: true },
  { path: "/how-it-works", label: "Comment ça marche", icon: HelpCircle },
  { path: "/settings", label: "Réglages", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const currentPath = useAppStore((s) => s.currentPath);
  const refresh = useAppStore((s) => s.refresh);
  const runAction = useAppStore((s) => s.runAction);
  const simpleMode = useAppStore((s) => s.simpleMode);
  const actionInProgress = useAppStore((s) => s.actionInProgress);

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
          <div className="stack">
            <button 
              className="button button-secondary" 
              onClick={() => void refresh()}
            >
              Scanner
            </button>
            <button 
              className="button button-primary" 
              onClick={() => void runAction("repair-now")}
            >
              Réparer
            </button>
          </div>
        </div>
      </aside>

      <section className="content">
        <div className="window-drag-region" title="Drag window" />
        <header className="topbar">
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button 
              className="button button-ghost"
              onClick={() => void runAction("profile-run", { profileId: "dev-full" })}
              disabled={actionInProgress === "profile-run"}
              title="Démarre tous les services"
            >
              Dev Full
            </button>
            <button 
              className="button button-ghost"
              onClick={() => void runAction("profile-run", { profileId: "focus" })}
              disabled={actionInProgress === "profile-run"}
              title="Clawd + Orchestra uniquement"
            >
              Focus
            </button>
            <button 
              className="button button-ghost"
              onClick={() => void runAction("profile-run", { profileId: "minimal" })}
              disabled={actionInProgress === "profile-run"}
              title="Services critiques uniquement"
            >
              Minimal
            </button>
            <div style={{ width: "1px", height: "24px", background: "rgba(255,255,255,0.1)", margin: "0 8px" }} />
            <button 
              className="button button-secondary" 
              onClick={() => void runAction("doctor")}
              disabled={actionInProgress === "doctor"}
            >
              {actionInProgress === "doctor" ? (
                <>
                  <Loader size={14} style={{ animation: "spin 1s linear infinite" }} />
                  Scan...
                </>
              ) : (
                "Scanner"
              )}
            </button>
            <button 
              className="button button-primary" 
              onClick={() => void runAction("repair-now")}
              disabled={actionInProgress === "repair-now"}
            >
              {actionInProgress === "repair-now" ? (
                <>
                  <Loader size={14} style={{ animation: "spin 1s linear infinite" }} />
                  Réparation...
                </>
              ) : (
                "Réparer"
              )}
            </button>
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
