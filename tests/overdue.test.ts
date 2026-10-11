import { describe, expect, it } from "vitest";
import { isEligible } from "../backend/src/services/overdue.js";
import type { Invoice, ReminderPolicy } from "../backend/src/types.js";

const policy: ReminderPolicy = {
  businessId: "demo-business",
  minimumOverdueDays: 1,
  maxReminders: 3,
  cooldownDays: 7,
  customerFollowUpDays: 14,
  appointmentReminderHours: 24,
};

function invoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
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
    ...overrides,
  };
}

describe("eligibility", () => {
  it("excludes paid invoices", () => {
    expect(isEligible(invoice({ status: "paid" }), policy).ok).toBe(false);
  });

  it("excludes disputed invoices", () => {
    expect(isEligible(invoice({ status: "disputed" }), policy).ok).toBe(false);
  });

  it("includes old unpaid invoices", () => {
    expect(isEligible(invoice(), policy).ok).toBe(true);
  });
});
