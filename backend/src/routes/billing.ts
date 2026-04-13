import { Router, raw } from "express";
import Stripe from "stripe";
import { supabase } from "../supabase.js";
import { verifyToken } from "./auth.js";

export const billingRouter = Router();

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

billingRouter.post("/create-checkout", async (req, res) => {
  const payload = verifyToken(req.headers.authorization as string | undefined);
  if (!payload) return res.status(401).json({ error: "Unauthorized" });

  if (!stripe) return res.status(503).json({ error: "Billing not configured" });

  const { tier } = req.body as { tier: "pro" | "team" };
  if (tier !== "pro" && tier !== "team") {
    return res.status(400).json({ error: "Invalid tier. Must be 'pro' or 'team'." });
  }

  const priceId = tier === "pro" ? process.env.STRIPE_PRICE_PRO : process.env.STRIPE_PRICE_TEAM;
  if (!priceId) {
    console.error(`[billing] missing STRIPE_PRICE_${tier.toUpperCase()} env var`);
    return res.status(503).json({ error: "Price not configured for this tier" });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL ?? "https://orchestra.dev"}/billing/success`,
      cancel_url: `${process.env.FRONTEND_URL ?? "https://orchestra.dev"}/billing/cancel`,
      client_reference_id: payload.sub,
    });

    return res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("[billing] checkout error:", err);
    return res.status(500).json({ error: "Checkout failed" });
  }
});

billingRouter.post("/webhook", raw({ type: "application/json" }), async (req, res) => {
  if (!stripe) return res.status(503).json({ error: "Billing not configured" });

  if (!webhookSecret) {
    console.error("[billing] STRIPE_WEBHOOK_SECRET not configured — rejecting webhook");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  const sig = req.headers["stripe-signature"] as string | undefined;
  if (!sig) return res.status(400).json({ error: "Missing stripe-signature header" });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature verification failed";
    console.error("[billing] webhook signature verification failed:", message);
    return res.status(400).json({ error: message });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const githubId = session.client_reference_id;
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
    if (githubId && subscriptionId) {
      const { error } = await supabase
        .from("users")
        .update({ tier: "pro", stripe_subscription_id: subscriptionId })
        .eq("github_id", githubId);
      if (error) console.error("[billing] failed to update user tier:", error.message);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const subId = subscription.id;
    if (subId) {
      const { error } = await supabase
        .from("users")
        .update({ tier: "free", stripe_subscription_id: null })
        .eq("stripe_subscription_id", subId);
      if (error) console.error("[billing] failed to downgrade user:", error.message);
    }
  }

  return res.json({ received: true });
});

billingRouter.get("/status", async (req, res) => {
  const payload = verifyToken(req.headers.authorization as string | undefined);
  if (!payload) return res.status(401).json({ error: "Unauthorized" });

  const { data: user } = await supabase
    .from("users")
    .select("tier, stripe_subscription_id")
    .eq("github_id", payload.sub)
    .single();

  return res.json({
    tier: user?.tier ?? "free",
    subscription: user?.stripe_subscription_id ?? null,
  });
});
