import { Router } from "express";
import type { TenantRequest } from "../middleware/tenant.js";
import { getPolicy, getStore, setPolicy } from "../services/store.js";
import { daysOverdue, isEligible } from "../services/overdue.js";
import { complianceItems, enrichProfile, grantMatches } from "../services/profile.js";
import { draftBuckets, draftInTenant } from "../services/drafts.js";
import { z } from "zod";

const router = Router();

function parseFileIds(raw: unknown) {
  const text = String(raw ?? "all");
  if (!text || text === "all") return null;
  return new Set(text.split(",").filter(Boolean));
}

function inFiles(ids: Set<string> | null, sourceImportId: string | null | undefined, customIds: Set<string>) {
  if (sourceImportId && customIds.has(sourceImportId) && !ids) return false;
  if (!ids) return true;
  return Boolean(sourceImportId && ids.has(sourceImportId));
}

function parseRange(fromRaw: unknown, toRaw: unknown) {
  const from = typeof fromRaw === "string" && fromRaw ? new Date(fromRaw) : null;
  const to = typeof toRaw === "string" && toRaw ? new Date(toRaw) : null;
  if (from && Number.isNaN(from.getTime())) return { from: null, to: null };
  if (to && Number.isNaN(to.getTime())) return { from: null, to: null };
  return { from, to };
}

function inRange(iso: string | null | undefined, from: Date | null, to: Date | null) {
  if (!from && !to) return true;
  if (!iso) return false;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return false;
  if (from && time < from.getTime()) return false;
  if (to && time > to.getTime()) return false;
  return true;
}

router.get("/stats", (req, res) => {
  const { businessId } = req as TenantRequest;
  const store = getStore();
  const policy = getPolicy(businessId);
  const profile = enrichProfile(businessId);
  const ids = parseFileIds(req.query.files);
  const { from, to } = parseRange(req.query.from, req.query.to);
  const customIds = new Set(
    store.imports.filter((row) => row.businessId === businessId && row.kind === "custom").map((row) => row.id),
  );
  const invoices = store.invoices.filter(
    (invoice) =>
      invoice.businessId === businessId &&
      inFiles(ids, invoice.sourceImportId, customIds) &&
      inRange(invoice.dueDate, from, to),
  );
  const overdue = invoices.filter((invoice) => isEligible(invoice, policy).ok);
  const outstanding = invoices.filter((invoice) => invoice.status === "unpaid" || invoice.status === "disputed");
  const overdueOver30 = invoices.filter(
    (invoice) => (invoice.status === "unpaid" || invoice.status === "disputed") && daysOverdue(invoice) > 30,
  );
  const paidInFile = invoices.filter((invoice) => invoice.status === "paid");
  const customers = store.customers.filter(
    (row) =>
      row.businessId === businessId &&
      inFiles(ids, row.sourceImportId, customIds) &&
      inRange(row.lastContactAt, from, to),
  );
  const appointments = store.appointments.filter(
    (row) =>
      row.businessId === businessId &&
      inFiles(ids, row.sourceImportId, customIds) &&
      inRange(row.startsAt, from, to),
  );
  const files = store.imports.filter(
    (row) =>
      row.businessId === businessId &&
      (ids ? ids.has(row.id) : row.kind !== "custom") &&
      inRange(row.importedAt, from, to),
  );
  const grantRows = grantMatches(businessId);
  const grants = grantRows.filter((grant) => grant.match.ok);
  const complianceAll = complianceItems(businessId);
  const complianceGaps = complianceAll.filter((item) => item.applies && item.evidenceStatus === "missing").length;
  const buckets = draftBuckets(businessId);
  const tenantDrafts = store.drafts.filter((draft) => {
    if (!draftInTenant(businessId, draft.recordId, draft.agent)) return false;
    if (!inRange(draft.generatedAt, from, to)) return false;
    const invoice = store.invoices.find((row) => row.id === draft.recordId);
    const customer = store.customers.find((row) => row.id === draft.recordId);
    const appointment = store.appointments.find((row) => row.id === draft.recordId);
    return inFiles(ids, invoice?.sourceImportId ?? customer?.sourceImportId ?? appointment?.sourceImportId, customIds);
  });
  const pendingSend = tenantDrafts.filter((draft) => draft.status === "pending" && ["invoice", "customer", "appointment"].includes(draft.agent)).length;
  const pendingChecklists = tenantDrafts.filter((draft) => draft.status === "pending" && ["grant", "compliance"].includes(draft.agent)).length;
  const pendingDrafts = pendingSend + pendingChecklists;
  const invoiceFiles = files.filter((file) => file.kind === "invoices").length;
  const customerFiles = files.filter((file) => file.kind === "customers").length;
  const appointmentFiles = files.filter((file) => file.kind === "appointments").length;
  const customFiles = files.filter((file) => file.kind === "custom").length;

  function fileHint(count: number, records: number, empty: string) {
    if (!records && !count) return empty;
    if (count > 1) return `${count} files`;
    if (count === 1) return "1 file";
    return "Manual";
  }

  res.json({
    datasetReady: files.length > 0 || invoices.length > 0 || customers.length > 0 || appointments.length > 0,
    profileReady: Boolean(profile.industry),
    totals: {
      invoices: invoices.length,
      overdue: overdue.length,
      overdueAmount: overdue.reduce((sum, invoice) => sum + invoice.amountSgd, 0),
      outstandingAmount: outstanding.reduce((sum, invoice) => sum + invoice.amountSgd, 0),
      overdueOver30: overdueOver30.length,
      overdueOver30Amount: overdueOver30.reduce((sum, invoice) => sum + invoice.amountSgd, 0),
      pendingDrafts,
      paidInFileAmount: paidInFile.reduce((sum, invoice) => sum + invoice.amountSgd, 0),
      pendingApprovals: ids ? pendingSend : buckets.pendingSend,
      pendingChecklists: ids ? pendingChecklists : buckets.pendingChecklists,
      sent: buckets.sent,
      customers: customers.length,
      appointments: appointments.length,
      grantMatches: grants.length,
      complianceGaps,
      files: files.length,
      fileRows: files.reduce((sum, file) => sum + (file.rowCount ?? file.rows?.length ?? 0), 0),
      invoiceFiles,
      customerFiles,
      appointmentFiles,
      customFiles,
    },
    datasets: files
      .slice()
      .sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime())
      .map((file) => ({
        id: file.id,
        filename: file.filename,
        kind: file.kind,
        rowCount: file.rowCount ?? file.rows?.length ?? 0,
        importedAt: file.importedAt,
      })),
    agents: [
      { id: "invoice", name: "Collections", records: invoices.length, readyHint: fileHint(invoiceFiles, invoices.length, "Add invoices") },
      {
        id: "grant",
        name: "Grants",
        records: grants.length,
        readyHint: grants.length ? profile.industry || profile.name || "From Settings" : "Set industry in Settings",
      },
      { id: "customer", name: "Follow-ups", records: customers.length, readyHint: fileHint(customerFiles, customers.length, "Add customers") },
      { id: "compliance", name: "Compliance", records: complianceGaps, readyHint: "From Settings" },
      { id: "appointment", name: "Bookings", records: appointments.length, readyHint: fileHint(appointmentFiles, appointments.length, "Add bookings") },
    ],
    charts: {
      invoicesByStatus: [
        { label: "Unpaid", value: invoices.filter((row) => row.status === "unpaid").length },
        { label: "Paid", value: invoices.filter((row) => row.status === "paid").length },
        { label: "Disputed", value: invoices.filter((row) => row.status === "disputed").length },
      ],
      filesByKind: [
        { label: "Invoices", value: invoiceFiles },
        { label: "Customers", value: customerFiles },
        { label: "Bookings", value: appointmentFiles },
        { label: "Custom", value: customFiles },
      ],
      draftsByAgent: [
        { label: "Collections", value: tenantDrafts.filter((row) => row.agent === "invoice").length },
        { label: "Follow-ups", value: tenantDrafts.filter((row) => row.agent === "customer").length },
        { label: "Bookings", value: tenantDrafts.filter((row) => row.agent === "appointment").length },
        { label: "Grants", value: tenantDrafts.filter((row) => row.agent === "grant").length },
        { label: "Compliance", value: tenantDrafts.filter((row) => row.agent === "compliance").length },
      ],
      bookingsByStatus: [
        { label: "Booked", value: appointments.filter((row) => row.status === "booked").length },
        { label: "Cancelled", value: appointments.filter((row) => row.status === "cancelled").length },
        { label: "Completed", value: appointments.filter((row) => row.status === "completed").length },
      ],
      grantsFit: [
        { label: "Fit", value: grants.length },
        { label: "Not a fit", value: grantRows.length - grants.length },
      ],
      complianceEvidence: [
        { label: "Gaps", value: complianceGaps },
        { label: "Submitted", value: complianceAll.filter((item) => item.evidenceStatus === "submitted").length },
        { label: "Waived", value: complianceAll.filter((item) => item.evidenceStatus === "waived").length },
      ],
      agentLoad: [
        { label: "Collections", value: invoices.length },
        { label: "Follow-ups", value: customers.length },
        { label: "Bookings", value: appointments.length },
        { label: "Grants", value: grants.length },
        { label: "Compliance", value: complianceGaps },
      ],
    },
    recentActivity: store.logs.filter((item) => inRange(item.timestamp, from, to)).slice(0, 8),
    policy,
    profile,
  });
});

router.get("/policy", (req, res) => {
  const { businessId } = req as TenantRequest;
  res.json({ policy: getPolicy(businessId) });
});

router.post("/policy", (req, res) => {
  const { businessId } = req as TenantRequest;
  const schema = z.object({
    minimumOverdueDays: z.coerce.number().int().min(0),
    maxReminders: z.coerce.number().int().min(1),
    cooldownDays: z.coerce.number().int().min(0),
    customerFollowUpDays: z.coerce.number().int().min(1),
    appointmentReminderHours: z.coerce.number().int().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const policy = setPolicy({ businessId, ...parsed.data });
  res.json({ policy });
});

export default router;
