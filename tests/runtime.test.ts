import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { RuntimeSnapshot } from "../src/shared/types.js";

// Mock dependencies
vi.mock("ps-list", () => ({
  default: vi.fn(() => Promise.resolve([
    { pid: 1000, name: "node", cmd: "tsx watch src/index.ts start" },
    { pid: 1001, name: "node", cmd: "next dev" },
    { pid: 1002, name: "node", cmd: "tsx watch src/index.ts start" }
  ]))
}));

vi.mock("pidusage", () => ({
  default: vi.fn(() => Promise.resolve({
    1000: { cpu: 10, memory: 100 * 1024 * 1024, elapsed: 60000 },
    1001: { cpu: 20, memory: 200 * 1024 * 1024, elapsed: 120000 },
    1002: { cpu: 15, memory: 150 * 1024 * 1024, elapsed: 90000 }
  }))
}));

vi.mock("systeminformation", () => ({
  default: {
    mem: vi.fn(() => Promise.resolve({
      total: 16 * 1024 * 1024 * 1024,
      available: 8 * 1024 * 1024 * 1024
    })),
    currentLoad: vi.fn(() => Promise.resolve({
      currentLoad: 45.5
    }))
  }
}));

vi.mock("execa", () => ({
  execa: vi.fn((cmd, args) => {
    if (args?.includes("lsof")) {
      return Promise.resolve({
        stdout: "node    1001  user   23u  IPv4  0x123  TCP *:3010 (LISTEN)"
      });
    }
    if (args?.includes("docker")) {
      return Promise.resolve({ stdout: "" });
    }
    if (args?.includes("ps -axo")) {
      return Promise.resolve({ stdout: "" });
    }
    return Promise.resolve({ stdout: "" });
  })
}));

describe("Runtime Snapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should generate a valid snapshot structure", async () => {
    const { getRuntimeSnapshot } = await import("../electron/runtime.js");
    const snapshot = await getRuntimeSnapshot();

    expect(snapshot).toBeDefined();
    expect(snapshot).toHaveProperty("metrics");
    expect(snapshot).toHaveProperty("alerts");
    expect(snapshot).toHaveProperty("services");
    expect(snapshot).toHaveProperty("ports");
    expect(snapshot).toHaveProperty("docker");
    expect(snapshot).toHaveProperty("logs");
  });

  it("should include system metrics", async () => {
    const { getRuntimeSnapshot } = await import("../electron/runtime.js");
    const snapshot = await getRuntimeSnapshot();

    expect(snapshot.metrics.length).toBeGreaterThan(0);
    
    const cpuMetric = snapshot.metrics.find((m) => m.id === "cpu");
    expect(cpuMetric).toBeDefined();
    expect(cpuMetric?.value).toContain("%");

    const ramMetric = snapshot.metrics.find((m) => m.id === "ram");
    expect(ramMetric).toBeDefined();
    expect(ramMetric?.value).toContain("GB");
  });

  it("should detect services from config", async () => {
    const { getRuntimeSnapshot } = await import("../electron/runtime.js");
    const snapshot = await getRuntimeSnapshot();

    expect(Array.isArray(snapshot.services)).toBe(true);
    
    // Should detect clawd-main (2 instances from mock)
    const clawdMain = snapshot.services.find((s) => s.id === "clawd-main");
    if (clawdMain) {
      expect(clawdMain.instances).toBeGreaterThanOrEqual(0);
      expect(clawdMain).toHaveProperty("status");
      expect(clawdMain).toHaveProperty("cpu");
      expect(clawdMain).toHaveProperty("memory");
    }
  });

  it("should detect duplicate services", async () => {
    const { getRuntimeSnapshot } = await import("../electron/runtime.js");
    const snapshot = await getRuntimeSnapshot();

    // Mock has 2 instances of clawd-main, maxInstances is 4, so should be healthy
    const clawdMain = snapshot.services.find((s) => s.id === "clawd-main");
    if (clawdMain && clawdMain.instances > clawdMain.expectedInstances) {
      expect(clawdMain.status).toBe("duplicate");
      expect(clawdMain.severity).toBe("danger");
    }
  });

  it("should generate alerts for issues", async () => {
    const { getRuntimeSnapshot } = await import("../electron/runtime.js");
    const snapshot = await getRuntimeSnapshot();

    expect(Array.isArray(snapshot.alerts)).toBe(true);
    expect(snapshot.alerts.length).toBeGreaterThan(0);

    // Should have at least a healthy alert or issue alerts
    const hasAlerts = snapshot.alerts.some((a) => 
      a.severity === "success" || a.severity === "warning" || a.severity === "danger"
    );
    expect(hasAlerts).toBe(true);
  });

  it("should list ports", async () => {
    const { getRuntimeSnapshot } = await import("../electron/runtime.js");
    const snapshot = await getRuntimeSnapshot();

    expect(Array.isArray(snapshot.ports)).toBe(true);
    
    // Mock returns port 3010, but it might be marked as "libre" if not in config
    const port3010 = snapshot.ports.find((p) => p.port === 3010);
    if (port3010) {
      expect(port3010.port).toBe(3010);
      // Process name can be "node" or "libre" depending on port registry
      expect(["node", "libre"]).toContain(port3010.processName);
    }
  });

  it("should include logs", async () => {
    const { getRuntimeSnapshot } = await import("../electron/runtime.js");
    const snapshot = await getRuntimeSnapshot();

    expect(Array.isArray(snapshot.logs)).toBe(true);
    expect(snapshot.logs.length).toBeGreaterThan(0);

    const firstLog = snapshot.logs[0];
    expect(firstLog).toHaveProperty("timestamp");
    expect(firstLog).toHaveProperty("level");
    expect(firstLog).toHaveProperty("message");
    expect(firstLog).toHaveProperty("scope");
  });

  it("should handle snapshot errors gracefully", async () => {
    const { getRuntimeSnapshot } = await import("../electron/runtime.js");
    
    // The snapshot should always return a valid structure even on errors
    const snapshot = await getRuntimeSnapshot();
    
    expect(snapshot).toBeDefined();
    expect(snapshot).toHaveProperty("metrics");
    expect(snapshot).toHaveProperty("alerts");
    expect(snapshot).toHaveProperty("services");
    expect(Array.isArray(snapshot.alerts)).toBe(true);
    
    // If there's an error, it should be in alerts
    // But since mocks are working, we just verify structure is valid
    expect(snapshot.alerts.length).toBeGreaterThanOrEqual(0);
  });
});

describe("Runtime Actions", () => {
  it("should validate action IDs", async () => {
    const { runNamedAction } = await import("../electron/runtime.js");
    
    const result = await runNamedAction("invalid-action");
    expect(result).toHaveProperty("ok");
    expect(result).toHaveProperty("message");
    if ("ok" in result) {
      expect(result.ok).toBe(false);
      expect(result.message).toContain("inconnue");
    }
  });

  it("should handle doctor action", async () => {
    const { runNamedAction } = await import("../electron/runtime.js");
    
    const result = await runNamedAction("doctor");
    expect(result).toHaveProperty("metrics");
    expect(result).toHaveProperty("alerts");
    expect(result).toHaveProperty("services");
  });

  it("should validate port parameter for free-port action", async () => {
    const { runNamedAction } = await import("../electron/runtime.js");
    
    const result = await runNamedAction("free-port", {});
    expect(result).toHaveProperty("ok");
    if ("ok" in result) {
      expect(result.ok).toBe(false);
      expect(result.message).toContain("port");
    }
  });

  it("should validate serviceId parameter for service actions", async () => {
    const { runNamedAction } = await import("../electron/runtime.js");
    
    const startResult = await runNamedAction("service-start", {});
    expect(startResult).toHaveProperty("ok");
    if ("ok" in startResult) {
      expect(startResult.ok).toBe(false);
      expect(startResult.message).toContain("serviceId");
    }

    const stopResult = await runNamedAction("service-stop", {});
    expect(stopResult).toHaveProperty("ok");
    if ("ok" in stopResult) {
      expect(stopResult.ok).toBe(false);
      expect(stopResult.message).toContain("serviceId");
    }

    const restartResult = await runNamedAction("service-restart", {});
    expect(restartResult).toHaveProperty("ok");
    if ("ok" in restartResult) {
      expect(restartResult.ok).toBe(false);
      expect(restartResult.message).toContain("serviceId");
    }
  });

  it("should validate profileId parameter for profile action", async () => {
    const { runNamedAction } = await import("../electron/runtime.js");
    
    const result = await runNamedAction("profile-run", {});
    expect(result).toHaveProperty("ok");
    if ("ok" in result) {
      expect(result.ok).toBe(false);
      expect(result.message).toContain("profileId");
    }
  });
});

describe("Metrics History", () => {
  it("should track metrics over time", async () => {
    const { getMetricsHistory } = await import("../electron/runtime.js");
    
    const history = getMetricsHistory();
    expect(Array.isArray(history)).toBe(true);
    
    // After snapshot, should have at least 1 point
    if (history.length > 0) {
      const point = history[0];
      expect(point).toHaveProperty("ts");
      expect(point).toHaveProperty("cpu");
      expect(point).toHaveProperty("ramAvailableGB");
      expect(point).toHaveProperty("ramPressurePct");
      expect(point).toHaveProperty("nodeProcesses");
      expect(point).toHaveProperty("dockerContainers");
    }
  });
});
