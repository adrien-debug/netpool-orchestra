import { Router } from "express";
import { supabase } from "../supabase.js";
import { verifyToken } from "./auth.js";

export const configRouter = Router();

configRouter.post("/sync", async (req, res) => {
  const payload = verifyToken(req.headers.authorization as string | undefined);
  if (!payload) return res.status(401).json({ error: "Unauthorized" });

  const body = req.body as { services?: string; profiles?: string; ports?: string };

  const { error } = await supabase.from("config_sync").upsert(
    { user_id: payload.sub, config_data: JSON.stringify(body) },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("[config-sync] upsert error:", error.message);
    return res.status(500).json({ error: "Sync failed" });
  }

  return res.json({ ok: true, message: "Config synced" });
});

configRouter.get("/sync", async (req, res) => {
  const payload = verifyToken(req.headers.authorization as string | undefined);
  if (!payload) return res.status(401).json({ error: "Unauthorized" });

  const { data } = await supabase
    .from("config_sync")
    .select("config_data")
    .eq("user_id", payload.sub)
    .single();

  if (!data) return res.json({ services: null, profiles: null, ports: null });
  return res.json(JSON.parse(data.config_data));
});
