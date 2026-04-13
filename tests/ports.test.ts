import { describe, it, expect } from "vitest";
import { parseLsofPort, buildPortRows } from "../electron/lib/ports.js";

describe("parseLsofPort", () => {
  it("parses a standard lsof line", () => {
    const line = "node      12345 user   22u  IPv4 0x...      0t0  TCP *:3000 (LISTEN)";
    const result = parseLsofPort(line);
    expect(result).toEqual({ name: "node", pid: 12345, port: 3000 });
  });

  it("returns null for non-numeric port", () => {
    const line = "node      12345 user   22u  IPv4 0x...      0t0  TCP *:abc (LISTEN)";
    expect(parseLsofPort(line)).toBeNull();
  });

  it("handles IPv6 addresses", () => {
    const line = "node      999 user   22u  IPv6 0x...      0t0  TCP [::1]:8080 (LISTEN)";
    const result = parseLsofPort(line);
    expect(result).toEqual({ name: "node", pid: 999, port: 8080 });
  });

  it("handles empty line gracefully", () => {
    const result = parseLsofPort("");
    expect(result === null || result.port === 0).toBe(true);
  });
});

describe("buildPortRows", () => {
  it("marks multiple PIDs on same port as conflict", async () => {
    const portsRaw = [
      { name: "node", pid: 1, port: 3000 },
      { name: "node", pid: 2, port: 3000 }
    ];
    const services = [
      { id: "svc1", name: "SVC1", kind: "web" as const, status: "healthy" as const, severity: "success" as const, instances: 1, expectedInstances: 1, pids: [1], cpu: "1%", memory: "10 MB", ports: [3000], uptime: "5m" }
    ];
    const rows = await buildPortRows(portsRaw, services, []);
    const conflictRows = rows.filter((r) => r.status === "conflict");
    expect(conflictRows.length).toBe(2);
  });

  it("shows free reserved ports", async () => {
    const rows = await buildPortRows([], [], [{ port: 4000, project: "NextJS" }]);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("free");
    expect(rows[0].serviceName).toBe("NextJS");
  });

  it("links port to service by pid", async () => {
    const portsRaw = [{ name: "node", pid: 100, port: 5000 }];
    const services = [
      { id: "api", name: "API", kind: "web" as const, status: "healthy" as const, severity: "success" as const, instances: 1, expectedInstances: 1, pids: [100], cpu: "1%", memory: "10 MB", ports: [5000], uptime: "5m" }
    ];
    const rows = await buildPortRows(portsRaw, services, []);
    expect(rows[0].serviceName).toBe("API");
  });

  it("deduplicates identical port entries", async () => {
    const portsRaw = [
      { name: "node", pid: 1, port: 3000 },
      { name: "node", pid: 1, port: 3000 }
    ];
    const rows = await buildPortRows(portsRaw, [], []);
    expect(rows).toHaveLength(1);
  });

  it("sorts output by port number", async () => {
    const portsRaw = [
      { name: "node", pid: 1, port: 8080 },
      { name: "node", pid: 2, port: 3000 },
      { name: "node", pid: 3, port: 5000 }
    ];
    const rows = await buildPortRows(portsRaw, [], []);
    expect(rows.map((r) => r.port)).toEqual([3000, 5000, 8080]);
  });
});
