export type AgentId = "invoice" | "grant" | "customer" | "compliance" | "appointment";

export type Invoice = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  amountSgd: number;
  dueDate: string;
  status: "unpaid" | "paid" | "disputed";
  reminderCount: number;
  reason?: string;
  sourceImportId?: string | null;
};

export type Draft = {
  id: string;
  agent: AgentId;
  recordId: string;
  invoiceId: string;
  subject: string;
  body: string;
  status: string;
  rationale: string;
  generatedAt: string;
  invoice?: Invoice;
  customer?: { name: string; email: string };
  appointment?: { customerName: string; startsAt: string };
};

export type AgentCard = {
  id: AgentId;
  name: string;
  records: number;
  readyHint: string;
};

export type BusinessProfile = {
  name: string;
  industry: string;
  employeeCount: number;
  annualRevenueSgd: number;
  isExporting: boolean;
  usesDigitalTools: boolean;
  hasGstRegistration: boolean;
};

export type Stats = {
  datasetReady: boolean;
  profileReady: boolean;
  totals: {
    invoices: number;
    overdue: number;
    overdueAmount: number;
    pendingApprovals: number;
    pendingChecklists?: number;
    sent: number;
    customers: number;
    appointments: number;
    grantMatches: number;
    complianceGaps: number;
    files?: number;
    fileRows?: number;
    invoiceFiles?: number;
    customerFiles?: number;
    appointmentFiles?: number;
    customFiles?: number;
  };
  datasets?: { id: string; filename: string; kind: string; rowCount: number; importedAt: string }[];
  charts?: {
    invoicesByStatus: { label: string; value: number }[];
    filesByKind: { label: string; value: number }[];
    draftsByAgent: { label: string; value: number }[];
    bookingsByStatus: { label: string; value: number }[];
    grantsFit: { label: string; value: number }[];
    complianceEvidence: { label: string; value: number }[];
    agentLoad: { label: string; value: number }[];
  };
  agents: AgentCard[];
  recentActivity: { id: string; action: string; result: string; timestamp: string; agent?: string }[];
  policy: {
    minimumOverdueDays: number;
    maxReminders: number;
    cooldownDays: number;
    customerFollowUpDays: number;
    appointmentReminderHours: number;
  };
  profile: BusinessProfile;
};
