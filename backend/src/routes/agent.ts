import { Router } from "express";
import type { TenantRequest } from "../middleware/tenant.js";
import { getStore } from "../services/store.js";
import { saveSnapshot } from "../services/persist.js";
import {
  runAllAgents,
  runAppointmentAgent,
  runComplianceAgent,
  runCustomerAgent,
  runGrantAgent,
  runInvoiceAgent,
} from "../../../agents/runners/run.js";

const router = Router();

const runners = {
  invoice: runInvoiceAgent,
  grant: runGrantAgent,
  customer: runCustomerAgent,
  compliance: runComplianceAgent,
  appointment: runAppointmentAgent,
};

router.post("/analyze", async (req, res) => {
  const { businessId } = req as TenantRequest;
  const kind = typeof req.body?.agent === "string" ? req.body.agent : "invoice";
  if (kind === "all") {
    const result = await runAllAgents(businessId);
    await saveSnapshot();
    res.json(result);
    return;
  }
  const runner = runners[kind as keyof typeof runners] ?? runInvoiceAgent;
  const result = await runner(businessId);
  await saveSnapshot();
  res.json(result);
});

router.post("/:kind/analyze", async (req, res) => {
  const { businessId } = req as TenantRequest;
  const runner = runners[req.params.kind as keyof typeof runners];
  if (!runner) return res.status(404).json({ error: "unknown agent" });
  const result = await runner(businessId);
  await saveSnapshot();
  res.json(result);
});

router.get("/activity", (req, res) => {
  const { businessId } = req as TenantRequest;
  const store = getStore();
  res.json({
    logs: store.logs.filter(
      (log) =>
        log.businessId === businessId ||
        store.runs.some((run) => run.id === log.agentRunId && run.businessId === businessId),
    ),
    runs: store.runs.filter((run) => run.businessId === businessId),
  });
});

export default router;
