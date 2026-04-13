import { BaseAgent } from "./base-agent.js";
import type { AgentConfig } from "./base-agent.js";
import type { EventBus } from "./event-bus.js";
import type { RuntimeSnapshot } from "../../src/shared/types.js";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { execa } from "execa";
import { rootDir, servicesPath } from "../lib/config.js";
import YAML from "yaml";

export interface DetectedProject {
  name: string;
  path: string;
  type: "node" | "python" | "docker" | "unknown";
  hasPackageJson: boolean;
  scripts: string[];
  ports: number[];
}

interface GeneratedServiceEntry {
  displayName: string;
  kind: "web" | "dev" | "mcp" | "docker" | "system";
  cwd: string;
  start: string;
  stop: string;
  match: string[];
  maxInstances: number;
  ports: number[];
  optional: boolean;
}

export class OnboardingAgent extends BaseAgent {
  private scanned = false;
  private detectedProjects: DetectedProject[] = [];

  constructor(bus: EventBus) {
    const config: AgentConfig = {
      id: "onboarding",
      name: "Onboarding Agent",
      tickIntervalMs: 300_000,
      enabled: true
    };
    super(config, bus);
  }

  protected async onInit() {
    const exists = await fs.access(servicesPath).then(() => true).catch(() => false);
    if (!exists) {
      this.bus.emit("onboarding:first-run", { message: "Aucun fichier services.yaml détecté. Lancement du scan." });
    }
  }

  protected async onTick() {
    if (this.scanned) return;
    // Onboarding tick is a no-op once scanned; wizard-driven otherwise
  }

  protected async onCleanup() {
    this.detectedProjects = [];
  }

  onSnapshot(_snapshot: RuntimeSnapshot) {
    // Onboarding doesn't react to snapshots
  }

  async scanMachine(): Promise<DetectedProject[]> {
    const home = os.homedir();
    const searchDirs = [
      path.join(home, "Desktop"),
      path.join(home, "Documents"),
      path.join(home, "Projects"),
      path.join(home, "dev"),
      path.join(home, "workspace"),
      path.join(home, "code")
    ];

    const projects: DetectedProject[] = [];

    for (const dir of searchDirs) {
      try {
        await fs.access(dir);
      } catch { continue; }

      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name === "node_modules") continue;
          const projectPath = path.join(dir, entry.name);
          const project = await this.analyzeProject(projectPath);
          if (project) projects.push(project);
        }
      } catch { continue; }
    }

    this.detectedProjects = projects;
    this.scanned = true;
    this.bus.emit("onboarding:scan-complete", { projects: projects.length });
    return projects;
  }

  private async analyzeProject(projectPath: string): Promise<DetectedProject | null> {
    const pkgJsonPath = path.join(projectPath, "package.json");
    const hasPackageJson = await fs.access(pkgJsonPath).then(() => true).catch(() => false);
    const hasDockerfile = await fs.access(path.join(projectPath, "Dockerfile")).then(() => true).catch(() => false);
    const hasPyReqs = await fs.access(path.join(projectPath, "requirements.txt")).then(() => true).catch(() => false);

    if (!hasPackageJson && !hasDockerfile && !hasPyReqs) return null;

    let type: DetectedProject["type"] = "unknown";
    let scripts: string[] = [];
    const ports: number[] = [];

    if (hasPackageJson) {
      type = "node";
      try {
        const raw = await fs.readFile(pkgJsonPath, "utf8");
        const pkg = JSON.parse(raw) as { scripts?: Record<string, string> };
        scripts = Object.keys(pkg.scripts ?? {});
        const devScript = pkg.scripts?.dev ?? "";
        const portMatch = devScript.match(/--port\s+(\d+)/);
        if (portMatch) ports.push(Number(portMatch[1]));
        if (devScript.includes("next dev") && !ports.length) ports.push(3000);
        if (devScript.includes("vite") && !ports.length) ports.push(5173);
      } catch { /* best-effort */ }
    } else if (hasDockerfile) {
      type = "docker";
    } else if (hasPyReqs) {
      type = "python";
    }

    return {
      name: path.basename(projectPath),
      path: projectPath,
      type,
      hasPackageJson,
      scripts,
      ports
    };
  }

  generateServicesYaml(projects: DetectedProject[]): string {
    const services: Record<string, GeneratedServiceEntry> = {};

    for (const project of projects) {
      const id = project.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");

      if (project.type === "node" && project.scripts.includes("dev")) {
        services[id] = {
          displayName: project.name,
          kind: "web",
          cwd: project.path,
          start: "npm run dev",
          stop: `pkill -f "${project.path}"`,
          match: [project.path],
          maxInstances: 1,
          ports: project.ports,
          optional: true
        };
      } else if (project.type === "docker") {
        services[id] = {
          displayName: project.name,
          kind: "docker",
          cwd: project.path,
          start: "docker compose up -d",
          stop: "docker compose down",
          match: [project.name],
          maxInstances: 1,
          ports: [],
          optional: true
        };
      }
    }

    return YAML.stringify({ services });
  }

  async writeServicesYaml(content: string): Promise<void> {
    const configDir = path.dirname(servicesPath);
    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(servicesPath, content, "utf8");
    this.bus.emit("onboarding:config-written", { path: servicesPath });
  }

  getSystemInfo() {
    return {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemoryGB: Math.round(os.totalmem() / 1024 / 1024 / 1024),
      homeDir: os.homedir(),
      nodeVersion: process.version
    };
  }

  getDetectedProjects() {
    return this.detectedProjects;
  }
}
