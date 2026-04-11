import { promises as fs } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { execa } from "execa";
import { getRuntimeSnapshot, runNamedAction } from "../electron/runtime";

type ProfileDoc = {
  profiles: Record<string, { start?: string[] }>;
};

type ServicesDoc = {
  services: Record<string, { optional?: boolean }>;
};

async function loadProfile(profileId: string) {
  const profilesPath = path.join(process.cwd(), "config", "profiles.yaml");
  const raw = await fs.readFile(profilesPath, "utf8");
  const doc = YAML.parse(raw) as ProfileDoc;
  const profile = doc.profiles[profileId];
  if (!profile) throw new Error(`Profile not found: ${profileId}`);
  return profile;
}

async function loadServices() {
  const servicesPath = path.join(process.cwd(), "config", "services.yaml");
  const raw = await fs.readFile(servicesPath, "utf8");
  return YAML.parse(raw) as ServicesDoc;
}

async function runAutoSetup() {
  await execa("npm", ["run", "-s", "auto-setup"], { stdio: "inherit" });
}

async function verify(profileId: string, withAutoSetup: boolean) {
  if (withAutoSetup) await runAutoSetup();

  const profile = await loadProfile(profileId);
  const services = await loadServices();
  const optionalSet = new Set(
    Object.entries(services.services)
      .filter(([, service]) => service.optional)
      .map(([id]) => id)
  );
  const startList = profile.start ?? [];

  await runNamedAction("profile-run", { profileId });
  await new Promise((resolve) => setTimeout(resolve, 2000));

  let snapshot = await getRuntimeSnapshot();
  let failures: string[] = [];
  let warnings: string[] = [];

  for (let attempt = 0; attempt < 3; attempt += 1) {
    failures = [];
    warnings = [];

    for (const serviceId of startList) {
      const service = snapshot.services.find((s) => s.id === serviceId);
      const optional = optionalSet.has(serviceId);
      if (!service) {
        (optional ? warnings : failures).push(`${serviceId}: introuvable dans le snapshot`);
        continue;
      }
      if (service.instances === 0 || service.status === "stopped") {
        (optional ? warnings : failures).push(`${serviceId}: arrêté`);
        continue;
      }
      if (service.instances > service.expectedInstances || service.status === "duplicate") {
        (optional ? warnings : failures).push(`${serviceId}: doublon (${service.instances}/${service.expectedInstances})`);
        continue;
      }
      if (service.status === "degraded") {
        (optional ? warnings : failures).push(`${serviceId}: dégradé (check santé en échec)`);
      }
    }

    if (!failures.length) break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
    snapshot = await getRuntimeSnapshot();
  }

  if (failures.length) {
    console.error("\nVérification échouée (services critiques):");
    for (const item of failures) console.error(`- ${item}`);
    if (warnings.length) {
      console.warn("\nAvertissements (services optionnels):");
      for (const item of warnings) console.warn(`- ${item}`);
    }
    process.exit(1);
  }

  if (warnings.length) {
    console.warn("\nVérification OK pour les services critiques, mais optionnels en anomalie:");
    for (const item of warnings) console.warn(`- ${item}`);
  } else {
    console.log("\nVérification OK:");
    for (const serviceId of startList) console.log(`- ${serviceId}`);
  }
}

const args = process.argv.slice(2);
const profileId = args.find((arg) => !arg.startsWith("-")) ?? "fullstack";
const withAutoSetup = args.includes("--auto-setup");

verify(profileId, withAutoSetup).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
