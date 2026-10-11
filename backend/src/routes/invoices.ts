import { Router } from "express";
import { z } from "zod";
import type { TenantRequest } from "../middleware/tenant.js";
import { getPolicy, getStore } from "../services/store.js";
import { saveSnapshot } from "../services/persist.js";
import { isEligible } from "../services/overdue.js";
import { ingestCsv } from "../services/ingest.js";
import type { Invoice, InvoiceStatus } from "../types.js";

const router = Router();

router.post("/", async (req, res) => {
  const { businessId } = req as TenantRequest;
  const schema = z.object({
    invoiceNumber: z.string().min(1),
    customerName: z.string().min(1),
    customerEmail: z.string().email(),
    amountSgd: z.coerce.number().positive(),
    dueDate: z.string().min(8),
    status: z.enum(["unpaid", "paid", "disputed"]).default("unpaid"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;
  const invoice: Invoice = {
    id: crypto.randomUUID(),
    businessId,
    customerId: crypto.randomUUID(),
    invoiceNumber: data.invoiceNumber,
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    amountSgd: data.amountSgd,
    dueDate: new Date(data.dueDate).toISOString(),
    status: data.status as InvoiceStatus,
    reminderCount: 0,
    lastReminderAt: null,
    sourceImportId: "manual",
  };
  getStore().invoices.unshift(invoice);
  await saveSnapshot();
  res.json({ invoice });
});

router.post("/import", async (req, res) => {
  const { businessId } = req as TenantRequest;
  const csv = typeof req.body?.csv === "string" ? req.body.csv : "";
  const filename = typeof req.body?.filename === "string" && req.body.filename.trim() ? req.body.filename.trim() : "invoices.csv";
  if (!csv.trim()) {
    return res.status(400).json({ error: "No CSV provided. Dataset work is deferred; paste CSV later." });
  }
  const result = ingestCsv(businessId, csv, filename, "invoices");
  await saveSnapshot();
  return res.json({
    imported: result.mapped,
    errors: [],
    invoices: getStore().invoices.filter((row) => row.businessId === businessId).slice(0, result.mapped),
  });
});

router.get("/", (req, res) => {
  const { businessId } = req as TenantRequest;
  const invoices = getStore().invoices.filter((invoice) => invoice.businessId === businessId);
  res.json({ invoices });
});

router.get("/overdue", (req, res) => {
  const { businessId } = req as TenantRequest;
  const policy = getPolicy(businessId);
  const invoices = getStore()
    .invoices.filter((invoice) => invoice.businessId === businessId)
    .map((invoice) => ({ invoice, eligibility: isEligible(invoice, policy) }))
    .filter((row) => row.eligibility.ok)
    .map((row) => ({ ...row.invoice, reason: row.eligibility.reason }));
  res.json({ invoices });
});

export default router;
