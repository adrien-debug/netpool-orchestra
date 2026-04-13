type Listener = (data: unknown) => void;

export class EventBus {
  private listeners = new Map<string, Set<Listener>>();

  on(event: string, listener: Listener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
    return () => this.off(event, listener);
  }

  off(event: string, listener: Listener) {
    this.listeners.get(event)?.delete(listener);
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
    if (event) this.listeners.delete(event);
    else this.listeners.clear();
  }
}

export const bus = new EventBus();
