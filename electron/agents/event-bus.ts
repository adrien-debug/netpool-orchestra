type Listener = (data: unknown) => void;

export class EventBus {
  private listeners = new Map<string, Set<Listener>>();
  private readonly MAX_LISTENERS_PER_EVENT = 100;
  private totalListeners = 0;
  private readonly MAX_TOTAL_LISTENERS = 1000;

  on(event: string, listener: Listener): () => void {
    if (this.totalListeners >= this.MAX_TOTAL_LISTENERS) {
      throw new Error(`EventBus overflow: max ${this.MAX_TOTAL_LISTENERS} total listeners reached.`);
    }
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    const eventSet = this.listeners.get(event)!;
    if (eventSet.size >= this.MAX_LISTENERS_PER_EVENT) {
      throw new Error(`EventBus overflow: max ${this.MAX_LISTENERS_PER_EVENT} listeners for event "${event}".`);
    }
    eventSet.add(listener);
    this.totalListeners++;
    return () => this.off(event, listener);
  }

  off(event: string, listener: Listener) {
    const deleted = this.listeners.get(event)?.delete(listener);
    if (deleted) this.totalListeners--;
  }

  emit(event: string, data?: unknown) {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      try { fn(data); } catch (err) {
        console.error(`[EventBus] listener error on "${event}":`, err);
      }
    }
  }

  once(event: string, listener: Listener): () => void {
    const wrapped: Listener = (data) => {
      this.off(event, wrapped);
      listener(data);
    };
    return this.on(event, wrapped);
  }

  removeAll(event?: string) {
    if (event) {
      const size = this.listeners.get(event)?.size ?? 0;
      this.listeners.delete(event);
      this.totalListeners -= size;
    } else {
      this.listeners.clear();
      this.totalListeners = 0;
    }
  }
}

export const bus = new EventBus();
