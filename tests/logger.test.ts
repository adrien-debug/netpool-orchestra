import { describe, it, expect } from "vitest";
import { pushLog, getLogs, nowTime } from "../electron/lib/logger.js";

describe("logger", () => {
  it("pushes logs and retrieves them", () => {
    const before = getLogs().length;
    pushLog("info", "test message", "test.scope");
    const logs = getLogs();
    expect(logs.length).toBeGreaterThan(before);
    expect(logs[0].message).toBe("test message");
    expect(logs[0].scope).toBe("test.scope");
    expect(logs[0].level).toBe("info");
  });

  it("generates unique IDs", () => {
    pushLog("info", "a", "test");
    pushLog("info", "b", "test");
    const logs = getLogs();
    expect(logs[0].id).not.toBe(logs[1].id);
  });

  it("caps at 200 entries", () => {
    for (let i = 0; i < 250; i++) {
      pushLog("info", `msg ${i}`, "test.cap");
    }
    expect(getLogs().length).toBeLessThanOrEqual(200);
  });

  it("nowTime returns a string", () => {
    const t = nowTime();
    expect(typeof t).toBe("string");
    expect(t.length).toBeGreaterThan(0);
  });
});
