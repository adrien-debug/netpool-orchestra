import { Router } from "express";
import jwt from "jsonwebtoken";
import { supabase } from "../supabase.js";

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET!;
const GH_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GH_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

authRouter.post("/github", async (req, res) => {
  if (!GH_CLIENT_ID || !GH_CLIENT_SECRET) {
    return res.status(503).json({ error: "GitHub OAuth not configured" });
  }

  const { code } = req.body as { code?: string };
  if (!code) return res.status(400).json({ error: "Missing code" });

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_id: GH_CLIENT_ID, client_secret: GH_CLIENT_SECRET, code }),
    });

    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenData.access_token) {
      return res.status(401).json({ error: tokenData.error ?? "GitHub auth failed" });
    }

    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, "User-Agent": "Orchestra" },
    });
    const ghUser = (await userRes.json()) as {
      id: number; login: string; email: string | null; avatar_url: string;
    };

    const { data: existing } = await supabase
      .from("users")
      .select("*")
      .eq("github_id", ghUser.id)
      .single();

    if (!existing) {
      await supabase.from("users").insert({
        github_id: ghUser.id,
        login: ghUser.login,
        email: ghUser.email ?? "",
        avatar_url: ghUser.avatar_url,
        tier: "free",
      });
    }

    const token = jwt.sign({ sub: String(ghUser.id), login: ghUser.login }, JWT_SECRET, {
      expiresIn: "30d",
    });

    return res.json({
      token,
      user: { id: ghUser.id, login: ghUser.login, email: ghUser.email, avatar_url: ghUser.avatar_url },
    });
  } catch (err) {
    console.error("[auth] github error:", err);
    return res.status(500).json({ error: "Auth failed" });
  }
});

authRouter.get("/me", async (req, res) => {
  const payload = verifyToken(req.headers.authorization);
  if (!payload) return res.status(401).json({ error: "Unauthorized" });

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("github_id", payload.sub)
    .single();

  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({ user });
});

export function verifyToken(authHeader?: string): { sub: string; login: string } | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(authHeader.slice(7), JWT_SECRET) as { sub: string; login: string };
  } catch {
    return null;
  }
}
