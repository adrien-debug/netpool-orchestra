import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const rootDir = __dirname.includes("dist-electron")
  ? path.resolve(__dirname, "../../..")
  : path.resolve(__dirname, "../..");

export const servicesPath = path.join(rootDir, "config", "services.yaml");
export const profilesPath = path.join(rootDir, "config", "profiles.yaml");
export const portsRegistryPath = path.join(rootDir, "config", "ports.yaml");

const healthCheckSchema = z.object({
  type: z.enum(["port", "http"]),
  value: z.union([z.number().int().positive(), z.string()]),
  timeoutMs: z.number().int().positive().optional()
});

const serviceSchema = z.object({
  displayName: z.string().optional(),
  kind: z.enum(["mcp", "web", "dev", "docker", "system"]),
  cwd: z.string().optional(),
  start: z.string(),
  stop: z.string(),
  match: z.array(z.string()).min(1),
  maxInstances: z.number().int().positive(),
  ports: z.array(z.number()).default([]),
  healthCheck: healthCheckSchema.optional(),
  optional: z.boolean().optional()
});

export const servicesSchema = z.object({
  services: z.record(serviceSchema)
});

const profileSchema = z.object({
  displayName: z.string().optional(),
  description: z.string().optional(),
  start: z.array(z.string()).optional(),
  stop: z.array(z.string()).optional(),
  steps: z.array(z.union([z.string(), z.record(z.any())])).optional()
});

export const profilesSchema = z.object({
  profiles: z.record(profileSchema)
});

const reservedPortSchema = z.object({
  port: z.number().int().positive(),
  project: z.string().min(1),
  notes: z.string().optional()
});

export const portsRegistrySchema = z.object({
  ports: z.array(reservedPortSchema).default([])
});

export type ServicesConfig = z.infer<typeof servicesSchema>;
export type PortsRegistryConfig = z.infer<typeof portsRegistrySchema>;

export async function readServiceConfig(): Promise<ServicesConfig> {
  const raw = await fs.readFile(servicesPath, "utf8");
  return servicesSchema.parse(YAML.parse(raw));
}

export async function readProfilesConfig() {
  const raw = await fs.readFile(profilesPath, "utf8");
  return profilesSchema.parse(YAML.parse(raw));
}

export async function readPortsRegistryConfig(): Promise<PortsRegistryConfig> {
  try {
    const raw = await fs.readFile(portsRegistryPath, "utf8");
    return portsRegistrySchema.parse(YAML.parse(raw));
  } catch {
    return { ports: [] };
  }
}
