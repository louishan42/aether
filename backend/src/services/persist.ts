import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "./db.js";
import { addLog, getStore, setPolicy, setProfile } from "./store.js";
import { ingestCsv } from "./ingest.js";
import type { AgentDraft, Appointment, Invoice } from "../types.js";

const DEMO_BUSINESS_ID = process.env.DEMO_BUSINESS_ID ?? "demo-business";

function asDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function loadSnapshot() {
  const store = getStore();
  const [invoices, customers, appointments, drafts, logs, imports, profiles, policies] = await Promise.all([
    prisma.invoice.findMany(),
    prisma.followUpCustomer.findMany(),
    prisma.appointment.findMany(),
    prisma.agentDraft.findMany(),
    prisma.actionLog.findMany({ orderBy: { timestamp: "desc" } }),
    prisma.datasetImport.findMany({ orderBy: { importedAt: "desc" } }),
    prisma.businessProfile.findMany(),
    prisma.reminderPolicy.findMany(),
  ]);

  store.invoices = invoices.map((row) => ({
    ...row,
    amountSgd: row.amountSgd,
    dueDate: row.dueDate.toISOString(),
    lastReminderAt: row.lastReminderAt?.toISOString() ?? null,
    status: row.status as Invoice["status"],
    sourceImportId: row.sourceImportId ?? null,
  }));
  store.customers = customers.map((row) => ({
    ...row,
    lastContactAt: row.lastContactAt?.toISOString() ?? null,
    sourceImportId: row.sourceImportId ?? null,
  }));
  store.appointments = appointments.map((row) => ({
    ...row,
    startsAt: row.startsAt.toISOString(),
    status: row.status as Appointment["status"],
    sourceImportId: row.sourceImportId ?? null,
  }));
  store.drafts = drafts.map((row) => ({
    ...row,
    generatedAt: row.generatedAt.toISOString(),
    agent: row.agent as AgentDraft["agent"],
    status: row.status as AgentDraft["status"],
  }));
  store.logs = logs.map((row) => ({
    ...row,
    timestamp: row.timestamp.toISOString(),
    agent: row.agent as (typeof store.logs)[number]["agent"],
  }));
  store.imports = imports.map((row) => ({
    id: row.id,
    businessId: row.businessId,
    filename: row.filename,
    kind: row.kind as (typeof store.imports)[number]["kind"],
    rowCount: row.rowCount,
    importedAt: row.importedAt.toISOString(),
    headers: Array.isArray(row.headers) ? (row.headers as string[]) : [],
    rows: Array.isArray(row.rows) ? (row.rows as Record<string, string>[]) : [],
  }));
  for (const profile of profiles) store.profiles[profile.businessId] = profile;
  for (const policy of policies) store.policies[policy.businessId] = policy;
}

export async function saveSnapshot() {
  const store = getStore();
  const ops = [
    prisma.invoice.deleteMany(),
    prisma.followUpCustomer.deleteMany(),
    prisma.appointment.deleteMany(),
    prisma.agentDraft.deleteMany(),
    prisma.actionLog.deleteMany(),
    prisma.datasetImport.deleteMany(),
    prisma.businessProfile.deleteMany(),
    prisma.reminderPolicy.deleteMany(),
  ];
  if (store.invoices.length) {
    ops.push(
      prisma.invoice.createMany({
        data: store.invoices.map((row) => ({
          ...row,
          dueDate: new Date(row.dueDate),
          lastReminderAt: asDate(row.lastReminderAt),
        })),
      }),
    );
  }
  if (store.customers.length) {
    ops.push(
      prisma.followUpCustomer.createMany({
        data: store.customers.map((row) => ({
          ...row,
          lastContactAt: asDate(row.lastContactAt),
        })),
      }),
    );
  }
  if (store.appointments.length) {
    ops.push(
      prisma.appointment.createMany({
        data: store.appointments.map((row) => ({
          ...row,
          startsAt: new Date(row.startsAt),
        })),
      }),
    );
  }
  if (store.drafts.length) {
    ops.push(
      prisma.agentDraft.createMany({
        data: store.drafts.map((row) => ({
          ...row,
          generatedAt: new Date(row.generatedAt),
        })),
      }),
    );
  }
  if (store.logs.length) {
    ops.push(
      prisma.actionLog.createMany({
        data: store.logs.map((row) => ({
          ...row,
          timestamp: new Date(row.timestamp),
        })),
      }),
    );
  }
  if (store.imports.length) {
    ops.push(
      prisma.datasetImport.createMany({
        data: store.imports.map((row) => ({
          id: row.id,
          businessId: row.businessId,
          filename: row.filename,
          kind: row.kind,
          rowCount: row.rowCount,
          importedAt: new Date(row.importedAt),
          headers: row.headers,
          rows: row.rows,
        })),
      }),
    );
  }
  const profiles = Object.values(store.profiles);
  if (profiles.length) ops.push(prisma.businessProfile.createMany({ data: profiles }));
  const policies = Object.values(store.policies);
  if (policies.length) ops.push(prisma.reminderPolicy.createMany({ data: policies }));
  await prisma.$transaction(ops);
}

export async function seedFromCsvIfEmpty() {
  const store = getStore();
  if (store.invoices.length || store.customers.length || store.appointments.length) return { seeded: false };

  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../datasets");
  const businessId = DEMO_BUSINESS_ID;

  const invoiceCsv = await readFile(path.join(root, "invoices.csv"), "utf8");
  const customerCsv = await readFile(path.join(root, "customers.csv"), "utf8");
  const bookingCsv = await readFile(path.join(root, "appointments.csv"), "utf8");
  ingestCsv(businessId, invoiceCsv, "invoices.csv", "invoices");
  ingestCsv(businessId, customerCsv, "customers.csv", "customers");
  ingestCsv(businessId, bookingCsv, "appointments.csv", "appointments");
  setProfile({
    businessId,
    name: "Harbour Digital Studio",
    industry: "software",
    employeeCount: 8,
    annualRevenueSgd: 1_200_000,
    isExporting: true,
    usesDigitalTools: true,
    hasGstRegistration: true,
  });
  setPolicy({
    businessId,
    minimumOverdueDays: 1,
    maxReminders: 3,
    cooldownDays: 7,
    customerFollowUpDays: 14,
    appointmentReminderHours: 24,
  });
  addLog({
    agent: "system",
    agentRunId: null,
    invoiceId: null,
    action: "seed_datasets",
    result: `invoices=${store.invoices.length}; customers=${store.customers.length}; bookings=${store.appointments.length}`,
  });
  await saveSnapshot();
  return { seeded: true };
}
