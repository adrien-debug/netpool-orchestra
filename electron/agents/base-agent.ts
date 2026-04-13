import type { EventBus } from "./event-bus.js";
import type { RuntimeSnapshot } from "../../src/shared/types.js";

export interface AgentConfig {
  id: string;
  name: string;
  tickIntervalMs: number;
  enabled: boolean;
}

export type AgentState = "idle" | "running" | "stopped" | "error";

const MAX_CONSECUTIVE_ERRORS = 5;
const ERROR_BACKOFF_MS = 5_000;

export abstract class BaseAgent {
  readonly id: string;
  readonly name: string;
  readonly tickIntervalMs: number;

  protected bus: EventBus;
  private _state: AgentState = "idle";
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _unsubs: (() => void)[] = [];
  private _consecutiveErrors = 0;
  private _lastError: string | null = null;

  constructor(config: AgentConfig, bus: EventBus) {
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
    if (this._state === "stopped") return;

    if (this._state === "error") {
      if (this._consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        return;
      }
      await new Promise((r) => setTimeout(r, ERROR_BACKOFF_MS * this._consecutiveErrors));
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
