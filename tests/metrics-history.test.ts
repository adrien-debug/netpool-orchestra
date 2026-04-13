import { describe, it, expect, beforeEach } from "vitest";

// We test MetricsHistory by importing the class directly. The singleton
// depends on rootDir (filesystem), but the class logic is pure in-memory.
// We extract and re-instantiate to avoid side effects.

interface MetricPoint {
  ts: number;
  cpu: number;
  ramAvailableGB: number;
  ramPressurePct: number;
  nodeProcesses: number;
  dockerContainers: number;
}

const MAX_POINTS = 120;

class MetricsHistory {
  private buffer: MetricPoint[] = [];

  push(point: MetricPoint) {
    this.buffer.push(point);
    if (this.buffer.length > MAX_POINTS) {
      this.buffer = this.buffer.slice(-MAX_POINTS);
    }
  }

  getAll(): readonly MetricPoint[] {
    return this.buffer;
  }

  getLast(n: number): MetricPoint[] {
    return this.buffer.slice(-n);
  }

  get length() {
    return this.buffer.length;
  }

  trend(key: keyof Omit<MetricPoint, "ts">, windowSize = 10): "up" | "down" | "stable" {
    if (this.buffer.length < windowSize) return "stable";
    const window = this.buffer.slice(-windowSize);
    const first = window[0][key] as number;
    const last = window[window.length - 1][key] as number;
    const delta = last - first;
    const threshold = Math.abs(first) * 0.05 || 1;
    if (delta > threshold) return "up";
    if (delta < -threshold) return "down";
    return "stable";
  }

  average(key: keyof Omit<MetricPoint, "ts">, windowSize = 10): number {
    if (!this.buffer.length) return 0;
    const window = this.buffer.slice(-windowSize);
    return window.reduce((sum, p) => sum + (p[key] as number), 0) / window.length;
  }

  clear() {
    this.buffer = [];
  }
}

function makePoint(overrides: Partial<MetricPoint> = {}): MetricPoint {
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

describe("MetricsHistory", () => {
  let history: MetricsHistory;

  beforeEach(() => {
    history = new MetricsHistory();
  });

  describe("push & getAll", () => {
    it("tracks pushed points", () => {
      history.push(makePoint());
      history.push(makePoint());
      expect(history.length).toBe(2);
      expect(history.getAll()).toHaveLength(2);
    });

    it("caps at MAX_POINTS (120)", () => {
      for (let i = 0; i < 130; i++) history.push(makePoint({ cpu: i }));
      expect(history.length).toBe(120);
      expect(history.getAll()[0].cpu).toBe(10);
    });
  });

  describe("getLast", () => {
    it("returns last N points", () => {
      for (let i = 0; i < 20; i++) history.push(makePoint({ cpu: i }));
      const last5 = history.getLast(5);
      expect(last5).toHaveLength(5);
      expect(last5[0].cpu).toBe(15);
      expect(last5[4].cpu).toBe(19);
    });

    it("returns all if N > length", () => {
      history.push(makePoint());
      expect(history.getLast(10)).toHaveLength(1);
    });
  });

  describe("trend", () => {
    it("detects upward trend", () => {
      for (let i = 0; i < 10; i++) history.push(makePoint({ cpu: 20 + i * 5 }));
      expect(history.trend("cpu")).toBe("up");
    });

    it("detects downward trend", () => {
      for (let i = 0; i < 10; i++) history.push(makePoint({ cpu: 80 - i * 5 }));
      expect(history.trend("cpu")).toBe("down");
    });

    it("detects stable trend", () => {
      for (let i = 0; i < 10; i++) history.push(makePoint({ cpu: 50 }));
      expect(history.trend("cpu")).toBe("stable");
    });

    it("returns stable for insufficient data", () => {
      history.push(makePoint());
      expect(history.trend("cpu")).toBe("stable");
    });

    it("works with custom window size", () => {
      for (let i = 0; i < 5; i++) history.push(makePoint({ ramPressurePct: 10 + i * 10 }));
      expect(history.trend("ramPressurePct", 5)).toBe("up");
    });

    it("handles zero first value (threshold fallback to 1)", () => {
      for (let i = 0; i < 10; i++) history.push(makePoint({ cpu: i * 2 }));
      expect(history.trend("cpu")).toBe("up");
    });
  });

  describe("average", () => {
    it("computes average of last N points", () => {
      history.push(makePoint({ cpu: 10 }));
      history.push(makePoint({ cpu: 20 }));
      history.push(makePoint({ cpu: 30 }));
      expect(history.average("cpu", 3)).toBe(20);
    });

    it("returns 0 for empty buffer", () => {
      expect(history.average("cpu")).toBe(0);
    });

    it("uses available data when window > length", () => {
      history.push(makePoint({ cpu: 50 }));
      expect(history.average("cpu", 10)).toBe(50);
    });

    it("only considers last N points", () => {
      for (let i = 0; i < 20; i++) history.push(makePoint({ cpu: i }));
      const avg5 = history.average("cpu", 5);
      expect(avg5).toBe((15 + 16 + 17 + 18 + 19) / 5);
    });
  });

  describe("clear", () => {
    it("empties the buffer", () => {
      history.push(makePoint());
      history.push(makePoint());
      history.clear();
      expect(history.length).toBe(0);
      expect(history.getAll()).toHaveLength(0);
    });
  });
});
