import { describe, expect, it } from "vitest";
import { GRANT_CATALOG } from "../agents/catalogs/grants.js";
import { COMPLIANCE_CATALOG } from "../agents/catalogs/compliance.js";
import { isEligible } from "../backend/src/services/overdue.js";
import type { Invoice, ReminderPolicy } from "../backend/src/types.js";

const exportingSoftware = {
  industry: "software",
  employeeCount: 8,
  isExporting: true,
  usesDigitalTools: true,
};

describe("grant catalog", () => {
  it("matches MRA for exporters", () => {
    const mra = GRANT_CATALOG.find((g) => g.id === "mra");
    expect(mra?.match(exportingSoftware).ok).toBe(true);
  });

  it("does not match MRA when not exporting", () => {
    const mra = GRANT_CATALOG.find((g) => g.id === "mra");
    expect(mra?.match({ ...exportingSoftware, isExporting: false }).ok).toBe(false);
  });
});

describe("compliance catalog", () => {
  it("always includes PDPA", () => {
    const profile = { annualRevenueSgd: 0, hasGstRegistration: false, employeeCount: 0 };
    expect(COMPLIANCE_CATALOG.filter((item) => item.appliesWhen(profile)).some((item) => item.framework === "PDPA")).toBe(true);
  });

  it("flags GST above threshold", () => {
    const gst = COMPLIANCE_CATALOG.find((item) => item.id === "gst-threshold");
    expect(gst?.appliesWhen({ annualRevenueSgd: 1_200_000, hasGstRegistration: false, employeeCount: 2 })).toBe(true);
    expect(gst?.appliesWhen({ annualRevenueSgd: 200_000, hasGstRegistration: false, employeeCount: 2 })).toBe(false);
  });
});

describe("invoice eligibility", () => {
  const policy: ReminderPolicy = {
    businessId: "demo-business",
    minimumOverdueDays: 1,
    maxReminders: 3,
    cooldownDays: 7,
    customerFollowUpDays: 14,
    appointmentReminderHours: 24,
  };

  const invoice: Invoice = {
    id: "1",
    businessId: "demo-business",
    customerId: "c1",
    invoiceNumber: "INV-1",
    customerName: "Demo",
    customerEmail: "demo@example.com",
    amountSgd: 100,
    dueDate: "2020-01-01T00:00:00.000Z",
    status: "unpaid",
    reminderCount: 0,
    lastReminderAt: null,
    sourceImportId: null,
  };

  it("keeps paid invoices out", () => {
    expect(isEligible({ ...invoice, status: "paid" }, policy).ok).toBe(false);
  });
});
