import { parseCsv } from "./csv.js";
import { getStore, recordImport } from "./store.js";
import type { Appointment, DatasetImport, FollowUpCustomer, Invoice } from "../types.js";

export type DetectedKind = DatasetImport["kind"];

function norm(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function pick(row: Record<string, string>, aliases: string[]) {
  const entries = Object.entries(row).map(([key, value]) => [norm(key), value] as const);
  for (const alias of aliases.map(norm)) {
    const hit = entries.find(([key, value]) => key === alias && value);
    if (hit) return hit[1];
  }
  return "";
}

function looksLikeEmail(value: string) {
  return /.+@.+\..+/.test(value);
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
  if (/invoice|billing|payment|overdue/.test(name) || /invoice/.test(headers)) scores.invoices += 3;
  if (/customer|client|contact|lead/.test(name) || /last_contact/.test(headers)) scores.customers += 3;
  if (/book|appoint|schedule/.test(name) || /starts_at|booking/.test(headers)) scores.appointments += 3;
  if (/amount|due|total/.test(headers)) scores.invoices += 2;
  if (/email/.test(headers) && /name/.test(headers)) scores.customers += 1;
  if (/start|datetime|when/.test(headers)) scores.appointments += 2;
  const winner = (Object.entries(scores) as ["invoices" | "customers" | "appointments", number][]).sort((a, b) => b[1] - a[1])[0];
  return winner[1] > 0 ? winner[0] : "custom";
}

function asInvoice(businessId: string, row: Record<string, string>): Invoice | null {
  const invoiceNumber = pick(row, ["invoice_number", "invoice", "inv_no", "invoice_no", "id"]);
  const customerName = pick(row, ["customer_name", "customer", "client", "client_name", "name"]);
  const customerEmail = pick(row, ["customer_email", "email", "customer_email_address"]);
  const amountSgd = parseAmount(pick(row, ["amount_sgd", "amount", "total", "value", "price"]));
  const dueDate = parseWhen(pick(row, ["due_date", "due", "date", "invoice_date"]));
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

function asCustomer(businessId: string, row: Record<string, string>): FollowUpCustomer | null {
  const name = pick(row, ["name", "customer_name", "customer", "client", "company"]);
  const email = pick(row, ["email", "customer_email"]);
  if (!name || !looksLikeEmail(email)) return null;
  const last = pick(row, ["last_contact_at", "last_contact", "last_seen", "updated_at"]);
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

function asAppointment(businessId: string, row: Record<string, string>): Appointment | null {
  const customerName = pick(row, ["customer_name", "name", "customer", "client"]);
  const customerEmail = pick(row, ["customer_email", "email"]);
  const startsAt = parseWhen(pick(row, ["starts_at", "start", "start_at", "datetime", "date", "booking_at"]));
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

export function ingestCsv(businessId: string, csv: string, filename = "upload.csv", preferredKind?: DetectedKind) {
  const parsed = parseCsv(csv);
  if (!parsed.length) {
    throw new Error("Need a header row and at least one data row.");
  }
  const kind = preferredKind && preferredKind !== "custom" ? preferredKind : detectKind(parsed, filename);
  const headers = Object.keys(parsed[0] ?? {});
  const store = getStore();
  const file = recordImport({
    businessId,
    filename,
    kind,
    rowCount: parsed.length,
    headers,
    rows: parsed,
  });

  let mapped = 0;
  if (kind === "invoices") {
    for (const row of parsed) {
      const invoice = asInvoice(businessId, row);
      if (!invoice) continue;
      invoice.sourceImportId = file.id;
      store.invoices.unshift(invoice);
      mapped += 1;
    }
  } else if (kind === "customers") {
    for (const row of parsed) {
      const customer = asCustomer(businessId, row);
      if (!customer) continue;
      customer.sourceImportId = file.id;
      store.customers.unshift(customer);
      mapped += 1;
    }
  } else if (kind === "appointments") {
    for (const row of parsed) {
      const appointment = asAppointment(businessId, row);
      if (!appointment) continue;
      appointment.sourceImportId = file.id;
      store.appointments.unshift(appointment);
      mapped += 1;
    }
  }

  return {
    file,
    kind,
    mapped,
    stored: parsed.length,
    headers,
    agentReady: kind === "invoices" || kind === "customers" || kind === "appointments",
  };
}

export function deleteImportedDataset(businessId: string, importId: string) {
  const store = getStore();
  const file = store.imports.find((row) => row.id === importId && row.businessId === businessId);
  if (!file) throw new Error("Dataset not found.");

  const invoiceIds = new Set(
    store.invoices.filter((row) => row.businessId === businessId && row.sourceImportId === importId).map((row) => row.id),
  );
  const customerIds = new Set(
    store.customers.filter((row) => row.businessId === businessId && row.sourceImportId === importId).map((row) => row.id),
  );
  const appointmentIds = new Set(
    store.appointments.filter((row) => row.businessId === businessId && row.sourceImportId === importId).map((row) => row.id),
  );

  if (!invoiceIds.size && file.kind === "invoices") {
    const numbers = new Set(file.rows.map((row) => row.invoice_number || row.invoice || row.id).filter(Boolean));
    store.invoices
      .filter((row) => row.businessId === businessId && numbers.has(row.invoiceNumber))
      .forEach((row) => invoiceIds.add(row.id));
  }
  if (!customerIds.size && file.kind === "customers") {
    const emails = new Set(file.rows.map((row) => (row.email || row.customer_email || "").toLowerCase()).filter(Boolean));
    store.customers
      .filter((row) => row.businessId === businessId && emails.has(row.email.toLowerCase()))
      .forEach((row) => customerIds.add(row.id));
  }
  if (!appointmentIds.size && file.kind === "appointments") {
    const keys = new Set(file.rows.map((row) => `${row.customer_email || row.email}|${row.starts_at || row.start || ""}`));
    store.appointments
      .filter((row) => row.businessId === businessId && keys.has(`${row.customerEmail}|${row.startsAt}`))
      .forEach((row) => appointmentIds.add(row.id));
  }

  const recordIds = new Set([...invoiceIds, ...customerIds, ...appointmentIds]);
  store.invoices = store.invoices.filter((row) => !invoiceIds.has(row.id));
  store.customers = store.customers.filter((row) => !customerIds.has(row.id));
  store.appointments = store.appointments.filter((row) => !appointmentIds.has(row.id));
  store.drafts = store.drafts.filter((draft) => !recordIds.has(draft.recordId) && !recordIds.has(draft.invoiceId));
  store.imports = store.imports.filter((row) => row.id !== importId);

  return {
    filename: file.filename,
    kind: file.kind,
    removed: { invoices: invoiceIds.size, customers: customerIds.size, appointments: appointmentIds.size },
  };
}
