import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { EventBus } from "../electron/agents/event-bus.js";
import { PreventiveAgent } from "../electron/agents/preventive-agent.js";
import type { RuntimeSnapshot } from "../src/shared/types.js";

function createMockSnapshot(overrides?: Partial<RuntimeSnapshot>): RuntimeSnapshot {
  return {
    metrics: [
      { id: "cpu", label: "CPU", value: "50%", hint: "idle 50%", tone: "info" },
      { id: "ram", label: "RAM", value: "8 GB", hint: "50% pression", tone: "info" }
    ],
    alerts: [],
    services: [],
    ports: [],
    docker: [],
    logs: [],
    ...overrides
  };
}

describe("PreventiveAgent", () => {
  let bus: EventBus;
  let agent: PreventiveAgent;

  beforeEach(() => {
    bus = new EventBus();
    agent = new PreventiveAgent(bus);
  });

  afterEach(async () => {
    await agent.stop();
    bus.removeAll();
  });

  it("should initialize correctly", () => {
    expect(agent.id).toBe("preventive");
    expect(agent.name).toBe("Preventive Agent");
    expect(agent.state).toBe("idle");
  });

  it("should start and stop", async () => {
    await agent.start();
    expect(agent.state).toBe("running");

    await agent.stop();
    expect(agent.state).toBe("stopped");
  });

  it("should detect duplicate services", () => {
    const snapshot = createMockSnapshot({
      services: [
        {
          id: "test-service",
          name: "Test Service",
          kind: "dev",
          status: "duplicate",
          severity: "danger",
          optional: false,
          instances: 3,
          expectedInstances: 1,
          pids: [1000, 1001, 1002],
          cpu: "30%",
          memory: "300 MB",
          ports: [],
          uptime: "5m"
        }
      ]
    });

    let alertEmitted = false;
    bus.on("preventive:alert", () => {
      alertEmitted = true;
    });

    agent.onSnapshot(snapshot);

    expect(alertEmitted).toBe(true);
    const alerts = agent.getActiveAlerts();
    expect(alerts.length).toBeGreaterThan(0);
    
    const dupAlert = alerts.find((a) => a.type === "duplicate_detected");
    expect(dupAlert).toBeDefined();
    expect(dupAlert?.title).toContain("Doublons");
  });

  it("should detect port conflicts", () => {
    const snapshot = createMockSnapshot({
      ports: [
        {
          id: "port-3000-1",
          port: 3000,
          processName: "node",
          pid: 1000,
          status: "conflict",
          serviceName: "service-a"
        },
        {
          id: "port-3000-2",
          port: 3000,
          processName: "node",
          pid: 1001,
          status: "conflict",
          serviceName: "service-b"
        }
      ]
    });

    let alertEmitted = false;
    bus.on("preventive:alert", () => {
      alertEmitted = true;
    });

    agent.onSnapshot(snapshot);

    expect(alertEmitted).toBe(true);
    const alerts = agent.getActiveAlerts();
    
    const portAlert = alerts.find((a) => a.type === "port_conflict_new");
    expect(portAlert).toBeDefined();
    expect(portAlert?.title).toContain("3000");
  });

  it("should resolve alerts when issues are fixed", () => {
    // First snapshot with duplicate
    const snapshotWithIssue = createMockSnapshot({
      services: [
        {
          id: "test-service",
          name: "Test Service",
          kind: "dev",
          status: "duplicate",
          severity: "danger",
          optional: false,
          instances: 2,
          expectedInstances: 1,
          pids: [1000, 1001],
          cpu: "20%",
          memory: "200 MB",
          ports: [],
          uptime: "5m"
        }
      ]
    });

    agent.onSnapshot(snapshotWithIssue);
    expect(agent.getActiveAlerts().length).toBeGreaterThan(0);

    // Second snapshot without duplicate
    const snapshotFixed = createMockSnapshot({
      services: [
        {
          id: "test-service",
          name: "Test Service",
          kind: "dev",
          status: "healthy",
          severity: "success",
          optional: false,
          instances: 1,
          expectedInstances: 1,
          pids: [1000],
          cpu: "10%",
          memory: "100 MB",
          ports: [],
          uptime: "5m"
        }
      ]
    });

    let resolvedEmitted = false;
    bus.on("preventive:alert-resolved", () => {
      resolvedEmitted = true;
    });

    agent.onSnapshot(snapshotFixed);

    expect(resolvedEmitted).toBe(true);
    expect(agent.getActiveAlerts().length).toBe(0);
  });

  it("should track crash loops", async () => {
    await agent.start();

    // Service running
    const snapshot1 = createMockSnapshot({
      services: [
        {
          id: "crash-service",
          name: "Crash Service",
          kind: "dev",
          status: "healthy",
          severity: "success",
          optional: false,
          instances: 1,
          expectedInstances: 1,
          pids: [1000],
          cpu: "10%",
          memory: "100 MB",
          ports: [],
          uptime: "1m"
        }
      ]
    });
    agent.onSnapshot(snapshot1);

    // Service crashed (0 instances)
    const snapshot2 = createMockSnapshot({
      services: [
        {
          id: "crash-service",
          name: "Crash Service",
          kind: "dev",
          status: "stopped",
          severity: "neutral",
          optional: false,
          instances: 0,
          expectedInstances: 1,
          pids: [],
          cpu: "0%",
          memory: "0 MB",
          ports: [],
          uptime: "stopped"
        }
      ]
    });

    // Simulate 3 crashes
    for (let i = 0; i < 3; i++) {
      agent.onSnapshot(snapshot1); // Running
      agent.onSnapshot(snapshot2); // Crashed
    }

    const alerts = agent.getActiveAlerts();
    const crashAlert = alerts.find((a) => a.type === "crash_loop");
    
    // Should detect crash loop after 3 crashes
    expect(crashAlert).toBeDefined();
    if (crashAlert) {
      expect(crashAlert.title).toContain("Crash loop");
      expect(crashAlert.severity).toBe("danger");
    }
  });

  it("should not alert for optional service duplicates with warning severity", () => {
    const snapshot = createMockSnapshot({
      services: [
        {
          id: "optional-service",
          name: "Optional Service",
          kind: "mcp",
          status: "duplicate",
          severity: "warning",
          optional: true,
          instances: 2,
          expectedInstances: 1,
          pids: [1000, 1001],
          cpu: "20%",
          memory: "200 MB",
          ports: [],
          uptime: "5m"
        }
      ]
    });

    agent.onSnapshot(snapshot);

    const alerts = agent.getActiveAlerts();
    const dupAlert = alerts.find((a) => a.id === "dup-optional-service");
    
    expect(dupAlert).toBeDefined();
    if (dupAlert) {
      // Optional service should have warning severity, not danger
      expect(dupAlert.severity).toBe("warning");
    }
  });
});
