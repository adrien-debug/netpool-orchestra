import { useEffect, useState, useMemo, lazy, Suspense } from "react";
import { commandActions } from "@shared/commands";
import { useAppStore } from "@core/store";
import { AppShell } from "@ui/AppShell";
import { ErrorBoundary } from "@ui/ErrorBoundary";
import { Onboarding } from "@ui/components/Onboarding";
import { OverviewPage } from "@ui/pages/OverviewPage";

// Lazy load pages that are not immediately needed
const ServicesPage = lazy(() => import("@ui/pages/ServicesPage").then(m => ({ default: m.ServicesPage })));
const IncidentsPage = lazy(() => import("@ui/pages/IncidentsPage").then(m => ({ default: m.IncidentsPage })));
const PortsPage = lazy(() => import("@ui/pages/PortsPage").then(m => ({ default: m.PortsPage })));
const DockerPage = lazy(() => import("@ui/pages/DockerPage").then(m => ({ default: m.DockerPage })));
const LogsPage = lazy(() => import("@ui/pages/LogsPage").then(m => ({ default: m.LogsPage })));
const LauncherPage = lazy(() => import("@ui/pages/LauncherPage").then(m => ({ default: m.LauncherPage })));
const SettingsPage = lazy(() => import("@ui/pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const HowItWorksPage = lazy(() => import("@ui/pages/HowItWorksPage").then(m => ({ default: m.HowItWorksPage })));
const AgentsPage = lazy(() => import("@ui/pages/AgentsPage").then(m => ({ default: m.AgentsPage })));
const HistoryPage = lazy(() => import("@ui/pages/HistoryPage").then(m => ({ default: m.HistoryPage })));

function getPathFromHash() {
  const raw = window.location.hash.replace(/^#/, "");
  return raw || "/";
}

export function App() {
  const currentPath = useAppStore((s) => s.currentPath);
  const setPath = useAppStore((s) => s.setPath);
  const refresh = useAppStore((s) => s.refresh);
  const simpleMode = useAppStore((s) => s.simpleMode);
  
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem("orchestra-onboarding-completed");
  });

  const handleOnboardingComplete = () => {
    localStorage.setItem("orchestra-onboarding-completed", "true");
    setShowOnboarding(false);
  };

  useEffect(() => {
    const sync = () => setPath(getPathFromHash());
    sync();
    window.addEventListener("hashchange", sync);
    void refresh();

    let poll: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (poll) return;
      poll = setInterval(() => void refresh(), 15_000);
    };

    const stopPolling = () => {
      if (poll) { clearInterval(poll); poll = null; }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        void refresh();
        startPolling();
      }
    };

    startPolling();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopPolling();
      window.removeEventListener("hashchange", sync);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh, setPath]);

  const effectivePath = useMemo(() => 
    simpleMode && ["/services", "/incidents", "/ports", "/docker", "/logs", "/launcher"].includes(currentPath)
      ? "/"
      : currentPath,
    [simpleMode, currentPath]
  );

  const page = useMemo(() => {
    if (effectivePath === "/services") return <ServicesPage />;
    if (effectivePath === "/incidents") return <IncidentsPage />;
    if (effectivePath === "/ports") return <PortsPage />;
    if (effectivePath === "/docker") return <DockerPage />;
    if (effectivePath === "/logs") return <LogsPage />;
    if (effectivePath === "/launcher") return <LauncherPage actions={commandActions} />;
    if (effectivePath === "/agents") return <AgentsPage />;
    if (effectivePath === "/history") return <HistoryPage />;
    if (effectivePath === "/how-it-works") return <HowItWorksPage />;
    if (effectivePath === "/settings") return <SettingsPage />;
    return <OverviewPage />;
  }, [effectivePath]);

  return (
    <ErrorBoundary>
      <AppShell>
        <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>Chargement...</div>}>
          {page}
        </Suspense>
      </AppShell>
      {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
    </ErrorBoundary>
  );
}
