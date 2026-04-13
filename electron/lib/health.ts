import type { ServicesConfig } from "./config.js";
import type { PortRow } from "./ports.js";

export async function checkServiceHealth(
  service: ServicesConfig["services"][string],
  portsRaw: PortRow[]
) {
  const healthCheck = service.healthCheck;
  if (!healthCheck) return true;

  if (healthCheck.type === "port") {
    const port = typeof healthCheck.value === "number" ? healthCheck.value : Number(healthCheck.value);
    if (!Number.isFinite(port)) return false;
    return portsRaw.some((row) => row.port === port);
  }

  if (healthCheck.type === "http") {
    const url = String(healthCheck.value);
    const timeoutMs = healthCheck.timeoutMs ?? 2000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  return true;
}
