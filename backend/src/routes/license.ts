import { Router } from "express";
import { supabase } from "../supabase.js";
import { verifyToken } from "./auth.js";

export const licenseRouter = Router();

licenseRouter.get("/validate", async (req, res) => {
  const payload = verifyToken(req.headers.authorization as string | undefined);
  if (!payload) {
    return res.json({ valid: false, tier: "free", reason: "Not authenticated" });
  }

  const { data: user } = await supabase
    .from("users")
    .select("tier, stripe_subscription_id")
    .eq("github_id", payload.sub)
    .single();

  if (!user) {
    return res.json({ valid: false, tier: "free", reason: "User not found" });
  }

  return res.json({
    valid: true,
    tier: user.tier,
    features: {
      agents: user.tier !== "free",
      chat: user.tier !== "free",
      configSync: user.tier !== "free",
      teamDashboard: user.tier === "team",
      metricsHistory30d: user.tier !== "free",
    },
  });
});
