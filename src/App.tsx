import { useEffect } from "react";
import { commandActions } from "@shared/commands";
import { useAppStore } from "@core/store";
import { AppShell } from "@ui/AppShell";
import { OverviewPage } from "@ui/pages/OverviewPage";
import { ServicesPage } from "@ui/pages/ServicesPage";
import { IncidentsPage } from "@ui/pages/IncidentsPage";
import { PortsPage } from "@ui/pages/PortsPage";
import { DockerPage } from "@ui/pages/DockerPage";
import { LogsPage } from "@ui/pages/LogsPage";
import { LauncherPage } from "@ui/pages/LauncherPage";
import { SettingsPage } from "@ui/pages/SettingsPage";
import { HowItWorksPage } from "@ui/pages/HowItWorksPage";

function getPathFromHash() {
  const raw = window.location.hash.replace(/^#/, "");
  return raw || "/";
}

export function App() {
  const currentPath = useAppStore((s) => s.currentPath);
  const setPath = useAppStore((s) => s.setPath);
  const refresh = useAppStore((s) => s.refresh);
  const simpleMode = useAppStore((s) => s.simpleMode);

  useEffect(() => {
    const sync = () => setPath(getPathFromHash());
    sync();
    window.addEventListener("hashchange", sync);
    void refresh();
    return () => window.removeEventListener("hashchange", sync);
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
    if (effectivePath === "/how-it-works") return <HowItWorksPage />;
    if (effectivePath === "/settings") return <SettingsPage />;
    return <OverviewPage />;
  })();

  return <AppShell>{page}</AppShell>;
}
