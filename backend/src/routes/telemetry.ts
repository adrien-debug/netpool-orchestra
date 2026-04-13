import { Router } from "express";
import { supabase } from "../supabase.js";

export const telemetryRouter = Router();

telemetryRouter.post("/", async (req, res) => {
  const body = req.body as {
    appVersion: string;
    platform: string;
    arch: string;
    serviceCount: number;
    agentCount: number;
    aiProvider: string | null;
  };

  const { error } = await supabase.from("telemetry").insert({
    app_version: body.appVersion,
    platform: body.platform,
    arch: body.arch,
    service_count: body.serviceCount,
    agent_count: body.agentCount,
    ai_provider: body.aiProvider ?? "none",
  });

  if (error) {
    console.error("[telemetry] insert error:", error.message);
    return res.status(500).json({ error: "Telemetry failed" });
  }

  return res.json({ ok: true });
});
