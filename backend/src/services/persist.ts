import { databaseReady, prisma } from "./db.js";
import { getStore, setProfile } from "./store.js";
import { deleteImportedDataset, pruneOrphanDrafts, syncDeskFromDatasets } from "./ingest.js";
import type { AgentDraft, Appointment, Invoice } from "../types.js";

const DEMO_BUSINESS_ID = process.env.DEMO_BUSINESS_ID ?? "demo-business";

function jsonArray<T>(value: unknown, fallback: T[]): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function asDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function loadSnapshot() {
  if (!databaseReady) {
    console.warn("DATABASE_URL is not Postgres; running in memory only.");
    return;
  }
  const store = getStore();
  const [invoices, customers, appointments, drafts, logs, imports, profiles, policies, evidence] = await Promise.all([
    prisma.invoice.findMany(),
    prisma.followUpCustomer.findMany(),
    prisma.appointment.findMany(),
    prisma.agentDraft.findMany(),
    prisma.actionLog.findMany({ orderBy: { timestamp: "desc" } }),
    prisma.datasetImport.findMany({ orderBy: { importedAt: "desc" } }),
    prisma.businessProfile.findMany(),
    prisma.reminderPolicy.findMany(),
    prisma.complianceEvidence.findMany(),
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
    eventType: row.eventType ?? row.action,
    userId: row.userId ?? "",
    businessId: row.businessId ?? "",
    status: row.status ?? "",
    sourceImportId: row.sourceImportId ?? null,
    datasetName: row.datasetName ?? "",
  }));
  store.imports = imports.map((row) => ({
    id: row.id,
    businessId: row.businessId,
    filename: row.filename,
    kind: row.kind as (typeof store.imports)[number]["kind"],
    rowCount: row.rowCount,
    importedAt: row.importedAt.toISOString(),
    headers: jsonArray<string>(row.headers, []),
    rows: jsonArray<Record<string, string>>(row.rows, []),
  }));
  store.evidence = evidence.map((row) => ({
    ...row,
    status: row.status as (typeof store.evidence)[number]["status"],
  }));
  for (const profile of profiles) store.profiles[profile.businessId] = profile;
  for (const policy of policies) store.policies[policy.businessId] = policy;
  if (syncDeskFromDatasets() || pruneOrphanDrafts()) await saveSnapshot();
}

export async function saveSnapshot() {
  if (!databaseReady) return;
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
    prisma.complianceEvidence.deleteMany(),
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
          id: row.id,
          agent: row.agent,
          agentRunId: row.agentRunId,
          invoiceId: row.invoiceId,
          action: row.action,
          result: row.result,
          timestamp: new Date(row.timestamp),
          eventType: row.eventType ?? row.action,
          userId: row.userId ?? "",
          businessId: row.businessId ?? "",
          status: row.status ?? "",
          sourceImportId: row.sourceImportId ?? null,
          datasetName: row.datasetName ?? "",
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
  if (store.evidence.length) {
    ops.push(prisma.complianceEvidence.createMany({ data: store.evidence }));
  }
  const profiles = Object.values(store.profiles);
  if (profiles.length) ops.push(prisma.businessProfile.createMany({ data: profiles }));
  const policies = Object.values(store.policies);
  if (policies.length) ops.push(prisma.reminderPolicy.createMany({ data: policies }));
  await prisma.$transaction(ops);
}

export async function stripLegacyAutoSeed() {
  const store = getStore();
  const businessId = DEMO_BUSINESS_ID;
  const profile = store.profiles[businessId];
  const harbour = profile?.name === "Harbour Digital Studio";
  const seedNames = new Set(["invoices.csv", "customers.csv", "appointments.csv"]);
  const tenantFiles = store.imports.filter((row) => row.businessId === businessId);
  const seedFiles = tenantFiles.filter((row) => seedNames.has(row.filename));
  const onlyLegacySeeds = seedFiles.length > 0 && tenantFiles.every((row) => seedNames.has(row.filename));
  if (!harbour && !onlyLegacySeeds) return { cleared: false };

  for (const file of seedFiles) {
    try {
      deleteImportedDataset(businessId, file.id);
    } catch {
      /* already gone */
    }
  }

  store.evidence = store.evidence.filter((row) => row.businessId !== businessId);
  store.drafts = store.drafts.filter((draft) => draft.agent !== "grant" && draft.agent !== "compliance");

  if (harbour || !profile?.industry) {
    setProfile({
      businessId,
      name: "Demo SME",
      industry: "",
      employeeCount: 0,
      annualRevenueSgd: 0,
      isExporting: false,
      usesDigitalTools: false,
      hasGstRegistration: false,
    });
  }

  await saveSnapshot();
  return { cleared: true };
}
