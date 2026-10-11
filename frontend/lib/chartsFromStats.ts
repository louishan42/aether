import type { Stats } from "./types";

export function chartsFromStats(stats: Stats | null) {
  if (stats?.charts) return stats.charts;
  const totals = stats?.totals;
  const agents = stats?.agents ?? [];
  return {
    invoicesByStatus: [{ label: "Unpaid", value: totals?.invoices ?? 0 }],
    filesByKind: [
      { label: "Invoices", value: totals?.invoiceFiles ?? 0 },
      { label: "Customers", value: totals?.customerFiles ?? 0 },
      { label: "Bookings", value: totals?.appointmentFiles ?? 0 },
      { label: "Custom", value: totals?.customFiles ?? 0 },
    ],
    draftsByAgent: agents.map((item) => ({ label: item.name, value: item.records })),
    bookingsByStatus: [{ label: "Bookings", value: totals?.appointments ?? 0 }],
    grantsFit: [{ label: "Fit", value: totals?.grantMatches ?? 0 }],
    complianceEvidence: [{ label: "Gaps", value: totals?.complianceGaps ?? 0 }],
    agentLoad: agents.map((item) => ({ label: item.name, value: item.records })),
  };
}
