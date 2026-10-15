import { Router } from "express";
import type { TenantRequest } from "../middleware/tenant.js";
import { addLog, getStore } from "../services/store.js";
import { logDraftApproved } from "../services/actions.js";
import { saveSnapshot } from "../services/persist.js";
import { createTools } from "../../../agents/tools/index.js";
import { runInvoiceAgent } from "../../../agents/runners/run.js";
import { draftBelongsToTenant, openDrafts } from "../services/drafts.js";

const router = Router();

router.post("/generate", async (req, res) => {
  const { businessId } = req as TenantRequest;
  const result = await runInvoiceAgent(businessId);
  res.json(result);
});

router.get("/pending", (req, res) => {
  const { businessId } = req as TenantRequest;
  res.json({ drafts: openDrafts(businessId) });
});

router.post("/:id/approve", async (req, res) => {
  const { businessId, actorId } = req as TenantRequest;
  const store = getStore();
  const draft = store.drafts.find((row) => row.id === req.params.id);
  if (!draft) return res.status(404).json({ error: "draft not found" });
  if (!draftBelongsToTenant(businessId, draft)) return res.status(403).json({ error: "not in tenant" });
  const decision = req.body?.decision === "rejected" ? "rejected" : "approved";
  draft.status = decision;
  if (decision === "approved") {
    logDraftApproved({
      businessId,
      userId: actorId,
      agent: draft.agent,
      recordId: draft.recordId,
      draftId: draft.id,
      status: "approved",
    });
  } else {
    addLog({
      agent: draft.agent,
      agentRunId: null,
      invoiceId: draft.recordId,
      action: "reject_draft",
      eventType: "DRAFT_REJECTED",
      userId: actorId,
      businessId,
      status: "rejected",
      result: `${actorId} rejected ${draft.id}`,
    });
  }
  await saveSnapshot();
  res.json({ draft });
});

router.post("/:id/send", async (req, res) => {
  const { businessId } = req as TenantRequest;
  try {
    const tools = createTools(businessId);
    const draftCheck = getStore().drafts.find((row) => row.id === req.params.id);
    if (!draftCheck) return res.status(404).json({ error: "draft not found" });
    if (!draftBelongsToTenant(businessId, draftCheck)) return res.status(403).json({ error: "not in tenant" });
    const result = await tools.execute_approved_draft(req.params.id);
    const draft = getStore().drafts.find((d) => d.id === req.params.id);
    addLog({
      agent: draft?.agent ?? "system",
      agentRunId: null,
      invoiceId: draft?.recordId ?? null,
      action: "execute_approved_draft",
      result: result.detail,
    });
    await saveSnapshot();
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "send failed" });
  }
});

export default router;
