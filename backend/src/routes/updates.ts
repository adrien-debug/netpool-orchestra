import { Router } from "express";
import { supabase } from "../supabase.js";

export const updatesRouter = Router();

updatesRouter.get("/latest", async (_req, res) => {
  const { data } = await supabase
    .from("app_releases")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) {
    return res.json({
      version: "0.1.0",
      releaseNotes: "Version initiale",
      downloadUrl: null,
      mandatory: false,
    });
  }

  return res.json({
    version: data.version,
    releaseNotes: data.release_notes,
    downloadUrl: data.download_url,
    mandatory: data.mandatory ?? false,
  });
});
