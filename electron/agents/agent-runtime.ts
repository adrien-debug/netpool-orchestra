import type { RuntimeSnapshot } from "../../src/shared/types.js";
import type { BaseAgent } from "./base-agent.js";
import { bus } from "./event-bus.js";

export class AgentRuntime {
  private agents = new Map<string, BaseAgent>();
  private running = false;

  get isRunning() { return this.running; }
  get bus() { return bus; }

  register(agent: BaseAgent) {
    if (this.agents.has(agent.id)) {
      throw new Error(`Agent "${agent.id}" already registered`);
    }
    this.agents.set(agent.id, agent);
  }

  unregister(agentId: string) {
    const agent = this.agents.get(agentId);
    if (agent) {
      void agent.stop();
      this.agents.delete(agentId);
    }
  }

  async startAll() {
    this.running = true;
    for (const agent of this.agents.values()) {
      await agent.start();
    }
    bus.emit("runtime:started");
  }

  async stopAll() {
    for (const agent of this.agents.values()) {
      await agent.stop();
    }
    this.running = false;
    bus.emit("runtime:stopped");
  }

  async startAgent(agentId: string) {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent "${agentId}" not found`);
    await agent.start();
  }

  async stopAgent(agentId: string) {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent "${agentId}" not found`);
    await agent.stop();
  }

  dispatchSnapshot(snapshot: RuntimeSnapshot) {
    bus.emit("snapshot:updated", snapshot);
    for (const agent of this.agents.values()) {
      if (agent.state === "running") {
        try { agent.onSnapshot(snapshot); } catch (err) {
          console.error(`[AgentRuntime] ${agent.id}.onSnapshot error:`, err);
        }
      }
    }
  }

  getStatus() {
    return Array.from(this.agents.values()).map((a) => ({
      id: a.id,
      name: a.name,
      state: a.state
    }));
  }

  getAgent(id: string) {
    return this.agents.get(id);
  }
}

export const agentRuntime = new AgentRuntime();
