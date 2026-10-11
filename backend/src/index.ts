import cors from "cors";
import express from "express";
import { tenantContext } from "./middleware/tenant.js";
import invoiceRoutes from "./routes/invoices.js";
import reminderRoutes from "./routes/reminders.js";
import agentRoutes from "./routes/agent.js";
import dashboardRoutes from "./routes/dashboard.js";
import workspaceRoutes from "./routes/workspace.js";
import chatRoutes from "./routes/chat.js";

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
      if (origins.includes(origin) || origin.endsWith(".vercel.app") || origin.startsWith("http://localhost:")) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed"));
    },
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(tenantContext);

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    name: "Aether",
    health: "/api/health",
    hint: "This is the API. Open the Vercel site for the dashboard.",
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "aether", dataset: "supabase" });
});

app.use("/api/invoices", invoiceRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/workspace", workspaceRoutes);
app.use("/api/chat", chatRoutes);

async function start() {
  const { loadSnapshot, seedFromCsvIfEmpty } = await import("./services/persist.js");
  await loadSnapshot();
  await seedFromCsvIfEmpty();
  app.listen(port, () => {
    console.log(`Aether API listening on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
