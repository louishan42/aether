import { createHash } from "node:crypto";
import { parseCsv } from "./csv.js";
import { getStore, recordImport } from "./store.js";
import type { Appointment, DatasetImport, FollowUpCustomer, Invoice } from "../types.js";

function stableId(seed: string) {
  const hex = createHash("sha1").update(seed).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-9${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export type DetectedKind = DatasetImport["kind"];

function norm(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function pick(row: Record<string, string>, aliases: string[]) {
  const entries = Object.entries(row).map(([key, value]) => [norm(key), value] as const);
  const names = aliases.map(norm);
  for (const alias of names) {
    const exact = entries.find(([key, value]) => key === alias && value);
    if (exact) return exact[1];
  }
  for (const alias of names) {
    if (alias.length < 4) continue;
    const hit = entries.find(([key, value]) => value && (key.endsWith(`_${alias}`) || key.includes(alias)));
    if (hit) return hit[1];
  }
  return "";
}

function looksLikeEmail(value: string) {
  return /.+@.+\..+/.test(value);
}

function pickEmail(row: Record<string, string>) {
  const direct = pick(row, ["customer_email", "email", "e_mail", "mail", "contact_email", "customer_email_address"]);
  if (looksLikeEmail(direct)) return direct;
  return Object.values(row).find((value) => looksLikeEmail(value)) ?? "";
}

function pickName(row: Record<string, string>) {
  const direct = pick(row, [
    "employee_name",
    "staff_name",
    "customer_name",
    "client_name",
    "company_name",
    "contact_name",
    "full_name",
    "display_name",
    "customer",
    "client",
    "company",
    "employee",
    "name",
  ]);
  if (direct && !looksLikeEmail(direct)) return direct;
  const fallback = Object.entries(row).find(
    ([key, value]) => value && !looksLikeEmail(value) && /name|customer|client|company|contact|employee|staff/i.test(key),
  );
  return fallback?.[1] ?? "";
}

function synthEmail(row: Record<string, string>, name: string, index: number) {
  const real = pickEmail(row);
  if (real) return real;
  const id = pick(row, ["employee_id", "staff_id", "customer_id", "id"]) || name || `row${index + 1}`;
  return `${norm(id).replace(/_+/g, ".")}@imported.local`;
}

function parseAmount(value: string) {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : NaN;
}

function parseWhen(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function looksLikePayroll(filename: string, rows: Record<string, string>[]) {
  const name = filename.toLowerCase();
  const headers = Object.keys(rows[0] ?? {}).map(norm).join(" ");
  if (/payroll|gusto|salary|payslip/.test(name)) return true;
  if (/employee_id/.test(headers) && /pay_date|gross|role/.test(headers) && !/invoice/.test(headers)) return true;
  return false;
}

function mappingRate(kind: DetectedKind, rows: Record<string, string>[]) {
  if (kind === "custom" || !rows.length) return 0;
  let hits = 0;
  for (let i = 0; i < rows.length; i += 1) {
    if (kind === "invoices" && asInvoice("score", rows[i], i)) hits += 1;
    if (kind === "customers" && asCustomer("score", rows[i], i)) hits += 1;
    if (kind === "appointments" && asAppointment("score", rows[i], i)) hits += 1;
  }
  return hits / rows.length;
}

export function detectKind(rows: Record<string, string>[], filename = "", preferred?: DetectedKind): DetectedKind {
  if (looksLikePayroll(filename, rows)) return "custom";
  const kinds: DetectedKind[] = ["invoices", "customers", "appointments"];
  const ranked = kinds
    .map((kind) => ({ kind, score: mappingRate(kind, rows) }))
    .sort((a, b) => b.score - a.score);
  if (preferred && preferred !== "custom" && mappingRate(preferred, rows) >= 0.4) return preferred;
  if (ranked[0].score >= 0.4) return ranked[0].kind;
  return "custom";
}

export function asInvoice(businessId: string, row: Record<string, string>, index = 0): Invoice | null {
  const invoiceNumber = pick(row, ["invoice_number", "invoice_no", "invoice", "inv_no"]);
  const customerName = pickName(row);
  const customerEmail = pickEmail(row);
  const amountSgd = parseAmount(pick(row, ["amount_sgd", "amount", "total", "value", "price", "balance", "grand_total"]));
  const dueDate = parseWhen(pick(row, ["due_date", "due", "invoice_date"]));
  if (!invoiceNumber || !customerName || !looksLikeEmail(customerEmail) || !dueDate || !(amountSgd > 0)) return null;
  const statusRaw = pick(row, ["status", "state"]).toLowerCase();
  const status = statusRaw === "paid" || statusRaw === "disputed" ? statusRaw : "unpaid";
  return {
    id: stableId(`inv:${businessId}:${invoiceNumber}:${customerEmail}`),
    businessId,
    customerId: stableId(`custid:${businessId}:${customerEmail}`),
    invoiceNumber,
    customerName,
    customerEmail,
    amountSgd,
    dueDate,
    status,
    reminderCount: 0,
    lastReminderAt: null,
    sourceImportId: null,
  };
}

export function asCustomer(businessId: string, row: Record<string, string>, index = 0): FollowUpCustomer | null {
  const name = pickName(row);
  const email = pickEmail(row);
  if (!name || !looksLikeEmail(email)) return null;
  const last = pick(row, ["last_contact_at", "last_contact", "last_seen", "updated_at", "contacted_at"]);
  return {
    id: stableId(`cust:${businessId}:${email}`),
    businessId,
    name,
    email,
    lastContactAt: parseWhen(last),
    notes: pick(row, ["notes", "note", "comment", "remarks"]),
    followUpCount: 0,
    sourceImportId: null,
  };
}

export function asAppointment(businessId: string, row: Record<string, string>, index = 0): Appointment | null {
  const customerName = pickName(row);
  const customerEmail = pickEmail(row);
  const startsAt = parseWhen(pick(row, ["starts_at", "start_at", "start", "datetime", "scheduled_at", "appointment_at", "booking_at"]));
  if (!customerName || !looksLikeEmail(customerEmail) || !startsAt) return null;
  const statusRaw = pick(row, ["status"]).toLowerCase();
  const status = statusRaw === "cancelled" || statusRaw === "completed" ? statusRaw : "booked";
  return {
    id: stableId(`appt:${businessId}:${customerEmail}:${startsAt}`),
    businessId,
    customerName,
    customerEmail,
    startsAt,
    status,
    reminderCount: 0,
    sourceImportId: null,
  };
}

function applyMappedRows(businessId: string, kind: DetectedKind, rows: Record<string, string>[], fileId: string) {
  const store = getStore();
  let mapped = 0;
  rows.forEach((row, index) => {
    if (kind === "invoices") {
      const invoice = asInvoice(businessId, row, index);
      if (!invoice) return;
      if (store.invoices.some((item) => item.businessId === businessId && item.invoiceNumber === invoice.invoiceNumber)) return;
      invoice.sourceImportId = fileId;
      store.invoices.unshift(invoice);
      mapped += 1;
    } else if (kind === "customers") {
      const customer = asCustomer(businessId, row, index);
      if (!customer) return;
      if (store.customers.some((item) => item.businessId === businessId && item.email.toLowerCase() === customer.email.toLowerCase())) return;
      customer.sourceImportId = fileId;
      store.customers.unshift(customer);
      mapped += 1;
    } else if (kind === "appointments") {
      const appointment = asAppointment(businessId, row, index);
      if (!appointment) return;
      if (
        store.appointments.some(
          (item) =>
            item.businessId === businessId &&
            item.customerEmail.toLowerCase() === appointment.customerEmail.toLowerCase() &&
            item.startsAt === appointment.startsAt,
        )
      )
        return;
      appointment.sourceImportId = fileId;
      store.appointments.unshift(appointment);
      mapped += 1;
    }
  });
  return mapped;
}

function dropStaleFiles(businessId: string, filename: string) {
  const store = getStore();
  const stale = store.imports
    .filter((row) => row.businessId === businessId && row.filename.toLowerCase() === filename.toLowerCase())
    .map((row) => row.id);
  for (const id of stale) deleteImportedDataset(businessId, id);
}

export function ingestCsv(businessId: string, csv: string, filename = "upload.csv", preferredKind?: DetectedKind) {
  const parsed = parseCsv(csv);
  if (!parsed.length) {
    throw new Error("Need a header row and at least one data row.");
  }
  const kind = detectKind(parsed, filename, preferredKind);
  const headers = Object.keys(parsed[0] ?? {});
  dropStaleFiles(businessId, filename);
  const existingSameKind = getStore().imports.filter((row) => row.businessId === businessId && row.kind === kind).length;
  const file = recordImport({
    businessId,
    filename,
    kind,
    rowCount: parsed.length,
    headers,
    rows: parsed,
  });
  const mapped = applyMappedRows(businessId, kind, parsed, file.id);

  return {
    file,
    kind,
    mapped,
    stored: parsed.length,
    headers,
    agentReady: kind === "invoices" || kind === "customers" || kind === "appointments",
    agent: kind === "invoices" ? "invoice" : kind === "customers" ? "customer" : kind === "appointments" ? "appointment" : null,
    reason:
      kind === "custom"
        ? "Columns do not match invoices, customers, or bookings, so this file stays on Datasets only. Agents did not run."
        : existingSameKind
          ? `Matched as ${kind} and combined with your other ${kind} file(s) (${existingSameKind + 1} files). Combined is the default; search, pick one, or pick several on that page.`
          : `Matched as ${kind}. Only the ${kind === "invoices" ? "collections" : kind === "customers" ? "follow-up" : "booking"} agent ran.`,
  };
}

export function rematerializeFromFiles() {
  return syncDeskFromDatasets() ? 1 : 0;
}

export function reconcileToDatasets() {
  return syncDeskFromDatasets() ? 1 : 0;
}

export function syncDeskFromDatasets() {
  const store = getStore();
  const before = [
    store.invoices.map((row) => row.customerName).join("|"),
    store.customers.map((row) => row.name).join("|"),
    store.appointments.map((row) => row.customerName).join("|"),
    String(store.invoices.length),
  ].join("::");
  const manuals = {
    invoices: store.invoices.filter((row) => row.sourceImportId === "manual"),
    customers: store.customers.filter((row) => row.sourceImportId === "manual"),
    appointments: store.appointments.filter((row) => row.sourceImportId === "manual"),
  };
  store.invoices = [...manuals.invoices];
  store.customers = [...manuals.customers];
  store.appointments = [...manuals.appointments];
  for (const file of store.imports) {
    if (!file.rows?.length) continue;
    file.kind = detectKind(file.rows, file.filename, file.kind);
    applyMappedRows(file.businessId, file.kind, file.rows, file.id);
  }
  pruneOrphanDrafts();
  const after = [
    store.invoices.map((row) => row.customerName).join("|"),
    store.customers.map((row) => row.name).join("|"),
    store.appointments.map((row) => row.customerName).join("|"),
    String(store.invoices.length),
  ].join("::");
  return before !== after;
}

export function pruneOrphanDrafts() {
  const store = getStore();
  const invoiceIds = new Set(store.invoices.map((row) => row.id));
  const customerIds = new Set(store.customers.map((row) => row.id));
  const appointmentIds = new Set(store.appointments.map((row) => row.id));
  const before = store.drafts.length;
  store.drafts = store.drafts.filter((draft) => {
    if (draft.agent === "invoice") return invoiceIds.has(draft.recordId) || invoiceIds.has(draft.invoiceId);
    if (draft.agent === "customer") return customerIds.has(draft.recordId);
    if (draft.agent === "appointment") return appointmentIds.has(draft.recordId);
    return true;
  });
  return before - store.drafts.length;
}

export function deskCounts(businessId: string) {
  const store = getStore();
  return {
    invoices: store.invoices.filter((row) => row.businessId === businessId).length,
    customers: store.customers.filter((row) => row.businessId === businessId).length,
    appointments: store.appointments.filter((row) => row.businessId === businessId).length,
    pendingApprovals: store.drafts.filter((draft) => draft.status === "pending" || draft.status === "approved").length,
  };
}

export function deleteImportedDataset(businessId: string, importId: string) {
  const store = getStore();
  const file = store.imports.find((row) => row.id === importId && row.businessId === businessId);
  if (!file) throw new Error("Dataset not found.");
  const invoiceIds = new Set(store.invoices.filter((row) => row.sourceImportId === importId).map((row) => row.id));
  const customerIds = new Set(store.customers.filter((row) => row.sourceImportId === importId).map((row) => row.id));
  const appointmentIds = new Set(store.appointments.filter((row) => row.sourceImportId === importId).map((row) => row.id));
  store.invoices = store.invoices.filter((row) => row.sourceImportId !== importId);
  store.customers = store.customers.filter((row) => row.sourceImportId !== importId);
  store.appointments = store.appointments.filter((row) => row.sourceImportId !== importId);
  store.drafts = store.drafts.filter(
    (draft) => !invoiceIds.has(draft.recordId) && !invoiceIds.has(draft.invoiceId) && !customerIds.has(draft.recordId) && !appointmentIds.has(draft.recordId),
  );
  store.imports = store.imports.filter((row) => row.id !== importId);
  pruneOrphanDrafts();
  return {
    filename: file.filename,
    kind: file.kind,
    removed: { invoices: invoiceIds.size, customers: customerIds.size, appointments: appointmentIds.size },
    refreshed: deskCounts(businessId),
  };
}
