import { describe, it, expect, vi } from "vitest";
import { EventBus } from "../electron/agents/event-bus.js";

describe("EventBus", () => {
  it("emits events to listeners", () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on("test", handler);
    bus.emit("test", { foo: 1 });
    expect(handler).toHaveBeenCalledWith({ foo: 1 });
  });

  it("supports multiple listeners", () => {
    const bus = new EventBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.on("test", a);
    bus.on("test", b);
    bus.emit("test");
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes via returned function", () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const unsub = bus.on("test", handler);
    unsub();
    bus.emit("test");
    expect(handler).not.toHaveBeenCalled();
  });

  it("once fires only once", () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.once("test", handler);
    bus.emit("test", "a");
    bus.emit("test", "b");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith("a");
  });

  it("removeAll clears specific event", () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on("a", handler);
    bus.on("b", handler);
    bus.removeAll("a");
    bus.emit("a");
    bus.emit("b");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("removeAll without arg clears everything", () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on("a", handler);
    bus.on("b", handler);
    bus.removeAll();
    bus.emit("a");
    bus.emit("b");
    expect(handler).not.toHaveBeenCalled();
  });

  it("catches listener errors without breaking others", () => {
    const bus = new EventBus();
    const bad = vi.fn(() => { throw new Error("boom"); });
    const good = vi.fn();
    bus.on("test", bad);
    bus.on("test", good);
    bus.emit("test");
    expect(bad).toHaveBeenCalled();
    expect(good).toHaveBeenCalled();
  });
});
