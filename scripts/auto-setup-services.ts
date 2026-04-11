import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import psList from "ps-list";
import YAML from "yaml";

type ServiceKind = "mcp" | "web" | "dev" | "docker" | "system";

type ServiceConfig = {
  displayName?: string;
  kind: ServiceKind;
  cwd?: string;
  start: string;
  stop: string;
  match: string[];
  maxInstances: number;
  ports?: number[];
  optional?: boolean;
};

type ServicesDoc = { services: Record<string, ServiceConfig> };

type Candidate = { cwd: string; score: number; source: string };

const projectRoot = path.resolve(process.cwd());
const servicesPath = path.join(projectRoot, "config", "services.yaml");

const npxFallbackStart: Record<string, string> = {
  "github-mcp": "npx -y @modelcontextprotocol/server-github",
  "shopify-mcp": "npx -y shopify-mcp",
  "context7-mcp": "npx -y @upstash/context7-mcp@latest",
  "mcp-medusa": "npx -y mcp-medusa",
  "adobe-express-mcp": "npx -y adobe-express-add-on-mcp-server",
  "comfyui-mcp": "npx -y comfyui-mcp"
};

const aliasByService: Record<string, string[]> = {
  "clawd-main": ["clawd-cursor-main"],
  "next-main": ["next-main", "victor-next", "clawd-cursor-main"],
  "github-mcp": ["mcp-server-github", "github"],
  "shopify-mcp": ["shopify-mcp", "shopify"],
  "context7-mcp": ["context7-mcp", "context7"],
  "mcp-medusa": ["mcp-medusa", "medusa"],
  "adobe-express-mcp": ["adobe-express-add-on-mcp-server", "adobe"],
  "comfyui-mcp": ["comfyui-mcp", "comfyui"]
};

function tokenizeCommand(command: string) {
  return (command.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map((token) => token.replace(/^['"]|['"]$/g, ""));
}

async function pathExists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function normalizeToProjectDir(p: string) {
  let current = p;
  const stat = await fs.stat(current).catch(() => null);
  if (!stat) return null;
  if (stat.isFile()) current = path.dirname(current);

  if (current.includes(`${path.sep}node_modules${path.sep}.bin`)) {
    current = current.split(`${path.sep}node_modules${path.sep}.bin`)[0] ?? current;
  }

  let steps = 0;
  while (steps < 8) {
    const pkg = path.join(current, "package.json");
    if (await pathExists(pkg)) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
    steps += 1;
  }

  return null;
}

function calcScore(serviceId: string, service: ServiceConfig, candidateCwd: string, source: string) {
  const hay = `${candidateCwd} ${source}`.toLowerCase();
  const aliases = aliasByService[serviceId] ?? [];
  const serviceTokens = [serviceId, ...aliases, ...service.match].map((x) => x.toLowerCase());

  let score = 0;
  for (const token of serviceTokens) {
    if (!token.trim()) continue;
    if (hay.includes(token)) score += 3;
  }
  if (candidateCwd.includes("Desktop")) score += 2;
  if (candidateCwd.includes("clawd-cursor-main") && serviceId === "next-main") score += 2;
  if (candidateCwd.includes(".npm/_npx")) score -= 6;

  return score;
}

async function extractCwdFromProcess(serviceId: string, service: ServiceConfig, processCmd: string): Promise<Candidate | null> {
  const tokens = tokenizeCommand(processCmd);
  const pathTokens = tokens.filter((t) => t.startsWith("/") && t.includes("/Users/"));

  for (const token of pathTokens) {
    const normalized = await normalizeToProjectDir(token);
    if (!normalized) continue;
    const score = calcScore(serviceId, service, normalized, processCmd);
    return { cwd: normalized, score, source: "process" };
  }

  return null;
}

async function findByAlias(serviceId: string, service: ServiceConfig): Promise<Candidate[]> {
  const roots = [path.join(os.homedir(), "Desktop"), path.join(os.homedir(), ".cursor", "worktrees")];
  const aliases = aliasByService[serviceId] ?? [];
  const candidates: Candidate[] = [];

  for (const root of roots) {
    for (const alias of aliases) {
      const direct = path.join(root, alias);
      if (await pathExists(path.join(direct, "package.json"))) {
        candidates.push({ cwd: direct, score: calcScore(serviceId, service, direct, "alias"), source: "alias" });
      }
    }
  }

  return candidates;
}

function chooseBest(candidates: Candidate[]) {
  return candidates.sort((a, b) => b.score - a.score)[0] ?? null;
}

async function main() {
  const raw = await fs.readFile(servicesPath, "utf8");
  const doc = YAML.parse(raw) as ServicesDoc;
  const processes = await psList();

  const report: string[] = [];

  for (const [serviceId, service] of Object.entries(doc.services)) {
    const matched = processes.filter((proc) =>
      service.match.some((pattern) => (proc.cmd ?? "").includes(pattern) || (proc.name ?? "").includes(pattern))
    );

    const processCandidates: Candidate[] = [];
    for (const proc of matched) {
      const extracted = await extractCwdFromProcess(serviceId, service, proc.cmd ?? "");
      if (extracted) processCandidates.push(extracted);
    }

    const aliasCandidates = await findByAlias(serviceId, service);
    const best = chooseBest([...processCandidates, ...aliasCandidates]);

    if (best && !best.cwd.includes(`${path.sep}.npm${path.sep}_npx${path.sep}`)) {
      const previous = service.cwd;
      service.cwd = best.cwd;

      if (serviceId === "next-main") {
        if (best.cwd.includes("clawd-cursor-main")) {
          service.start = "npm run dev:frontend:wl-preview";
          service.ports = [3010];
          service.healthCheck = { type: "http", value: "http://127.0.0.1:3010" };
        } else {
          service.start = "npm run dev";
        }
      }

      if (serviceId === "clawd-main" && best.cwd.includes("clawd-cursor-main")) {
        service.start = "npm run dev:backend";
        service.maxInstances = 4;
        delete service.healthCheck;
      }

      report.push(`${serviceId}: cwd ${previous ?? "(none)"} -> ${best.cwd} [${best.source}]`);
      continue;
    }

    if ((best && best.cwd.includes(`${path.sep}.npm${path.sep}_npx${path.sep}`)) || (!(await pathExists(service.cwd ?? "")) && npxFallbackStart[serviceId])) {
      const previous = service.cwd;
      delete service.cwd;
      service.start = npxFallbackStart[serviceId];
      report.push(`${serviceId}: cwd ${previous ?? "(none)"} removed, fallback start set to '${service.start}'`);
    } else {
      report.push(`${serviceId}: unchanged`);
    }
  }

  const nextRaw = YAML.stringify(doc);
  if (nextRaw !== raw) {
    const backupPath = `${servicesPath}.bak-${Date.now()}`;
    await fs.copyFile(servicesPath, backupPath);
    await fs.writeFile(servicesPath, nextRaw, "utf8");
    report.push(`Backup created: ${backupPath}`);
  } else {
    report.push("No changes detected; services.yaml left untouched.");
  }

  console.log("Auto-setup completed:\n");
  for (const line of report) console.log(`- ${line}`);
  console.log(`\nUpdated: ${servicesPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
