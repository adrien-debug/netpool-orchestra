import type { EventBus } from "./event-bus.js";
import type { RuntimeSnapshot } from "../../src/shared/types.js";

export interface AgentConfig {
  id: string;
  name: string;
  tickIntervalMs: number;
  enabled: boolean;
}

export type AgentState = "idle" | "running" | "stopped" | "error";

export abstract class BaseAgent {
  readonly id: string;
  readonly name: string;
  readonly tickIntervalMs: number;

  protected bus: EventBus;
  private _state: AgentState = "idle";
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _unsubs: (() => void)[] = [];

  constructor(config: AgentConfig, bus: EventBus) {
    this.id = config.id;
    this.name = config.name;
    this.tickIntervalMs = config.tickIntervalMs;
    this.bus = bus;
  }

  get state() { return this._state; }

  async start() {
    if (this._state === "running") return;
    this._state = "running";
    await this.onInit();
    this._timer = setInterval(() => void this.safeTick(), this.tickIntervalMs);
    this.bus.emit("agent:started", { agentId: this.id });
  }

  async stop() {
    if (this._state === "stopped") return;
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
    for (const unsub of this._unsubs) unsub();
    this._unsubs = [];
    await this.onCleanup();
    this._state = "stopped";
    this.bus.emit("agent:stopped", { agentId: this.id });
  }

  protected subscribe(event: string, listener: (data: unknown) => void) {
    this._unsubs.push(this.bus.on(event, listener));
  }

  private async safeTick() {
    if (this._state !== "running") return;
    try {
      await this.onTick();
    } catch (err) {
      this._state = "error";
      this.bus.emit("agent:error", { agentId: this.id, error: err });
    }
  }

  protected abstract onInit(): Promise<void>;
  protected abstract onTick(): Promise<void>;
  protected abstract onCleanup(): Promise<void>;
  abstract onSnapshot(snapshot: RuntimeSnapshot): void;
}
