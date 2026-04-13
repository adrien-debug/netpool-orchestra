import type { RuntimeActionResult, RuntimeSnapshot } from "../src/shared/types.js";

type ActionFn = () => Promise<RuntimeActionResult | RuntimeSnapshot>;

interface QueueEntry {
  fn: ActionFn;
  resolve: (value: RuntimeActionResult | RuntimeSnapshot) => void;
  reject: (error: unknown) => void;
  actionId: string;
  enqueuedAt: number;
}

class ActionQueue {
  private queue: QueueEntry[] = [];
  private running = false;

  get pending() {
    return this.queue.length;
  }

  get isRunning() {
    return this.running;
  }

  async enqueue(actionId: string, fn: ActionFn): Promise<RuntimeActionResult | RuntimeSnapshot> {
    return new Promise<RuntimeActionResult | RuntimeSnapshot>((resolve, reject) => {
      this.queue.push({ fn, resolve, reject, actionId, enqueuedAt: Date.now() });
      void this.processNext();
    });
  }

  private async processNext(): Promise<void> {
    if (this.running) return;
    const entry = this.queue.shift();
    if (!entry) return;

    this.running = true;
    try {
      const result = await entry.fn();
      entry.resolve(result);
    } catch (error) {
      entry.reject(error);
    } finally {
      this.running = false;
      void this.processNext();
    }
  }
}

export const actionQueue = new ActionQueue();
