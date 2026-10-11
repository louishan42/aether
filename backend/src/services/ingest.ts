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

export function detectKind(rows: Record<string, string>[], filename = ""): DetectedKind {
  const name = filename.toLowerCase();
  const headers = Object.keys(rows[0] ?? {}).map(norm).join(" ");
  const scores = {
    invoices: 0,
    customers: 0,
    appointments: 0,
  };
  if (/invoice|billing|payment|overdue|ar_|payroll|gusto|salary/.test(name) || /invoice/.test(headers)) scores.invoices += 3;
  if (/customer|client|contact|lead|employee|staff|payroll|gusto/.test(name) || /last_contact|employee_name/.test(headers)) scores.customers += 3;
  if (/book|appoint|schedule/.test(name) || /starts_at|booking/.test(headers)) scores.appointments += 3;
  if (/amount|due|total|pay_date/.test(headers)) scores.invoices += 2;
  if (/email/.test(headers) && /name/.test(headers)) scores.customers += 1;
  if (/start|datetime|when|scheduled/.test(headers)) scores.appointments += 2;
  const winner = (Object.entries(scores) as ["invoices" | "customers" | "appointments", number][]).sort((a, b) => b[1] - a[1])[0];
  return winner[1] > 0 ? winner[0] : "custom";
}

export function asInvoice(businessId: string, row: Record<string, string>, index = 0): Invoice | null {
  const customerName = pickName(row);
  const amountSgd = parseAmount(pick(row, ["amount_sgd", "amount", "total", "value", "price", "balance", "grand_total", "pay", "gross"]));
  if (!customerName || !(amountSgd > 0)) return null;
  const whenRaw = pick(row, ["due_date", "due", "invoice_date", "pay_date", "payment_date", "date"]);
  const dueDate = parseWhen(whenRaw) ?? new Date().toISOString();
  const employeeId = pick(row, ["employee_id", "staff_id", "worker_id"]);
  const invoiceNumber =
    pick(row, ["invoice_number", "invoice_no", "invoice", "inv_no"]) || [employeeId, whenRaw, `R${index + 1}`].filter(Boolean).join("-");
  const customerEmail = synthEmail(row, customerName, index);
  const statusRaw = pick(row, ["status", "state", "type"]).toLowerCase();
  const status = statusRaw === "paid" || statusRaw === "disputed" ? statusRaw : "unpaid";
  return {
    id: stableId(`inv:${businessId}:${invoiceNumber}:${customerName}:${dueDate}`),
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
  if (!name) return null;
  const email = synthEmail(row, name, index);
  const last = pick(row, ["last_contact_at", "last_contact", "last_seen", "updated_at", "contacted_at", "pay_date", "date"]);
  const role = pick(row, ["role", "title", "type"]);
  return {
    id: stableId(`cust:${businessId}:${email}`),
    businessId,
    name,
    email,
    lastContactAt: parseWhen(last),
    notes: pick(row, ["notes", "note", "comment", "remarks"]) || role,
    followUpCount: 0,
    sourceImportId: null,
  };
}

export function asAppointment(businessId: string, row: Record<string, string>, index = 0): Appointment | null {
  const customerName = pickName(row);
  const startsAt = parseWhen(pick(row, ["starts_at", "start_at", "start", "datetime", "scheduled_at", "appointment_at", "booking_at", "pay_date", "date"]));
  if (!customerName || !startsAt) return null;
  const customerEmail = synthEmail(row, customerName, index);
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
  const seenCustomers = new Set(store.customers.filter((row) => row.businessId === businessId).map((row) => row.email.toLowerCase()));

  rows.forEach((row, index) => {
    if (kind !== "appointments") {
      const invoice = asInvoice(businessId, row, index);
      if (invoice) {
        invoice.sourceImportId = fileId;
        store.invoices.unshift(invoice);
        mapped += 1;
      }
    }
    if (kind === "customers" || kind === "invoices" || kind === "custom") {
      const customer = asCustomer(businessId, row, index);
      if (customer && !seenCustomers.has(customer.email.toLowerCase())) {
        customer.sourceImportId = fileId;
        store.customers.unshift(customer);
        seenCustomers.add(customer.email.toLowerCase());
        if (kind === "customers" && !asInvoice(businessId, row, index)) mapped += 1;
      }
    }
    if (kind === "appointments") {
      const appointment = asAppointment(businessId, row, index);
      if (appointment) {
        appointment.sourceImportId = fileId;
        store.appointments.unshift(appointment);
        mapped += 1;
      }
    }
  });
  return mapped;
}

function dropStaleFiles(businessId: string, filename: string, kind: DetectedKind) {
  const store = getStore();
  const stale = store.imports
    .filter((row) => {
      if (row.businessId !== businessId) return false;
      if (row.filename.toLowerCase() === filename.toLowerCase()) return true;
      return kind !== "custom" && row.kind === kind;
    })
    .map((row) => row.id);
  for (const id of stale) deleteImportedDataset(businessId, id);
}

export function ingestCsv(businessId: string, csv: string, filename = "upload.csv", preferredKind?: DetectedKind) {
  const parsed = parseCsv(csv);
  if (!parsed.length) {
    throw new Error("Need a header row and at least one data row.");
  }
  const kind = preferredKind && preferredKind !== "custom" ? preferredKind : detectKind(parsed, filename);
  const headers = Object.keys(parsed[0] ?? {});
  dropStaleFiles(businessId, filename, kind);
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

function dropKindRecords(businessId: string, kind: DetectedKind) {
  const store = getStore();
  const removed = { invoices: 0, customers: 0, appointments: 0 };
  if (kind === "invoices") {
    const ids = new Set(store.invoices.filter((row) => row.businessId === businessId).map((row) => row.id));
    removed.invoices = ids.size;
    store.invoices = store.invoices.filter((row) => row.businessId !== businessId);
    store.drafts = store.drafts.filter((draft) => draft.agent !== "invoice" && !ids.has(draft.recordId) && !ids.has(draft.invoiceId));
  } else if (kind === "customers") {
    const ids = new Set(store.customers.filter((row) => row.businessId === businessId).map((row) => row.id));
    removed.customers = ids.size;
    store.customers = store.customers.filter((row) => row.businessId !== businessId);
    store.drafts = store.drafts.filter((draft) => draft.agent !== "customer" && !ids.has(draft.recordId));
  } else if (kind === "appointments") {
    const ids = new Set(store.appointments.filter((row) => row.businessId === businessId).map((row) => row.id));
    removed.appointments = ids.size;
    store.appointments = store.appointments.filter((row) => row.businessId !== businessId);
    store.drafts = store.drafts.filter((draft) => draft.agent !== "appointment" && !ids.has(draft.recordId));
  }
  return removed;
}

export function deleteImportedDataset(businessId: string, importId: string) {
  const store = getStore();
  const file = store.imports.find((row) => row.id === importId && row.businessId === businessId);
  if (!file) throw new Error("Dataset not found.");
  const removed = dropKindRecords(businessId, file.kind);
  store.imports = store.imports.filter((row) => row.id !== importId);
  pruneOrphanDrafts();
  return { filename: file.filename, kind: file.kind, removed, refreshed: deskCounts(businessId) };
}
