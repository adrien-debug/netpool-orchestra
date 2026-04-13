#!/usr/bin/env tsx
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TokenConfig {
  name: string;
  value: string;
  envVar: string;
  scope: string[];
  expiresAt: string | null;
  createdAt: string | null;
  note?: string;
}

interface ServiceConfig {
  name: string;
  description: string;
  url: string;
  tokens: Record<string, TokenConfig>;
  projects?: Record<string, any>;
  products?: Record<string, any>;
  models?: Record<string, any>;
}

interface TokensConfig {
  version: string;
  tokens: Record<string, ServiceConfig>;
  environments?: Record<string, {
    name: string;
    description: string;
    services: string[];
    envFile: string;
  }>;
}

const CONFIG_PATH = resolve(__dirname, "../config/TOKENS-CONFIG.json");

function loadConfig(): TokensConfig {
  const content = readFileSync(CONFIG_PATH, "utf-8");
  return JSON.parse(content);
}

function saveConfig(config: TokensConfig): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

function listServices(config: TokensConfig): void {
  console.log("🔑 Available Services:\n");
  
  Object.entries(config.tokens).forEach(([serviceId, service]) => {
    console.log(`📦 ${serviceId.padEnd(15)} → ${service.name}`);
    console.log(`   ${service.description}`);
    console.log(`   URL: ${service.url}`);
    console.log(`   Tokens: ${Object.keys(service.tokens).length}`);
    
    Object.entries(service.tokens).forEach(([tokenId, token]) => {
      const status = token.value ? "✅ configured" : "⚠️  missing";
      console.log(`      • ${tokenId.padEnd(20)} → ${token.name.padEnd(30)} [${status}]`);
    });
    console.log("");
  });
}

function showService(config: TokensConfig, serviceId: string): void {
  const service = config.tokens[serviceId];
  if (!service) {
    console.error(`❌ Service "${serviceId}" not found`);
    process.exit(1);
  }

  console.log(`\n📦 ${service.name}`);
  console.log(`   ${service.description}`);
  console.log(`   URL: ${service.url}\n`);

  console.log("🔑 Tokens:");
  Object.entries(service.tokens).forEach(([tokenId, token]) => {
    const status = token.value ? "✅" : "⚠️ ";
    const masked = token.value ? maskToken(token.value) : "not configured";
    console.log(`   ${status} ${token.name}`);
    console.log(`      ID: ${tokenId}`);
    console.log(`      Env: ${token.envVar}`);
    console.log(`      Value: ${masked}`);
    console.log(`      Scope: ${token.scope.join(", ")}`);
    if (token.note) console.log(`      Note: ${token.note}`);
    if (token.expiresAt) console.log(`      Expires: ${token.expiresAt}`);
    console.log("");
  });

  if (service.projects) {
    console.log("📁 Projects:");
    Object.entries(service.projects).forEach(([projectId, project]: [string, any]) => {
      console.log(`   • ${projectId}: ${project.name}`);
      if (project.note) console.log(`     ${project.note}`);
    });
    console.log("");
  }

  if (service.products) {
    console.log("💳 Products:");
    Object.entries(service.products).forEach(([productId, product]: [string, any]) => {
      console.log(`   • ${productId}: ${product.name} - ${product.amount} ${product.currency}/${product.interval}`);
    });
    console.log("");
  }

  if (service.models) {
    console.log("🤖 Models:");
    Object.entries(service.models).forEach(([modelId, modelName]) => {
      console.log(`   • ${modelId}: ${modelName}`);
    });
    console.log("");
  }
}

function maskToken(token: string): string {
  if (token.length <= 8) return "***";
  const start = token.slice(0, 8);
  const end = token.slice(-4);
  return `${start}...${end}`;
}

function setToken(config: TokensConfig, serviceId: string, tokenId: string, value: string): void {
  const service = config.tokens[serviceId];
  if (!service) {
    console.error(`❌ Service "${serviceId}" not found`);
    process.exit(1);
  }

  const token = service.tokens[tokenId];
  if (!token) {
    console.error(`❌ Token "${tokenId}" not found in service "${serviceId}"`);
    process.exit(1);
  }

  token.value = value;
  if (!token.createdAt) {
    token.createdAt = new Date().toISOString().split("T")[0];
  }

  saveConfig(config);
  console.log(`✅ Token "${token.name}" set successfully`);
  console.log(`   Service: ${service.name}`);
  console.log(`   Env var: ${token.envVar}`);
  console.log(`   Value: ${maskToken(value)}`);
}

function generateEnv(config: TokensConfig, environment: string): void {
  const env = config.environments?.[environment];
  if (!env) {
    console.error(`❌ Environment "${environment}" not found`);
    process.exit(1);
  }

  console.log(`📝 Generating ${env.envFile}...\n`);

  const lines: string[] = [
    `# ${env.name} Environment`,
    `# ${env.description}`,
    `# Generated: ${new Date().toISOString()}`,
    ""
  ];

  env.services.forEach(serviceId => {
    const service = config.tokens[serviceId];
    if (!service) return;

    lines.push(`# ${service.name} - ${service.description}`);
    Object.entries(service.tokens).forEach(([tokenId, token]) => {
      if (token.value) {
        lines.push(`${token.envVar}=${token.value}`);
      } else {
        lines.push(`# ${token.envVar}= # TODO: Configure ${token.name}`);
      }
    });
    lines.push("");
  });

  const envPath = resolve(__dirname, "..", env.envFile);
  writeFileSync(envPath, lines.join("\n"), "utf-8");
  
  console.log(`✅ Generated ${env.envFile}`);
  console.log(`   Path: ${envPath}`);
  console.log(`   Services: ${env.services.length}`);
  console.log(`   Variables: ${lines.filter(l => l.includes("=") && !l.startsWith("#")).length}`);
}

function listEnvironments(config: TokensConfig): void {
  if (!config.environments) {
    console.log("No environments defined");
    return;
  }

  console.log("🌍 Available Environments:\n");
  
  Object.entries(config.environments).forEach(([envId, env]) => {
    console.log(`📌 ${envId}`);
    console.log(`   Name: ${env.name}`);
    console.log(`   Description: ${env.description}`);
    console.log(`   File: ${env.envFile}`);
    console.log(`   Services (${env.services.length}): ${env.services.join(", ")}`);
    console.log("");
  });
}

function checkStatus(config: TokensConfig): void {
  console.log("🔍 Token Status:\n");

  let totalTokens = 0;
  let configuredTokens = 0;

  Object.entries(config.tokens).forEach(([serviceId, service]) => {
    const tokens = Object.values(service.tokens);
    const configured = tokens.filter(t => t.value).length;
    const total = tokens.length;
    
    totalTokens += total;
    configuredTokens += configured;

    const percentage = Math.round((configured / total) * 100);
    const status = percentage === 100 ? "✅" : percentage > 0 ? "⚠️ " : "❌";
    
    console.log(`${status} ${service.name.padEnd(20)} ${configured}/${total} (${percentage}%)`);
  });

  console.log("");
  console.log(`📊 Overall: ${configuredTokens}/${totalTokens} tokens configured (${Math.round((configuredTokens / totalTokens) * 100)}%)`);
}

function showHelp(): void {
  console.log(`
🔑 Orchestra Tokens Manager

Usage:
  npm run tokens <command> [options]

Commands:
  list                          List all services and their tokens
  show <service>                Show detailed info for a service
  set <service> <token> <value> Set a token value
  env <environment>             Generate .env file for environment
  environments                  List all environments
  status                        Show configuration status
  help                          Show this help message

Examples:
  npm run tokens list
  npm run tokens show sentry
  npm run tokens set sentry auth "sntrys_..."
  npm run tokens env development
  npm run tokens status
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
    
    case "show":
      if (!args[1]) {
        console.error("❌ Missing service ID");
        console.log("Usage: npm run tokens show <service-id>");
        process.exit(1);
      }
      showService(config, args[1]);
      break;
    
    case "set":
      if (!args[1] || !args[2] || !args[3]) {
        console.error("❌ Missing arguments");
        console.log("Usage: npm run tokens set <service-id> <token-id> <value>");
        process.exit(1);
      }
      setToken(config, args[1], args[2], args[3]);
      break;
    
    case "env":
      if (!args[1]) {
        console.error("❌ Missing environment");
        console.log("Usage: npm run tokens env <environment>");
        process.exit(1);
      }
      generateEnv(config, args[1]);
      break;
    
    case "environments":
      listEnvironments(config);
      break;
    
    case "status":
      checkStatus(config);
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
