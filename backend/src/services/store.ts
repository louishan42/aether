import type {
  ActionLog,
  AgentRun,
  Appointment,
  BusinessProfile,
  ComplianceEvidence,
  DatasetImport,
  FollowUpCustomer,
  Invoice,
  ReminderDraft,
  ReminderPolicy,
} from "../types.js";

const DEMO_BUSINESS_ID = process.env.DEMO_BUSINESS_ID ?? "demo-business";

type Store = {
  invoices: Invoice[];
  customers: FollowUpCustomer[];
  appointments: Appointment[];
  evidence: ComplianceEvidence[];
  drafts: ReminderDraft[];
  logs: ActionLog[];
  runs: AgentRun[];
  policies: Record<string, ReminderPolicy>;
  profiles: Record<string, BusinessProfile>;
  imports: DatasetImport[];
};

const memory = globalThis as typeof globalThis & { __aetherStore?: Store };

function defaultPolicy(businessId: string): ReminderPolicy {
  return {
    businessId,
    minimumOverdueDays: 1,
    maxReminders: 3,
    cooldownDays: 7,
    customerFollowUpDays: 14,
    appointmentReminderHours: 24,
  };
}

function defaultProfile(businessId: string): BusinessProfile {
  return {
    businessId,
    name: "Demo SME",
    industry: "",
    employeeCount: 0,
    annualRevenueSgd: 0,
    isExporting: false,
    usesDigitalTools: false,
    hasGstRegistration: false,
  };
}

function emptyStore(): Store {
  return {
    invoices: [],
    customers: [],
    appointments: [],
    evidence: [],
    drafts: [],
    logs: [],
    runs: [],
    policies: { [DEMO_BUSINESS_ID]: defaultPolicy(DEMO_BUSINESS_ID) },
    profiles: { [DEMO_BUSINESS_ID]: defaultProfile(DEMO_BUSINESS_ID) },
    imports: [],
  };
}

export function getStore() {
  if (!memory.__aetherStore) memory.__aetherStore = emptyStore();
  return memory.__aetherStore;
}

export function getPolicy(businessId: string): ReminderPolicy {
  const store = getStore();
  if (!store.policies[businessId]) store.policies[businessId] = defaultPolicy(businessId);
  return store.policies[businessId];
}

export function setPolicy(policy: ReminderPolicy) {
  getStore().policies[policy.businessId] = policy;
  return policy;
}

export function getProfile(businessId: string): BusinessProfile {
  const store = getStore();
  if (!store.profiles[businessId]) store.profiles[businessId] = defaultProfile(businessId);
  return store.profiles[businessId];
}

export function setProfile(profile: BusinessProfile) {
  getStore().profiles[profile.businessId] = profile;
  return profile;
}

export function addLog(entry: Omit<ActionLog, "id" | "timestamp"> & { id?: string; timestamp?: string }) {
  const log: ActionLog = {
    id: entry.id ?? crypto.randomUUID(),
    timestamp: entry.timestamp ?? new Date().toISOString(),
    agent: entry.agent,
    agentRunId: entry.agentRunId,
    invoiceId: entry.invoiceId,
    action: entry.action,
    result: entry.result,
  };
  getStore().logs.unshift(log);
  return log;
}

export function recordImport(entry: Omit<DatasetImport, "id" | "importedAt"> & { id?: string; importedAt?: string }) {
  const row: DatasetImport = {
    id: entry.id ?? crypto.randomUUID(),
    importedAt: entry.importedAt ?? new Date().toISOString(),
    businessId: entry.businessId,
    filename: entry.filename,
    kind: entry.kind,
    rowCount: entry.rowCount,
    headers: entry.headers ?? [],
    rows: entry.rows ?? [],
  };
  getStore().imports.unshift(row);
  return row;
}
