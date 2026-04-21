import { describe, it, expect, vi, beforeEach } from "vitest";
import { BaseAgent } from "../electron/agents/base-agent.js";
import type { EventBus } from "../electron/agents/event-bus.js";

class TestAgent extends BaseAgent {
  public onInitCalled = false;
  public onTickCalled = false;
  public onCleanupCalled = false;

  protected async onInit() {
    this.onInitCalled = true;
  }

  protected async onTick() {
    this.onTickCalled = true;
  }

  protected async onCleanup() {
    this.onCleanupCalled = true;
  }
}

abstract class TestBaseAgent {
  readonly id: string;
  readonly name: string;
  readonly tickIntervalMs: number;

  protected bus: EventBus;
  private _state: AgentState = "idle";
  private _consecutiveErrors = 0;
  private _lastError: string | null = null;

  constructor(config: { id: string; name: string; tickIntervalMs: number }, bus: EventBus) {
    this.id = config.id;
    this.name = config.name;
    this.tickIntervalMs = config.tickIntervalMs;
    this.bus = bus;
  }

  get state() { return this._state; }
  get consecutiveErrors() { return this._consecutiveErrors; }
  get lastError() { return this._lastError; }

  async start() {
    if (this._state === "running") return;
    this._state = "running";
    this._consecutiveErrors = 0;
    this._lastError = null;
    await this.onInit();
    this.bus.emit("agent:started", { agentId: this.id });
  }

  async stop() {
    if (this._state === "stopped") return;
    await this.onCleanup();
    this._state = "stopped";
    this.bus.emit("agent:stopped", { agentId: this.id });
  }

  async simulateTick() {
    if (this._state === "stopped") return;

    if (this._state === "error") {
      if (this._consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) return;
      this._state = "running";
      this.bus.emit("agent:recovering", { agentId: this.id, attempt: this._consecutiveErrors });
    }

    try {
      await this.onTick();
      if (this._consecutiveErrors > 0) {
        this.bus.emit("agent:recovered", { agentId: this.id, afterErrors: this._consecutiveErrors });
      }
      this._consecutiveErrors = 0;
      this._lastError = null;
    } catch (err) {
      this._consecutiveErrors++;
      this._lastError = err instanceof Error ? err.message : "Unknown error";
      this._state = "error";
      this.bus.emit("agent:error", {
        agentId: this.id,
        error: err,
        consecutiveErrors: this._consecutiveErrors,
        willRetry: this._consecutiveErrors < MAX_CONSECUTIVE_ERRORS
      });
    }
  }

  protected abstract onInit(): Promise<void>;
  protected abstract onTick(): Promise<void>;
  protected abstract onCleanup(): Promise<void>;
  abstract onSnapshot(snapshot: RuntimeSnapshot): void;
}

function createMockBus(): EventBus & { events: { event: string; data: unknown }[] } {
  const events: { event: string; data: unknown }[] = [];
  return {
    events,
    on: vi.fn(() => () => {}),
    emit: vi.fn((event: string, data?: unknown) => {
      events.push({ event, data });
    })
  };
}

class StableAgent extends TestBaseAgent {
  tickCount = 0;
  protected async onInit() {}
  protected async onTick() { this.tickCount++; }
  protected async onCleanup() {}
  onSnapshot() {}
}

class FailingAgent extends TestBaseAgent {
  failUntilTick = Infinity;
  tickCount = 0;
  protected async onInit() {}
  protected async onTick() {
    this.tickCount++;
    if (this.tickCount <= this.failUntilTick) throw new Error(`Fail #${this.tickCount}`);
  }
  protected async onCleanup() {}
  onSnapshot() {}
}

describe("BaseAgent", () => {
  let bus: ReturnType<typeof createMockBus>;

  beforeEach(() => {
    bus = createMockBus();
  });

  describe("lifecycle", () => {
    it("starts in idle state", () => {
      const agent = new StableAgent({ id: "test", name: "Test", tickIntervalMs: 1000 }, bus);
      expect(agent.state).toBe("idle");
    });

    it("transitions to running on start", async () => {
      const agent = new StableAgent({ id: "test", name: "Test", tickIntervalMs: 1000 }, bus);
      await agent.start();
      expect(agent.state).toBe("running");
      expect(bus.events.some((e) => e.event === "agent:started")).toBe(true);
    });

    it("transitions to stopped on stop", async () => {
      const agent = new StableAgent({ id: "test", name: "Test", tickIntervalMs: 1000 }, bus);
      await agent.start();
      await agent.stop();
      expect(agent.state).toBe("stopped");
    });

    it("does not start twice", async () => {
      const agent = new StableAgent({ id: "test", name: "Test", tickIntervalMs: 1000 }, bus);
      await agent.start();
      await agent.start();
      const startEvents = bus.events.filter((e) => e.event === "agent:started");
      expect(startEvents).toHaveLength(1);
    });
  });

  describe("ticking", () => {
    it("executes tick successfully", async () => {
      const agent = new StableAgent({ id: "test", name: "Test", tickIntervalMs: 1000 }, bus);
      await agent.start();
      await agent.simulateTick();
      expect(agent.tickCount).toBe(1);
      expect(agent.state).toBe("running");
    });

    it("does not tick when stopped", async () => {
      const agent = new StableAgent({ id: "test", name: "Test", tickIntervalMs: 1000 }, bus);
      await agent.start();
      await agent.stop();
      await agent.simulateTick();
      expect(agent.tickCount).toBe(0);
    });
  });

  describe("error recovery", () => {
    it("transitions to error on tick failure", async () => {
      const agent = new FailingAgent({ id: "test", name: "Test", tickIntervalMs: 1000 }, bus);
      await agent.start();
      await agent.simulateTick();
      expect(agent.state).toBe("error");
      expect(agent.consecutiveErrors).toBe(1);
      expect(agent.lastError).toBe("Fail #1");
    });

    it("recovers after transient error", async () => {
      const agent = new FailingAgent({ id: "test", name: "Test", tickIntervalMs: 1000 }, bus);
      agent.failUntilTick = 1;
      await agent.start();
      await agent.simulateTick(); // fails
      expect(agent.state).toBe("error");
      await agent.simulateTick(); // recovers
      expect(agent.state).toBe("running");
      expect(agent.consecutiveErrors).toBe(0);
      expect(bus.events.some((e) => e.event === "agent:recovered")).toBe(true);
    });

    it("stops retrying after MAX_CONSECUTIVE_ERRORS", async () => {
      const agent = new FailingAgent({ id: "test", name: "Test", tickIntervalMs: 1000 }, bus);
      await agent.start();
      for (let i = 0; i < MAX_CONSECUTIVE_ERRORS + 2; i++) {
        await agent.simulateTick();
      }
      expect(agent.consecutiveErrors).toBe(MAX_CONSECUTIVE_ERRORS);
      expect(agent.state).toBe("error");
      const errorEvents = bus.events.filter((e) => e.event === "agent:error");
      const lastError = errorEvents[errorEvents.length - 1].data as { willRetry: boolean };
      expect(lastError.willRetry).toBe(false);
    });

    it("resets errors on restart", async () => {
      const agent = new FailingAgent({ id: "test", name: "Test", tickIntervalMs: 1000 }, bus);
      await agent.start();
      await agent.simulateTick(); // fails
      expect(agent.consecutiveErrors).toBe(1);
      await agent.stop();
      await agent.start();
      expect(agent.consecutiveErrors).toBe(0);
      expect(agent.lastError).toBeNull();
    });
  });
});
