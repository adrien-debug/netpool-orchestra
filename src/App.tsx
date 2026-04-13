import { useEffect, useState } from "react";
import { commandActions } from "@shared/commands";
import { useAppStore } from "@core/store";
import { AppShell } from "@ui/AppShell";
import { ErrorBoundary } from "@ui/ErrorBoundary";
import { Onboarding } from "@ui/components/Onboarding";
import { OverviewPage } from "@ui/pages/OverviewPage";
import { ServicesPage } from "@ui/pages/ServicesPage";
import { IncidentsPage } from "@ui/pages/IncidentsPage";
import { PortsPage } from "@ui/pages/PortsPage";
import { DockerPage } from "@ui/pages/DockerPage";
import { LogsPage } from "@ui/pages/LogsPage";
import { LauncherPage } from "@ui/pages/LauncherPage";
import { SettingsPage } from "@ui/pages/SettingsPage";
import { HowItWorksPage } from "@ui/pages/HowItWorksPage";
import { AgentsPage } from "@ui/pages/AgentsPage";
import { HistoryPage } from "@ui/pages/HistoryPage";

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

  const effectivePath = simpleMode && ["/services", "/incidents", "/ports", "/docker", "/logs", "/launcher"].includes(currentPath)
    ? "/"
    : currentPath;

  const page = (() => {
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
  })();

  return (
    <ErrorBoundary>
      <AppShell>{page}</AppShell>
      {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
    </ErrorBoundary>
  );
}
