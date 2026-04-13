#!/usr/bin/env tsx
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execa } from "execa";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ServiceConfig {
  name: string;
  port: number;
  path: string;
  command: string;
  healthCheck?: string;
  env?: Record<string, string>;
  dependencies?: string[];
  optional: boolean;
}

interface PortsConfig {
  version: string;
  ports: Record<string, Record<string, ServiceConfig>>;
  profiles?: Record<string, {
    name: string;
    description: string;
    services: string[];
  }>;
}

const CONFIG_PATH = resolve(__dirname, "../config/PORTS-CONFIG.json");

function loadConfig(): PortsConfig {
  const content = readFileSync(CONFIG_PATH, "utf-8");
  return JSON.parse(content);
}

function parseServiceId(serviceId: string): { project: string; service: string } | null {
  const parts = serviceId.split(".");
  if (parts.length !== 2) return null;
  return { project: parts[0], service: parts[1] };
}

function getService(config: PortsConfig, serviceId: string): ServiceConfig | null {
  const parsed = parseServiceId(serviceId);
  if (!parsed) return null;
  return config.ports[parsed.project]?.[parsed.service] ?? null;
}

async function startService(config: PortsConfig, serviceId: string): Promise<void> {
  const service = getService(config, serviceId);
  if (!service) {
    console.error(`❌ Service "${serviceId}" not found`);
    process.exit(1);
  }

  console.log(`🚀 Starting ${service.name} on port ${service.port}...`);
  console.log(`   Path: ${service.path}`);
  console.log(`   Command: ${service.command}`);

  try {
    const subprocess = execa("bash", ["-lc", service.command], {
      cwd: service.path,
      env: { ...process.env, ...service.env },
      stdio: "inherit"
    });

    subprocess.on("exit", (code) => {
      if (code === 0) {
        console.log(`✅ ${service.name} stopped gracefully`);
      } else {
        console.error(`❌ ${service.name} exited with code ${code}`);
      }
    });

    // Keep process alive
    await subprocess;
  } catch (error) {
    console.error(`❌ Failed to start ${service.name}:`, error);
    process.exit(1);
  }
}

async function startProfile(config: PortsConfig, profileId: string): Promise<void> {
  const profile = config.profiles?.[profileId];
  if (!profile) {
    console.error(`❌ Profile "${profileId}" not found`);
    process.exit(1);
  }

  console.log(`🎯 Starting profile: ${profile.name}`);
  console.log(`   ${profile.description}`);
  console.log(`   Services: ${profile.services.length}`);
  console.log("");

  for (const serviceId of profile.services) {
    const service = getService(config, serviceId);
    if (!service) {
      console.warn(`⚠️  Service "${serviceId}" not found, skipping...`);
      continue;
    }

    console.log(`🚀 Starting ${service.name}...`);
    
    // Start in background
    const subprocess = execa("bash", ["-lc", service.command], {
      cwd: service.path,
      env: { ...process.env, ...service.env },
      detached: true,
      stdio: "ignore"
    });

    subprocess.unref();
    
    // Wait a bit before starting next service
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log("");
  console.log(`✅ Profile "${profile.name}" started successfully`);
}

function listServices(config: PortsConfig): void {
  console.log("📋 Available Services:\n");
  
  Object.entries(config.ports).forEach(([project, services]) => {
    console.log(`📦 ${project}`);
    Object.entries(services).forEach(([serviceKey, service]) => {
      const status = service.optional ? "optional" : "critical";
      console.log(`   • ${serviceKey.padEnd(12)} → ${service.name.padEnd(25)} :${service.port} [${status}]`);
    });
    console.log("");
  });
}

function listProfiles(config: PortsConfig): void {
  if (!config.profiles) {
    console.log("No profiles defined");
    return;
  }

  console.log("🎯 Available Profiles:\n");
  
  Object.entries(config.profiles).forEach(([profileId, profile]) => {
    console.log(`📌 ${profileId}`);
    console.log(`   Name: ${profile.name}`);
    console.log(`   Description: ${profile.description}`);
    console.log(`   Services (${profile.services.length}):`);
    profile.services.forEach(serviceId => {
      const service = getService(config, serviceId);
      if (service) {
        console.log(`      - ${service.name} :${service.port}`);
      }
    });
    console.log("");
  });
}

function showHelp(): void {
  console.log(`
🎵 Orchestra Ports Manager

Usage:
  npm run ports <command> [options]

Commands:
  list              List all available services
  profiles          List all available profiles
  start <service>   Start a specific service (e.g., clawd-cursor-main.backend)
  profile <name>    Start all services in a profile (e.g., full, clawd-only)
  help              Show this help message

Examples:
  npm run ports list
  npm run ports start clawd-cursor-main.backend
  npm run ports profile full
  npm run ports profile orchestra-only
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "help") {
    showHelp();
    return;
  }

  const config = loadConfig();

  switch (command) {
    case "list":
      listServices(config);
      break;
    
    case "profiles":
      listProfiles(config);
      break;
    
    case "start":
      if (!args[1]) {
        console.error("❌ Missing service ID");
        console.log("Usage: npm run ports start <service-id>");
        process.exit(1);
      }
      await startService(config, args[1]);
      break;
    
    case "profile":
      if (!args[1]) {
        console.error("❌ Missing profile ID");
        console.log("Usage: npm run ports profile <profile-id>");
        process.exit(1);
      }
      await startProfile(config, args[1]);
      break;
    
    default:
      console.error(`❌ Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

main().catch(error => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
