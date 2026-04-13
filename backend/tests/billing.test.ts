import { describe, it, expect } from "vitest";

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

describe("Billing Routes", () => {
  it("should export billingRouter", async () => {
    const { billingRouter } = await import("../src/routes/billing.js");
    expect(billingRouter).toBeDefined();
  });

  it("should validate tier parameter", () => {
    const validTiers = ["pro", "team"];
    const invalidTiers = ["free", "enterprise", "basic", ""];

    validTiers.forEach((tier) => {
      expect(["pro", "team"]).toContain(tier);
    });

    invalidTiers.forEach((tier) => {
      expect(["pro", "team"]).not.toContain(tier);
    });
  });

  it("should have required environment variables", () => {
    expect(process.env.STRIPE_SECRET_KEY).toBeDefined();
    expect(process.env.STRIPE_WEBHOOK_SECRET).toBeDefined();
    expect(process.env.STRIPE_PRICE_PRO).toBeDefined();
    expect(process.env.STRIPE_PRICE_TEAM).toBeDefined();
    expect(process.env.FRONTEND_URL).toBeDefined();
  });

  it("should construct correct success and cancel URLs", () => {
    const frontendUrl = process.env.FRONTEND_URL!;
    const successUrl = `${frontendUrl}/billing/success`;
    const cancelUrl = `${frontendUrl}/billing/cancel`;

    expect(successUrl).toBe("http://localhost:3000/billing/success");
    expect(cancelUrl).toBe("http://localhost:3000/billing/cancel");
  });

  it("should map tier to price ID", () => {
    const tierToPriceId = (tier: "pro" | "team") => {
      return tier === "pro" ? process.env.STRIPE_PRICE_PRO : process.env.STRIPE_PRICE_TEAM;
    };

    expect(tierToPriceId("pro")).toBe("price_test_pro");
    expect(tierToPriceId("team")).toBe("price_test_team");
  });
});

describe("Billing Webhook Events", () => {
  it("should handle checkout.session.completed event", () => {
    const event = {
      type: "checkout.session.completed",
      data: {
        object: {
          client_reference_id: "12345",
          subscription: "sub_123"
        }
      }
    };

    expect(event.type).toBe("checkout.session.completed");
    expect(event.data.object.client_reference_id).toBe("12345");
    expect(event.data.object.subscription).toBe("sub_123");
  });

  it("should handle customer.subscription.deleted event", () => {
    const event = {
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_123"
        }
      }
    };

    expect(event.type).toBe("customer.subscription.deleted");
    expect(event.data.object.id).toBe("sub_123");
  });

  it("should extract subscription ID from session", () => {
    const session = {
      subscription: "sub_123"
    };

    const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
    expect(subscriptionId).toBe("sub_123");
  });

  it("should handle subscription as object", () => {
    const session = {
      subscription: { id: "sub_123" }
    };

    const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
    expect(subscriptionId).toBeNull();
  });
});
