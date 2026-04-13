import { describe, it, expect } from "vitest";
import { servicesSchema, profilesSchema, portsRegistrySchema, rootDir } from "../electron/lib/config.js";

describe("servicesSchema", () => {
  it("validates a minimal service", () => {
    const data = {
      services: {
        "my-svc": {
          kind: "web",
          start: "npm start",
          stop: "npm stop",
          match: ["my-svc"],
          maxInstances: 1
        }
      }
    };
    const result = servicesSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const data = { services: { "my-svc": { kind: "web" } } };
    const result = servicesSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects invalid kind", () => {
    const data = {
      services: {
        "my-svc": { kind: "invalid", start: "x", stop: "x", match: ["x"], maxInstances: 1 }
      }
    };
    const result = servicesSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("validates optional healthCheck", () => {
    const data = {
      services: {
        "my-svc": {
          kind: "web",
          start: "npm start",
          stop: "npm stop",
          match: ["x"],
          maxInstances: 1,
          healthCheck: { type: "port", value: 3000 }
        }
      }
    };
    const result = servicesSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects zero maxInstances", () => {
    const data = {
      services: {
        "my-svc": { kind: "web", start: "x", stop: "x", match: ["x"], maxInstances: 0 }
      }
    };
    const result = servicesSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects empty match array", () => {
    const data = {
      services: {
        "my-svc": { kind: "web", start: "x", stop: "x", match: [], maxInstances: 1 }
      }
    };
    const result = servicesSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("profilesSchema", () => {
  it("validates a profile with steps", () => {
    const data = {
      profiles: {
        focus: {
          displayName: "Focus",
          steps: ["cleanDuplicates", "doctor"]
        }
      }
    };
    const result = profilesSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("validates a profile with start/stop", () => {
    const data = {
      profiles: {
        dev: { start: ["svc1"], stop: ["svc2"] }
      }
    };
    const result = profilesSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe("portsRegistrySchema", () => {
  it("validates a port list", () => {
    const data = { ports: [{ port: 3000, project: "web", notes: "Next.js" }] };
    const result = portsRegistrySchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("defaults to empty array", () => {
    const result = portsRegistrySchema.parse({});
    expect(result.ports).toEqual([]);
  });

  it("rejects invalid port number", () => {
    const data = { ports: [{ port: -1, project: "x" }] };
    const result = portsRegistrySchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects empty project name", () => {
    const data = { ports: [{ port: 3000, project: "" }] };
    const result = portsRegistrySchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("rootDir", () => {
  it("resolves to a valid path", () => {
    expect(typeof rootDir).toBe("string");
    expect(rootDir.length).toBeGreaterThan(0);
  });
});
