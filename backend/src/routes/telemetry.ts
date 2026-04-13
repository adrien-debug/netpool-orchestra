import { Router } from "express";
import { supabase } from "../supabase.js";

export const telemetryRouter = Router();

telemetryRouter.post("/", async (req, res) => {
  const body = req.body as Record<string, unknown> | undefined;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Missing body" });
  }

  const appVersion = typeof body.appVersion === "string" ? body.appVersion : null;
  const platform = typeof body.platform === "string" ? body.platform : null;
  const arch = typeof body.arch === "string" ? body.arch : null;

  if (!appVersion || !platform || !arch) {
    return res.status(400).json({ error: "Missing required fields: appVersion, platform, arch" });
  }

  const serviceCount = typeof body.serviceCount === "number" ? body.serviceCount : 0;
  const agentCount = typeof body.agentCount === "number" ? body.agentCount : 0;
  const aiProvider = typeof body.aiProvider === "string" ? body.aiProvider : "none";

  const { error } = await supabase.from("telemetry").insert({
    app_version: appVersion,
    platform,
    arch,
    service_count: serviceCount,
    agent_count: agentCount,
    ai_provider: aiProvider,
  });

  if (error) {
    console.error("[telemetry] insert error:", error.message);
    return res.status(500).json({ error: "Telemetry failed" });
  }

  return res.json({ ok: true });
});
