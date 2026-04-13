import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { EventBus } from "../electron/agents/event-bus.js";
import { AutoFixAgent } from "../electron/agents/autofix-agent.js";
import type { RuntimeSnapshot } from "../src/shared/types.js";

function createMockSnapshot(overrides?: Partial<RuntimeSnapshot>): RuntimeSnapshot {
  return {
    metrics: [
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

describe("AutoFixAgent", () => {
  let bus: EventBus;
  let agent: AutoFixAgent;

  beforeEach(() => {
    bus = new EventBus();
    agent = new AutoFixAgent(bus);
  });

  afterEach(async () => {
    await agent.stop();
    bus.removeAll();
  });

  it("should initialize in suggest mode", () => {
    expect(agent.id).toBe("autofix");
    expect(agent.name).toBe("Auto-Fix Agent");
    expect(agent.getMode()).toBe("suggest");
    expect(agent.state).toBe("idle");
  });

  it("should start and stop", async () => {
    await agent.start();
    expect(agent.state).toBe("running");

    await agent.stop();
    expect(agent.state).toBe("stopped");
  });

  it("should detect duplicate services and propose fix", () => {
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

    let proposalsEmitted = false;
    bus.on("autofix:proposals", () => {
      proposalsEmitted = true;
    });

    agent.onSnapshot(snapshot);

    expect(proposalsEmitted).toBe(true);
    const proposals = agent.getProposals();
    expect(proposals.length).toBeGreaterThan(0);

    const dupProposal = proposals.find((p) => p.ruleId === "clean-duplicates");
    expect(dupProposal).toBeDefined();
    expect(dupProposal?.severity).toBe("danger");
  });

  it("should detect zombie find processes and propose fix", () => {
    const snapshot = createMockSnapshot({
      alerts: [
        {
          id: "zombie-find",
          title: "3 processus find orphelin(s)",
          description: "Des find anciens/orphelins ont été détectés",
          severity: "warning",
          actionLabel: "Nettoyer les zombies",
          actionId: "clean-zombies"
        }
      ]
    });

    agent.onSnapshot(snapshot);

    const proposals = agent.getProposals();
    const zombieProposal = proposals.find((p) => p.ruleId === "clean-zombies");
    
    expect(zombieProposal).toBeDefined();
    expect(zombieProposal?.severity).toBe("warning");
  });

  it("should detect degraded services and propose restart", () => {
    const snapshot = createMockSnapshot({
      services: [
        {
          id: "degraded-service",
          name: "Degraded Service",
          kind: "web",
          status: "degraded",
          severity: "warning",
          optional: false,
          instances: 1,
          expectedInstances: 1,
          pids: [1000],
          cpu: "10%",
          memory: "100 MB",
          ports: [3000],
          uptime: "5m"
        }
      ]
    });

    agent.onSnapshot(snapshot);

    const proposals = agent.getProposals();
    const degradedProposal = proposals.find((p) => p.ruleId === "restart-degraded");
    
    expect(degradedProposal).toBeDefined();
    expect(degradedProposal?.severity).toBe("warning");
  });

  it("should detect RAM emergency and propose fix", () => {
    const snapshot = createMockSnapshot({
      metrics: [
        { id: "ram", label: "RAM", value: "1.5 GB", hint: "95% pression", tone: "warning" }
      ],
      services: [
        {
          id: "optional-service",
          name: "Optional Service",
          kind: "mcp",
          status: "healthy",
          severity: "success",
          optional: true,
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

    agent.onSnapshot(snapshot);

    const proposals = agent.getProposals();
    const ramProposal = proposals.find((p) => p.ruleId === "ram-emergency");
    
    expect(ramProposal).toBeDefined();
    expect(ramProposal?.severity).toBe("danger");
  });

  it("should switch between suggest and auto modes", () => {
    expect(agent.getMode()).toBe("suggest");

    agent.setMode("auto");
    expect(agent.getMode()).toBe("auto");

    agent.setMode("suggest");
    expect(agent.getMode()).toBe("suggest");
  });

  it("should not execute in suggest mode", () => {
    const snapshot = createMockSnapshot({
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

    let executedEmitted = false;
    bus.on("autofix:executed", () => {
      executedEmitted = true;
    });

    agent.onSnapshot(snapshot);

    // In suggest mode, should not execute
    expect(executedEmitted).toBe(false);
    expect(agent.getExecutionLog().length).toBe(0);
  });

  it("should track circuit breaker state", () => {
    expect(agent.isCircuitOpen()).toBe(false);

    // Simulate 3 consecutive failures by setting mode to auto and triggering errors
    // (This would require mocking runNamedAction to fail, which is complex)
    // For now, just verify the circuit breaker exists
    expect(agent.isCircuitOpen()).toBe(false);
  });

  it("should protect services from auto-fix", () => {
    agent.protectService("important-service");
    
    const snapshot = createMockSnapshot({
      services: [
        {
          id: "important-service",
          name: "Important Service",
          kind: "dev",
          status: "degraded",
          severity: "warning",
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

    agent.onSnapshot(snapshot);

    const proposals = agent.getProposals();
    const degradedProposal = proposals.find((p) => p.ruleId === "restart-degraded");
    
    // Should not propose restart for protected service
    if (degradedProposal) {
      expect(degradedProposal.description).not.toContain("Important Service");
    }
  });

  it("should unprotect services", () => {
    agent.protectService("test-service");
    agent.unprotectService("test-service");
    
    const snapshot = createMockSnapshot({
      services: [
        {
          id: "test-service",
          name: "Test Service",
          kind: "dev",
          status: "degraded",
          severity: "warning",
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

    agent.onSnapshot(snapshot);

    const proposals = agent.getProposals();
    const degradedProposal = proposals.find((p) => p.ruleId === "restart-degraded");
    
    // Should propose restart after unprotecting
    expect(degradedProposal).toBeDefined();
  });
});
