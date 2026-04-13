import "dotenv/config";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { licenseRouter } from "./routes/license.js";
import { configRouter } from "./routes/config-sync.js";
import { telemetryRouter } from "./routes/telemetry.js";
import { updatesRouter } from "./routes/updates.js";
import { billingRouter } from "./routes/billing.js";

const app = express();
const PORT = parseInt(process.env.PORT || "4000", 10);

app.use(cors());

// Rate limiter — simple in-memory sliding window (no external dep)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.ip ?? "unknown";
  const now = Date.now();
  const timestamps = (rateLimitMap.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT_MAX) {
    res.status(429).json({ error: "Too many requests" });
    return;
  }
  timestamps.push(now);
  rateLimitMap.set(key, timestamps);
  next();
}

// Periodic cleanup to prevent memory leak
setInterval(() => {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
  for (const [key, timestamps] of rateLimitMap) {
    const filtered = timestamps.filter((t) => t > cutoff);
    if (filtered.length === 0) rateLimitMap.delete(key);
    else rateLimitMap.set(key, filtered);
  }
}, RATE_LIMIT_WINDOW_MS);

app.use(rateLimit);

// JSON body parsing for all routes except /billing/webhook (needs raw body for Stripe sig)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path === "/billing/webhook") return next();
  express.json()(req, res, next);
});

app.get("/", (_req, res) => {
  res.json({ ok: true, version: "0.1.0", service: "orchestra-api" });
});

app.use("/auth", authRouter);
app.use("/license", licenseRouter);
app.use("/config", configRouter);
app.use("/telemetry", telemetryRouter);
app.use("/updates", updatesRouter);
app.use("/billing", billingRouter);

// Centralized error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[orchestra-api] unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`[orchestra-api] listening on :${PORT}`);
});

export default app;
