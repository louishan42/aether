import { Router } from "express";
import type { TenantRequest } from "../middleware/tenant.js";
import { getPolicy, getStore, setPolicy } from "../services/store.js";
import { isEligible } from "../services/overdue.js";
import { complianceItems, enrichProfile, grantMatches } from "../services/profile.js";
import { draftBuckets, draftInTenant } from "../services/drafts.js";
import { z } from "zod";

const router = Router();

router.get("/stats", (req, res) => {
  const { businessId } = req as TenantRequest;
  const store = getStore();
  const policy = getPolicy(businessId);
  const profile = enrichProfile(businessId);
  const invoices = store.invoices.filter((invoice) => invoice.businessId === businessId);
  const overdue = invoices.filter((invoice) => isEligible(invoice, policy).ok);
  const customers = store.customers.filter((row) => row.businessId === businessId);
  const appointments = store.appointments.filter((row) => row.businessId === businessId);
  const files = store.imports.filter((row) => row.businessId === businessId);
  const grantRows = grantMatches(businessId);
  const grants = grantRows.filter((grant) => grant.match.ok);
  const complianceAll = complianceItems(businessId);
  const complianceGaps = complianceAll.filter((item) => item.applies && item.evidenceStatus === "missing").length;
  const buckets = draftBuckets(businessId);
  const tenantDrafts = store.drafts.filter((draft) => draftInTenant(businessId, draft.recordId, draft.agent));
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
      pendingApprovals: buckets.pendingSend,
      pendingChecklists: buckets.pendingChecklists,
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
    recentActivity: store.logs.slice(0, 8),
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
