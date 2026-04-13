import { describe, it, expect } from "vitest";
import {
  isProtectedProcess,
  processMatches,
  elapsedToSeconds,
  secondsToHuman,
  formatMemoryMB,
  statusFromInstances
} from "../electron/lib/process-utils.js";

describe("isProtectedProcess", () => {
  it("protects Cursor", () => {
    expect(isProtectedProcess("", "Cursor")).toBe(true);
    expect(isProtectedProcess("", "Cursor Helper")).toBe(true);
    expect(isProtectedProcess("", "cursor helper (Renderer)")).toBe(true);
  });

  it("protects Cursor app path", () => {
    expect(isProtectedProcess("/Applications/Cursor.app/Contents/MacOS/Cursor", "Cursor")).toBe(true);
  });

  it("protects Docker Desktop", () => {
    expect(isProtectedProcess("", "Docker Desktop")).toBe(true);
    expect(isProtectedProcess("/Applications/Docker.app/Contents/MacOS/Docker", "com.docker.vpnkit")).toBe(true);
  });

  it("protects Electron but not plain node", () => {
    expect(isProtectedProcess("", "Electron")).toBe(true);
    expect(isProtectedProcess("", "electron node")).toBe(false);
  });

  it("protects system processes", () => {
    expect(isProtectedProcess("", "Finder")).toBe(true);
    expect(isProtectedProcess("", "WindowServer")).toBe(true);
  });

  it("does not protect regular node processes", () => {
    expect(isProtectedProcess("/usr/local/bin/node server.js", "node")).toBe(false);
  });

  it("handles empty/null-like inputs", () => {
    expect(isProtectedProcess("", "")).toBe(false);
    expect(isProtectedProcess(undefined as unknown as string, undefined as unknown as string)).toBe(false);
  });
});

describe("processMatches", () => {
  it("matches command substring", () => {
    expect(processMatches("node /foo/shopify-mcp/dist/main.js", "node", ["shopify-mcp"])).toBe(true);
  });

  it("matches process name", () => {
    expect(processMatches("", "shopify-mcp", ["shopify-mcp"])).toBe(true);
  });

  it("returns false when no pattern matches", () => {
    expect(processMatches("node app.js", "node", ["shopify-mcp"])).toBe(false);
  });

  it("handles undefined cmd and name", () => {
    expect(processMatches(undefined, undefined, ["shopify"])).toBe(false);
  });

  it("matches any pattern in the list", () => {
    expect(processMatches("vite --port 3322", "node", ["vite", "webpack"])).toBe(true);
  });
});

describe("elapsedToSeconds", () => {
  it("parses MM:SS", () => {
    expect(elapsedToSeconds("05:30")).toBe(330);
  });

  it("parses HH:MM:SS", () => {
    expect(elapsedToSeconds("02:05:30")).toBe(7530);
  });

  it("parses DD-HH:MM:SS", () => {
    expect(elapsedToSeconds("1-02:05:30")).toBe(86400 + 7530);
  });

  it("handles zero", () => {
    expect(elapsedToSeconds("00:00")).toBe(0);
  });

  it("handles day with MM:SS", () => {
    expect(elapsedToSeconds("2-30:15")).toBe(2 * 86400 + 30 * 60 + 15);
  });
});

describe("secondsToHuman", () => {
  it("returns 'active' for zero", () => {
    expect(secondsToHuman(0)).toBe("active");
  });

  it("returns 'active' for NaN", () => {
    expect(secondsToHuman(NaN)).toBe("active");
  });

  it("returns 'active' for negative", () => {
    expect(secondsToHuman(-10)).toBe("active");
  });

  it("formats minutes only", () => {
    expect(secondsToHuman(300)).toBe("5m");
  });

  it("formats hours and minutes", () => {
    expect(secondsToHuman(3720)).toBe("1h 2m");
  });
});

describe("formatMemoryMB", () => {
  it("converts bytes to MB", () => {
    expect(formatMemoryMB(1024 * 1024 * 512)).toBe("512 MB");
  });

  it("rounds to nearest integer", () => {
    expect(formatMemoryMB(1024 * 1024 * 1.7)).toBe("2 MB");
  });

  it("handles zero", () => {
    expect(formatMemoryMB(0)).toBe("0 MB");
  });
});

describe("statusFromInstances", () => {
  it("returns stopped for 0 instances", () => {
    expect(statusFromInstances(0, 1, false)).toEqual({ status: "stopped", severity: "neutral" });
  });

  it("returns stopped/info for optional with 0 instances", () => {
    expect(statusFromInstances(0, 1, true)).toEqual({ status: "stopped", severity: "info" });
  });

  it("returns healthy when within max", () => {
    expect(statusFromInstances(1, 1, false)).toEqual({ status: "healthy", severity: "success" });
    expect(statusFromInstances(2, 3, false)).toEqual({ status: "healthy", severity: "success" });
  });

  it("returns duplicate/danger when exceeding max", () => {
    expect(statusFromInstances(3, 1, false)).toEqual({ status: "duplicate", severity: "danger" });
  });

  it("returns duplicate/warning for optional exceeding max", () => {
    expect(statusFromInstances(3, 1, true)).toEqual({ status: "duplicate", severity: "warning" });
  });
});
