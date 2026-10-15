export type AgentKind = "invoice" | "grant" | "customer" | "compliance" | "appointment";
export type InvoiceStatus = "unpaid" | "paid" | "disputed";
export type DraftStatus = "pending" | "approved" | "rejected" | "sent" | "completed";

export type Invoice = {
  id: string;
  businessId: string;
  customerId: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  amountSgd: number;
  dueDate: string;
  status: InvoiceStatus;
  reminderCount: number;
  lastReminderAt: string | null;
  sourceImportId: string | null;
};

export type FollowUpCustomer = {
  id: string;
  businessId: string;
  name: string;
  email: string;
  lastContactAt: string | null;
  notes: string;
  followUpCount: number;
  sourceImportId: string | null;
};

export type Appointment = {
  id: string;
  businessId: string;
  customerName: string;
  customerEmail: string;
  startsAt: string;
  status: "booked" | "cancelled" | "completed";
  reminderCount: number;
  sourceImportId: string | null;
};

export type ComplianceEvidence = {
  id: string;
  businessId: string;
  requirementId: string;
  status: "missing" | "submitted" | "waived";
  note: string;
};

export type BusinessProfile = {
  businessId: string;
  name: string;
  industry: string;
  employeeCount: number;
  annualRevenueSgd: number;
  isExporting: boolean;
  usesDigitalTools: boolean;
  hasGstRegistration: boolean;
};

export type AgentDraft = {
  id: string;
  agent: AgentKind;
  recordId: string;
  invoiceId: string;
  subject: string;
  body: string;
  status: DraftStatus;
  generatedAt: string;
  rationale: string;
};

export type ActionLog = {
  id: string;
  agent: AgentKind | "system";
  agentRunId: string | null;
  invoiceId: string | null;
  action: string;
  result: string;
  timestamp: string;
  eventType: string;
  userId: string;
  businessId: string;
  status: string;
  sourceImportId: string | null;
  datasetName: string;
};

export type ReminderPolicy = {
  businessId: string;
  minimumOverdueDays: number;
  maxReminders: number;
  cooldownDays: number;
  customerFollowUpDays: number;
  appointmentReminderHours: number;
};

export type AgentRun = {
  id: string;
  businessId: string;
  agent: AgentKind;
  startedAt: string;
  completedAt: string | null;
  status: "running" | "completed" | "failed";
};

export type ReminderDraft = AgentDraft;

export type DatasetImport = {
  id: string;
  businessId: string;
  filename: string;
  kind: "invoices" | "customers" | "appointments" | "custom";
  rowCount: number;
  importedAt: string;
  headers: string[];
  rows: Record<string, string>[];
};
