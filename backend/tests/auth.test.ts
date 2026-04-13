import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Express } from "express";
import jwt from "jsonwebtoken";

// Mock environment variables
process.env.JWT_SECRET = "test-secret-key-for-testing";
process.env.GITHUB_CLIENT_ID = "test-client-id";
process.env.GITHUB_CLIENT_SECRET = "test-client-secret";
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_KEY = "test-service-key";
process.env.STRIPE_SECRET_KEY = "sk_test_123";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_123";
process.env.STRIPE_PRICE_PRO = "price_test_pro";
process.env.STRIPE_PRICE_TEAM = "price_test_team";
process.env.FRONTEND_URL = "http://localhost:3000";

describe("Auth Routes", () => {
  it("should export verifyToken function", async () => {
    const { verifyToken } = await import("../src/routes/auth.js");
    expect(verifyToken).toBeDefined();
    expect(typeof verifyToken).toBe("function");
  });

  it("should verify valid JWT token", async () => {
    const { verifyToken } = await import("../src/routes/auth.js");
    
    const payload = { sub: "12345", login: "testuser" };
    const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "7d" });
    
    const verified = verifyToken(`Bearer ${token}`);
    expect(verified).toBeDefined();
    expect(verified?.sub).toBe("12345");
    expect(verified?.login).toBe("testuser");
  });

  it("should reject invalid JWT token", async () => {
    const { verifyToken } = await import("../src/routes/auth.js");
    
    const verified = verifyToken("Bearer invalid-token");
    expect(verified).toBeNull();
  });

  it("should reject missing Bearer prefix", async () => {
    const { verifyToken } = await import("../src/routes/auth.js");
    
    const payload = { sub: "12345", login: "testuser" };
    const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "7d" });
    
    const verified = verifyToken(token);
    expect(verified).toBeNull();
  });

  it("should reject expired token", async () => {
    const { verifyToken } = await import("../src/routes/auth.js");
    
    const payload = { sub: "12345", login: "testuser" };
    const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "-1s" });
    
    const verified = verifyToken(`Bearer ${token}`);
    expect(verified).toBeNull();
  });

  it("should reject token with wrong secret", async () => {
    const { verifyToken } = await import("../src/routes/auth.js");
    
    const payload = { sub: "12345", login: "testuser" };
    const token = jwt.sign(payload, "wrong-secret", { expiresIn: "7d" });
    
    const verified = verifyToken(`Bearer ${token}`);
    expect(verified).toBeNull();
  });

  it("should handle undefined authorization header", async () => {
    const { verifyToken } = await import("../src/routes/auth.js");
    
    const verified = verifyToken(undefined);
    expect(verified).toBeNull();
  });

  it("should handle empty authorization header", async () => {
    const { verifyToken } = await import("../src/routes/auth.js");
    
    const verified = verifyToken("");
    expect(verified).toBeNull();
  });
});
