import cors from "cors";
import express from "express";
import { tenantContext } from "./middleware/tenant.js";
import invoiceRoutes from "./routes/invoices.js";
import reminderRoutes from "./routes/reminders.js";
import agentRoutes from "./routes/agent.js";
import dashboardRoutes from "./routes/dashboard.js";
import workspaceRoutes from "./routes/workspace.js";
import chatRoutes from "./routes/chat.js";
import { syncDeskFromDatasets } from "./services/ingest.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const origins = (process.env.FRONTEND_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      const allowed =
        origins.includes(origin) ||
        origin === "https://aether-eight-ecru.vercel.app" ||
        /^https:\/\/aether[a-z0-9-]*\.vercel\.app$/i.test(origin) ||
        origin.startsWith("http://localhost:");
      if (allowed) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-business-id", "x-user-id"],
    maxAge: 86400,
  }),
);
app.use(express.json({ limit: "32mb" }));
app.use((err: { status?: number; type?: string }, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.status === 413 || err.type === "entity.too.large") {
    res.status(413).json({ error: "This file is too large for one upload. Use a CSV under 25 MB, or split it." });
    return;
  }
  next(err);
});
app.use(tenantContext);
app.use((req, _res, next) => {
  if (!req.path.startsWith("/api")) {
    next();
    return;
  }
  const changed = syncDeskFromDatasets();
  if (!changed) {
    next();
    return;
  }
  import("./services/persist.js")
    .then(({ saveSnapshot }) => saveSnapshot())
    .catch(() => undefined)
    .finally(() => next());
});

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    name: "Aether",
    health: "/api/health",
    hint: "This is the API. Open the Vercel site for the dashboard.",
  });
});

app.get("/api/health", async (_req, res) => {
  const { databaseReady } = await import("./services/db.js");
  res.json({
    ok: true,
    service: "aether",
    dataset: databaseReady ? "supabase" : "memory",
    groq: Boolean(process.env.GROQ_API_KEY?.trim()),
  });
});

app.use("/api/invoices", invoiceRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/workspace", workspaceRoutes);
app.use("/api/chat", chatRoutes);

async function start() {
  const { loadSnapshot, stripLegacyAutoSeed } = await import("./services/persist.js");
  await loadSnapshot();
  await stripLegacyAutoSeed();
  app.listen(port, () => {
    console.log(`Aether API listening on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
