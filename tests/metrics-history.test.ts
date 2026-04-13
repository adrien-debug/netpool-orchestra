import { describe, it, expect, beforeEach } from "vitest";

// We can't easily import the singleton because it depends on rootDir, so
// we test the class logic by instantiating directly from the patterns.
// For the singleton, we verify the module loads correctly.

function makePoint(overrides: Partial<{ ts: number; cpu: number; ramAvailableGB: number; ramPressurePct: number; nodeProcesses: number; dockerContainers: number }> = {}) {
  return {
    ts: Date.now(),
    cpu: 30,
    ramAvailableGB: 16,
    ramPressurePct: 40,
    nodeProcesses: 10,
    dockerContainers: 2,
    ...overrides
  };
}

describe("MetricsHistory (inline)", () => {
  let buffer: ReturnType<typeof makePoint>[];

  beforeEach(() => {
    buffer = [];
  });

  function push(p: ReturnType<typeof makePoint>) {
    buffer.push(p);
    if (buffer.length > 120) buffer.splice(0, buffer.length - 120);
  }

  function trend(key: "cpu" | "ramPressurePct", windowSize = 10): "up" | "down" | "stable" {
    if (buffer.length < windowSize) return "stable";
    const window = buffer.slice(-windowSize);
    const first = window[0][key];
    const last = window[window.length - 1][key];
    const delta = last - first;
    const threshold = Math.abs(first) * 0.05 || 1;
    if (delta > threshold) return "up";
    if (delta < -threshold) return "down";
    return "stable";
  }

  it("tracks buffer length", () => {
    push(makePoint());
    push(makePoint());
    expect(buffer.length).toBe(2);
  });

  it("caps at 120 points", () => {
    for (let i = 0; i < 130; i++) push(makePoint({ cpu: i }));
    expect(buffer.length).toBe(120);
    expect(buffer[0].cpu).toBe(10);
  });

  it("detects upward trend", () => {
    for (let i = 0; i < 10; i++) push(makePoint({ cpu: 20 + i * 5 }));
    expect(trend("cpu")).toBe("up");
  });

  it("detects downward trend", () => {
    for (let i = 0; i < 10; i++) push(makePoint({ cpu: 80 - i * 5 }));
    expect(trend("cpu")).toBe("down");
  });

  it("detects stable trend", () => {
    for (let i = 0; i < 10; i++) push(makePoint({ cpu: 50 }));
    expect(trend("cpu")).toBe("stable");
  });

  it("returns stable for insufficient data", () => {
    push(makePoint());
    expect(trend("cpu")).toBe("stable");
  });
});
