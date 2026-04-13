import "dotenv/config";
import express from "express";
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
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ ok: true, version: "0.1.0", service: "orchestra-api" });
});

app.use("/auth", authRouter);
app.use("/license", licenseRouter);
app.use("/config", configRouter);
app.use("/telemetry", telemetryRouter);
app.use("/updates", updatesRouter);
app.use("/billing", billingRouter);

app.listen(PORT, () => {
  console.log(`[orchestra-api] listening on :${PORT}`);
});

export default app;
