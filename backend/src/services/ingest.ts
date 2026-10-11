import { parseCsv } from "./csv.js";
import { getStore, recordImport } from "./store.js";
import type { Appointment, DatasetImport, FollowUpCustomer, Invoice } from "../types.js";

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
  const direct = pick(row, ["customer_name", "client_name", "company_name", "contact_name", "full_name", "customer", "client", "company", "name"]);
  if (direct && !looksLikeEmail(direct)) return direct;
  const fallback = Object.entries(row).find(([key, value]) => value && !looksLikeEmail(value) && /name|customer|client|company|contact/i.test(key));
  return fallback?.[1] ?? "";
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
  if (/invoice|billing|payment|overdue|ar_/.test(name) || /invoice/.test(headers)) scores.invoices += 3;
  if (/customer|client|contact|lead/.test(name) || /last_contact/.test(headers)) scores.customers += 3;
  if (/book|appoint|schedule/.test(name) || /starts_at|booking/.test(headers)) scores.appointments += 3;
  if (/amount|due|total/.test(headers)) scores.invoices += 2;
  if (/email/.test(headers) && /name/.test(headers)) scores.customers += 1;
  if (/start|datetime|when|scheduled/.test(headers)) scores.appointments += 2;
  const winner = (Object.entries(scores) as ["invoices" | "customers" | "appointments", number][]).sort((a, b) => b[1] - a[1])[0];
  return winner[1] > 0 ? winner[0] : "custom";
}

export function asInvoice(businessId: string, row: Record<string, string>): Invoice | null {
  const invoiceNumber = pick(row, ["invoice_number", "invoice_no", "invoice", "inv_no", "inv", "id"]);
  const customerName = pickName(row);
  const customerEmail = pickEmail(row);
  const amountSgd = parseAmount(pick(row, ["amount_sgd", "amount", "total", "value", "price", "balance", "grand_total"]));
  const dueDate = parseWhen(pick(row, ["due_date", "due", "invoice_date", "date"]));
  const statusRaw = pick(row, ["status", "state"]).toLowerCase();
  const status = statusRaw === "paid" || statusRaw === "disputed" ? statusRaw : "unpaid";
  if (!invoiceNumber || !customerName || !looksLikeEmail(customerEmail) || !dueDate || !(amountSgd > 0)) return null;
  return {
    id: crypto.randomUUID(),
    businessId,
    customerId: crypto.randomUUID(),
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

export function asCustomer(businessId: string, row: Record<string, string>): FollowUpCustomer | null {
  const name = pickName(row);
  const email = pickEmail(row);
  if (!name || !looksLikeEmail(email)) return null;
  const last = pick(row, ["last_contact_at", "last_contact", "last_seen", "updated_at", "contacted_at"]);
  return {
    id: crypto.randomUUID(),
    businessId,
    name,
    email,
    lastContactAt: parseWhen(last),
    notes: pick(row, ["notes", "note", "comment", "remarks"]),
    followUpCount: 0,
    sourceImportId: null,
  };
}

export function asAppointment(businessId: string, row: Record<string, string>): Appointment | null {
  const customerName = pickName(row);
  const customerEmail = pickEmail(row);
  const startsAt = parseWhen(pick(row, ["starts_at", "start_at", "start", "datetime", "scheduled_at", "appointment_at", "booking_at", "date"]));
  if (!customerName || !looksLikeEmail(customerEmail) || !startsAt) return null;
  const statusRaw = pick(row, ["status"]).toLowerCase();
  const status = statusRaw === "cancelled" || statusRaw === "completed" ? statusRaw : "booked";
  return {
    id: crypto.randomUUID(),
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
  if (kind === "invoices") {
    for (const row of rows) {
      const invoice = asInvoice(businessId, row);
      if (!invoice) continue;
      invoice.sourceImportId = fileId;
      store.invoices.unshift(invoice);
      mapped += 1;
    }
  } else if (kind === "customers") {
    for (const row of rows) {
      const customer = asCustomer(businessId, row);
      if (!customer) continue;
      customer.sourceImportId = fileId;
      store.customers.unshift(customer);
      mapped += 1;
    }
  } else if (kind === "appointments") {
    for (const row of rows) {
      const appointment = asAppointment(businessId, row);
      if (!appointment) continue;
      appointment.sourceImportId = fileId;
      store.appointments.unshift(appointment);
      mapped += 1;
    }
  }
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
  const store = getStore();
  let added = 0;
  for (const file of store.imports) {
    if (!file.rows.length) continue;
    if (file.kind === "invoices" && store.invoices.some((row) => row.sourceImportId === file.id)) continue;
    if (file.kind === "customers" && store.customers.some((row) => row.sourceImportId === file.id)) continue;
    if (file.kind === "appointments" && store.appointments.some((row) => row.sourceImportId === file.id)) continue;
    added += applyMappedRows(file.businessId, file.kind, file.rows, file.id);
  }
  return added;
}

export function reconcileToDatasets() {
  const store = getStore();
  const kinds = new Set(store.imports.map((row) => row.kind));
  let changed = 0;
  if (!kinds.has("invoices")) {
    const before = store.invoices.length;
    store.invoices = store.invoices.filter((row) => row.sourceImportId === "manual");
    changed += before - store.invoices.length;
  }
  if (!kinds.has("customers")) {
    const before = store.customers.length;
    store.customers = store.customers.filter((row) => row.sourceImportId === "manual");
    changed += before - store.customers.length;
  }
  if (!kinds.has("appointments")) {
    const before = store.appointments.length;
    store.appointments = store.appointments.filter((row) => row.sourceImportId === "manual");
    changed += before - store.appointments.length;
  }
  return changed;
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
