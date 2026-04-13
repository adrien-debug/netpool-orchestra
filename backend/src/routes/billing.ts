import { Router } from "express";
import Stripe from "stripe";
import { supabase } from "../supabase.js";
import { verifyToken } from "./auth.js";

export const billingRouter = Router();

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

billingRouter.post("/create-checkout", async (req, res) => {
  const payload = verifyToken(req.headers.authorization as string | undefined);
  if (!payload) return res.status(401).json({ error: "Unauthorized" });

  if (!stripe) return res.status(503).json({ error: "Billing not configured" });

  const { tier } = req.body as { tier: "pro" | "team" };
  const priceId = tier === "pro" ? process.env.STRIPE_PRICE_PRO! : process.env.STRIPE_PRICE_TEAM!;

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

billingRouter.post("/webhook", async (req, res) => {
  const body = req.body as {
    type: string;
    data: {
      object: { client_reference_id?: string; subscription?: string; customer?: string };
    };
  };

  if (body.type === "checkout.session.completed") {
    const githubId = body.data.object.client_reference_id;
    const subscriptionId = body.data.object.subscription;
    if (githubId && subscriptionId) {
      await supabase
        .from("users")
        .update({ tier: "pro", stripe_subscription_id: subscriptionId })
        .eq("github_id", githubId);
    }
  }

  if (body.type === "customer.subscription.deleted") {
    const subId = body.data.object.subscription ?? body.data.object.customer;
    if (subId) {
      await supabase
        .from("users")
        .update({ tier: "free", stripe_subscription_id: null })
        .eq("stripe_subscription_id", subId);
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
