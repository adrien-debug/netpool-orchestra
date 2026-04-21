#!/usr/bin/env tsx
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execa } from "execa";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface DeployConfig {
  environment: "development" | "staging" | "production";
  services: string[];
  checks: string[];
}

const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m"
};

function log(message: string, color: keyof typeof COLORS = "reset") {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function logStep(step: number, total: number, message: string) {
  log(`\n[${step}/${total}] ${message}`, "cyan");
}

function logSuccess(message: string) {
  log(`✅ ${message}`, "green");
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, "yellow");
}

function logError(message: string) {
  log(`❌ ${message}`, "red");
}

async function checkPrerequisites(): Promise<boolean> {
  log("\n🔍 Checking prerequisites...", "blue");

  const checks = [
    { name: "Node.js", command: "node --version" },
    { name: "npm", command: "npm --version" },
    { name: "git", command: "git --version" },
    { name: "Railway CLI", command: "railway --version", optional: true },
    { name: "Vercel CLI", command: "vercel --version", optional: true }
  ];

  let allPassed = true;

  for (const check of checks) {
    try {
      const { stdout } = await execa("bash", ["-lc", check.command]);
      logSuccess(`${check.name}: ${stdout.trim()}`);
    } catch (error) {
      if (check.optional) {
        logWarning(`${check.name}: Not installed (optional)`);
      } else {
        logError(`${check.name}: Not found`);
        allPassed = false;
      }
    }
  }

  return allPassed;
}

async function checkTokensStatus(): Promise<boolean> {
  log("\n🔑 Checking tokens status...", "blue");

  try {
    const { stdout } = await execa("npm", ["run", "tokens:status"]);
    console.log(stdout);

    // Check if all critical tokens are configured
    const criticalServices = ["sentry", "supabase", "stripe", "github"];
    const tokensConfig = JSON.parse(
      readFileSync(resolve(__dirname, "../config/TOKENS-CONFIG.json"), "utf-8")
    );

    let allConfigured = true;
    for (const service of criticalServices) {
      const tokens = tokensConfig.tokens[service]?.tokens || {};
      const configured = Object.values(tokens).filter((t: any) => t.value).length;
      const total = Object.keys(tokens).length;

      if (configured < total) {
        logWarning(`${service}: ${configured}/${total} tokens configured`);
        allConfigured = false;
      } else {
        logSuccess(`${service}: All tokens configured`);
      }
    }

    return allConfigured;
  } catch (error) {
    logError("Failed to check tokens status");
    return false;
  }
}

async function generateEnvFiles(environment: string): Promise<void> {
  const envMap: Record<string, string> = {
    development: "dev",
    staging: "staging",
    production: "prod"
  };
  const scriptEnv = envMap[environment] ?? environment;
  log(`\n📝 Generating .env files for ${scriptEnv}...`, "blue");

  try {
    await execa("npm", ["run", `tokens:${scriptEnv}`]);
    logSuccess(`.env.${scriptEnv} generated`);
  } catch (error) {
    logError(`Failed to generate .env.${scriptEnv}`);
    throw error;
  }
}

async function runTests(): Promise<boolean> {
  log("\n🧪 Running tests...", "blue");

  try {
    await execa("npm", ["test"], { stdio: "inherit" });
    logSuccess("All tests passed");
    return true;
  } catch (error) {
    logError("Tests failed");
    return false;
  }
}

async function buildProject(): Promise<boolean> {
  log("\n🔨 Building project...", "blue");

  try {
    await execa("npm", ["run", "build"], { stdio: "inherit" });
    logSuccess("Build successful");
    return true;
  } catch (error) {
    logError("Build failed");
    return false;
  }
}

async function deployBackend(): Promise<boolean> {
  log("\n🚂 Deploying backend to Railway...", "blue");

  try {
    await execa("railway", ["--version"]);
    await execa("railway", ["up"], {
      cwd: resolve(__dirname, "../backend"),
      stdio: "inherit"
    });

    logSuccess("Backend deployed to Railway");
    return true;
  } catch (error) {
    logWarning("Railway CLI not available or deployment failed");
    log("Deploy manually: cd backend && railway up", "yellow");
    return false;
  }
}

async function deployFrontend(): Promise<boolean> {
  log("\n🌐 Deploying frontend to Vercel...", "blue");

  try {
    await execa("vercel", ["--version"]);
    const args = ["--prod"];
    await execa("vercel", args, {
      cwd: resolve(__dirname, "../landing"),
      stdio: "inherit"
    });

    logSuccess("Frontend deployed to Vercel");
    return true;
  } catch (error) {
    logWarning("Vercel CLI not available or deployment failed");
    log("Deploy manually: cd landing && vercel --prod", "yellow");
    return false;
  }
}

async function gitCommitAndPush(): Promise<boolean> {
  log("\n📤 Committing and pushing to GitHub...", "blue");

  try {
    // Check if there are changes
    const { stdout: status } = await execa("git", ["status", "--porcelain"]);

    if (!status.trim()) {
      logSuccess("No changes to commit");
      return true;
    }

    // Add all changes
    await execa("git", ["add", "-A"]);
    logSuccess("Changes staged");

    // Commit
    const timestamp = new Date().toISOString();
    await execa("git", ["commit", "-m", `Deploy: ${timestamp}`]);
    logSuccess("Changes committed");

    // Push
    await execa("git", ["push"]);
    logSuccess("Changes pushed to GitHub");

    return true;
  } catch (error) {
    logError("Git operations failed");
    return false;
  }
}

async function showDeploymentSummary(results: Record<string, boolean>): Promise<void> {
  log("\n" + "=".repeat(60), "blue");
  log("📊 Deployment Summary", "blue");
  log("=".repeat(60), "blue");

  Object.entries(results).forEach(([step, success]) => {
    const status = success ? "✅" : "❌";
    const color = success ? "green" : "red";
    log(`${status} ${step}`, color);
  });

  log("=".repeat(60), "blue");

  const allSuccess = Object.values(results).every(v => v);
  if (allSuccess) {
    log("\n🎉 Deployment completed successfully!", "green");
  } else {
    log("\n⚠️  Deployment completed with warnings", "yellow");
    log("Check the logs above for details", "yellow");
  }
}

async function deploy(config: DeployConfig): Promise<void> {
  log("\n" + "=".repeat(60), "cyan");
  log(`🚀 Orchestra Deployment - ${config.environment.toUpperCase()}`, "cyan");
  log("=".repeat(60), "cyan");

  const results: Record<string, boolean> = {};

  try {
    // Step 1: Prerequisites
    logStep(1, 8, "Checking prerequisites");
    results["Prerequisites"] = await checkPrerequisites();

    // Step 2: Tokens
    logStep(2, 8, "Checking tokens configuration");
    results["Tokens Configuration"] = await checkTokensStatus();

    // Step 3: Generate .env
    logStep(3, 8, "Generating environment files");
    try {
      await generateEnvFiles(config.environment);
      results["Environment Files"] = true;
    } catch (error) {
      results["Environment Files"] = false;
    }

    // Step 4: Tests
    if (config.checks.includes("tests")) {
      logStep(4, 8, "Running tests");
      results["Tests"] = await runTests();
    } else {
      logWarning("Skipping tests (--skip-tests)");
      results["Tests"] = true;
    }

    // Step 5: Build
    if (config.checks.includes("build")) {
      logStep(5, 8, "Building project");
      results["Build"] = await buildProject();
    } else {
      logWarning("Skipping build (--skip-build)");
      results["Build"] = true;
    }

    // Step 6: Deploy Backend
    if (config.services.includes("backend")) {
      logStep(6, 8, "Deploying backend");
      results["Backend Deployment"] = await deployBackend();
    }

    // Step 7: Deploy Frontend
    if (config.services.includes("frontend")) {
      logStep(7, 8, "Deploying frontend");
      results["Frontend Deployment"] = await deployFrontend();
    }

    // Step 8: Git Push
    logStep(8, 8, "Committing and pushing to GitHub");
    results["Git Push"] = await gitCommitAndPush();

    // Summary
    await showDeploymentSummary(results);
  } catch (error) {
    logError(`Deployment failed: ${error}`);
    process.exit(1);
  }
}

function showHelp(): void {
  console.log(`
🚀 Orchestra Deployment Tool

Usage:
  npm run deploy [environment] [options]

Environments:
  dev, development    Deploy to development
  staging            Deploy to staging
  prod, production   Deploy to production (default)

Options:
  --backend-only     Deploy only backend
  --frontend-only    Deploy only frontend
  --skip-tests       Skip running tests
  --skip-build       Skip building project
  --help             Show this help message

Examples:
  npm run deploy                    # Deploy to production (all services)
  npm run deploy dev                # Deploy to development
  npm run deploy staging            # Deploy to staging
  npm run deploy prod --backend-only  # Deploy only backend to production
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    return;
  }

  // Parse environment
  const envArg = args.find(a => !a.startsWith("--"));
  let environment: "development" | "staging" | "production" = "production";

  if (envArg === "dev" || envArg === "development") {
    environment = "development";
  } else if (envArg === "staging") {
    environment = "staging";
  } else if (envArg === "prod" || envArg === "production") {
    environment = "production";
  }

  // Parse services
  let services = ["backend", "frontend"];
  if (args.includes("--backend-only")) {
    services = ["backend"];
  } else if (args.includes("--frontend-only")) {
    services = ["frontend"];
  }

  // Parse checks
  const checks = [];
  if (!args.includes("--skip-tests")) checks.push("tests");
  if (!args.includes("--skip-build")) checks.push("build");

  const config: DeployConfig = {
    environment,
    services,
    checks
  };

  await deploy(config);
}

main().catch(error => {
  logError(`Fatal error: ${error}`);
  process.exit(1);
});
