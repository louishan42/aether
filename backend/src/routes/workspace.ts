import { Router } from "express";
import { z } from "zod";
import type { TenantRequest } from "../middleware/tenant.js";
import { addLog, getProfile, getStore, setProfile } from "../services/store.js";
import { saveSnapshot } from "../services/persist.js";
import { deleteImportedDataset, deskCounts, ingestCsv } from "../services/ingest.js";
import { runAgentsForKind } from "../../../agents/runners/run.js";
import { complianceItems, grantMatches, profileReady as isProfileReady } from "../services/profile.js";
import type { Appointment, FollowUpCustomer } from "../types.js";

const router = Router();

router.get("/records", (req, res) => {
  const { businessId } = req as TenantRequest;
  const store = getStore();
  res.json({
    invoices: store.invoices.filter((row) => row.businessId === businessId),
    customers: store.customers.filter((row) => row.businessId === businessId),
    appointments: store.appointments.filter((row) => row.businessId === businessId),
    files: store.imports.filter((row) => row.businessId === businessId),
    datasets: store.imports.filter((row) => row.businessId === businessId),
  });
});

router.delete("/datasets/:id", async (req, res) => {
  const { businessId } = req as TenantRequest;
  try {
    const result = deleteImportedDataset(businessId, req.params.id);
    addLog({
      agent: "system",
      agentRunId: null,
      invoiceId: null,
      action: "delete_dataset",
      result: `${result.filename} (${result.kind}) invoices=${result.removed.invoices}; customers=${result.removed.customers}; bookings=${result.removed.appointments}`,
    });
    await saveSnapshot();
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : "Delete failed" });
  }
});

router.post("/datasets/import", async (req, res) => {
  const { businessId } = req as TenantRequest;
  const csv = typeof req.body?.csv === "string" ? req.body.csv : "";
  const filename = typeof req.body?.filename === "string" && req.body.filename.trim() ? req.body.filename.trim() : "upload.csv";
  const kind = typeof req.body?.kind === "string" ? req.body.kind : undefined;
  if (!csv.trim()) return res.status(400).json({ error: "Paste or drop a CSV file." });
  try {
    const result = ingestCsv(
      businessId,
      csv,
      filename,
      kind === "invoices" || kind === "customers" || kind === "appointments" || kind === "custom" ? kind : undefined,
    );
    if (result.agentReady) await runAgentsForKind(businessId, result.kind);
    await saveSnapshot();
    res.json({
      ...result,
      refreshed: deskCounts(businessId),
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Import failed" });
  }
});

router.get("/profile", (req, res) => {
  const { businessId } = req as TenantRequest;
  res.json({ profile: getProfile(businessId) });
});

router.post("/profile", async (req, res) => {
  const { businessId } = req as TenantRequest;
  const schema = z.object({
    name: z.string().min(1),
    industry: z.string(),
    employeeCount: z.coerce.number().int().min(0),
    annualRevenueSgd: z.coerce.number().min(0),
    isExporting: z.boolean(),
    usesDigitalTools: z.boolean(),
    hasGstRegistration: z.boolean(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const profile = setProfile({ businessId, ...parsed.data });
  await saveSnapshot();
  res.json({ profile });
});

router.get("/grants", (req, res) => {
  const { businessId } = req as TenantRequest;
  const grants = grantMatches(businessId);
  res.json({ grants, profileReady: isProfileReady(getProfile(businessId)) });
});

router.get("/customers", (req, res) => {
  const { businessId } = req as TenantRequest;
  res.json({ customers: getStore().customers.filter((row) => row.businessId === businessId) });
});

router.post("/customers", async (req, res) => {
  const { businessId } = req as TenantRequest;
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    lastContactAt: z.string().optional().nullable(),
    notes: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const customer: FollowUpCustomer = {
    id: crypto.randomUUID(),
    businessId,
    name: parsed.data.name,
    email: parsed.data.email,
    lastContactAt: parsed.data.lastContactAt ? new Date(parsed.data.lastContactAt).toISOString() : null,
    notes: parsed.data.notes ?? "",
    followUpCount: 0,
    sourceImportId: "manual",
  };
  getStore().customers.unshift(customer);
  addLog({ agent: "customer", agentRunId: null, invoiceId: customer.id, action: "create_customer", result: customer.email });
  await saveSnapshot();
  res.json({ customer });
});

router.post("/customers/import", async (req, res) => {
  const { businessId } = req as TenantRequest;
  const csv = typeof req.body?.csv === "string" ? req.body.csv : "";
  const filename = typeof req.body?.filename === "string" && req.body.filename.trim() ? req.body.filename.trim() : "customers.csv";
  if (!csv.trim()) return res.status(400).json({ error: "No CSV provided." });
  const result = ingestCsv(businessId, csv, filename, "customers");
  await saveSnapshot();
  res.json({ imported: result.mapped, errors: [], customers: getStore().customers.filter((row) => row.businessId === businessId).slice(0, result.mapped) });
});

router.get("/compliance", (req, res) => {
  const { businessId } = req as TenantRequest;
  res.json({ requirements: complianceItems(businessId) });
});

router.post("/compliance/:id/evidence", async (req, res) => {
  const { businessId } = req as TenantRequest;
  const schema = z.object({
    status: z.enum(["missing", "submitted", "waived"]),
    note: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const store = getStore();
  let evidence = store.evidence.find((row) => row.businessId === businessId && row.requirementId === req.params.id);
  if (!evidence) {
    evidence = {
      id: crypto.randomUUID(),
      businessId,
      requirementId: req.params.id,
      status: parsed.data.status,
      note: parsed.data.note ?? "",
    };
    store.evidence.unshift(evidence);
  } else {
    evidence.status = parsed.data.status;
    evidence.note = parsed.data.note ?? evidence.note;
  }
  if (evidence.status === "submitted" || evidence.status === "waived") {
    store.drafts = store.drafts.filter(
      (draft) => !(draft.agent === "compliance" && draft.recordId === req.params.id && draft.status === "pending"),
    );
  }
  addLog({ agent: "compliance", agentRunId: null, invoiceId: req.params.id, action: "update_evidence", result: evidence.status });
  await saveSnapshot();
  res.json({ evidence });
});

router.get("/appointments", (req, res) => {
  const { businessId } = req as TenantRequest;
  res.json({ appointments: getStore().appointments.filter((row) => row.businessId === businessId) });
});

router.post("/appointments", async (req, res) => {
  const { businessId } = req as TenantRequest;
  const schema = z.object({
    customerName: z.string().min(1),
    customerEmail: z.string().email(),
    startsAt: z.string().min(8),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const appointment: Appointment = {
    id: crypto.randomUUID(),
    businessId,
    customerName: parsed.data.customerName,
    customerEmail: parsed.data.customerEmail,
    startsAt: new Date(parsed.data.startsAt).toISOString(),
    status: "booked",
    reminderCount: 0,
    sourceImportId: "manual",
  };
  getStore().appointments.unshift(appointment);
  addLog({ agent: "appointment", agentRunId: null, invoiceId: appointment.id, action: "create_booking", result: appointment.customerEmail });
  await saveSnapshot();
  res.json({ appointment });
});

router.post("/appointments/:id/cancel", (req, res) => {
  const { businessId } = req as TenantRequest;
  const appointment = getStore().appointments.find((row) => row.id === req.params.id && row.businessId === businessId);
  if (!appointment) return res.status(404).json({ error: "booking not found" });
  appointment.status = "cancelled";
  addLog({ agent: "appointment", agentRunId: null, invoiceId: appointment.id, action: "cancel_booking", result: appointment.id });
  res.json({ appointment });
});

router.post("/appointments/import", async (req, res) => {
  const { businessId } = req as TenantRequest;
  const csv = typeof req.body?.csv === "string" ? req.body.csv : "";
  const filename = typeof req.body?.filename === "string" && req.body.filename.trim() ? req.body.filename.trim() : "appointments.csv";
  if (!csv.trim()) return res.status(400).json({ error: "No CSV provided." });
  const result = ingestCsv(businessId, csv, filename, "appointments");
  await saveSnapshot();
  res.json({
    imported: result.mapped,
    errors: [],
    appointments: getStore().appointments.filter((row) => row.businessId === businessId).slice(0, result.mapped),
  });
});

export default router;
