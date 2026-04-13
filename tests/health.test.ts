import { describe, it, expect } from "vitest";
import { checkServiceHealth } from "../electron/lib/health.js";

const makeService = (healthCheck?: { type: "port" | "http"; value: number | string; timeoutMs?: number }) => ({
  kind: "web" as const,
  start: "npm start",
  stop: "npm stop",
  match: ["test"],
  maxInstances: 1,
  ports: [] as number[],
  healthCheck
});

describe("checkServiceHealth", () => {
  it("returns true when no healthCheck defined", async () => {
    const result = await checkServiceHealth(makeService(), []);
    expect(result).toBe(true);
  });

  it("returns true when port is listening", async () => {
    const service = makeService({ type: "port", value: 3000 });
    const ports = [{ name: "node", pid: 1, port: 3000 }];
    const result = await checkServiceHealth(service, ports);
    expect(result).toBe(true);
  });

  it("returns false when port is not listening", async () => {
    const service = makeService({ type: "port", value: 3000 });
    const result = await checkServiceHealth(service, []);
    expect(result).toBe(false);
  });

  it("returns false for invalid port value", async () => {
    const service = makeService({ type: "port", value: "not-a-port" });
    const result = await checkServiceHealth(service, []);
    expect(result).toBe(false);
  });

  it("returns false for HTTP check on unreachable URL", async () => {
    const service = makeService({ type: "http", value: "http://127.0.0.1:19999/healthz", timeoutMs: 200 });
    const result = await checkServiceHealth(service, []);
    expect(result).toBe(false);
  });
});
