import { getPolicy, getStore } from "../../backend/src/services/store.js";
import { isEligible } from "../../backend/src/services/overdue.js";
import { sendReminderEmail } from "../../backend/src/services/email.js";
import type { AgentDraft, AgentKind } from "../../backend/src/types.js";

export function createTools(businessId: string) {
  return {
    get_overdue_invoices() {
      const store = getStore();
      const policy = getPolicy(businessId);
      return store.invoices
        .filter((invoice) => invoice.businessId === businessId)
        .map((invoice) => ({ invoice, eligibility: isEligible(invoice, policy) }))
        .filter((row) => row.eligibility.ok)
        .map((row) => row.invoice);
    },

    get_customer_history(invoiceId: string) {
      const store = getStore();
      const invoice = store.invoices.find((row) => row.id === invoiceId && row.businessId === businessId);
      if (!invoice) return null;
      return {
        reminderCount: invoice.reminderCount,
        lastReminderAt: invoice.lastReminderAt,
        status: invoice.status,
      };
    },

    get_reminder_policy() {
      return getPolicy(businessId);
    },

    create_draft(input: {
      agent: AgentKind;
      recordId: string;
      subject: string;
      body: string;
      rationale: string;
    }) {
      const store = getStore();
      const draft: AgentDraft = {
        id: crypto.randomUUID(),
        businessId,
        agent: input.agent,
        recordId: input.recordId,
        invoiceId: input.recordId,
        subject: input.subject,
        body: input.body,
        rationale: input.rationale,
        status: "pending",
        generatedAt: new Date().toISOString(),
      };
      store.drafts.unshift(draft);
      return draft;
    },

    create_reminder_draft(input: Omit<AgentDraft, "id" | "generatedAt" | "status" | "agent" | "recordId"> & { invoiceId: string }) {
      return this.create_draft({
        agent: "invoice",
        recordId: input.invoiceId,
        subject: input.subject,
        body: input.body,
        rationale: input.rationale,
      });
    },

    get_approval_status(draftId: string) {
      const store = getStore();
      const draft = store.drafts.find((row) => row.id === draftId);
      return draft?.status ?? "missing";
    },

    async execute_approved_draft(draftId: string) {
      const store = getStore();
      const draft = store.drafts.find((row) => row.id === draftId && (!row.businessId || row.businessId === businessId));
      if (!draft) throw new Error("draft not found");
      if (draft.status !== "approved") throw new Error("draft is not approved");

      if (draft.agent === "invoice") {
        const invoice = store.invoices.find((row) => row.id === draft.recordId && row.businessId === businessId);
        if (!invoice) throw new Error("invoice not found for tenant");
        const result = await sendReminderEmail({ to: invoice.customerEmail, subject: draft.subject, body: draft.body });
        if (result.sent) {
          draft.status = "sent";
          invoice.reminderCount += 1;
          invoice.lastReminderAt = new Date().toISOString();
        }
        return result;
      }

      if (draft.agent === "customer") {
        const customer = store.customers.find((row) => row.id === draft.recordId && row.businessId === businessId);
        if (!customer) throw new Error("customer not found for tenant");
        const result = await sendReminderEmail({ to: customer.email, subject: draft.subject, body: draft.body });
        if (result.sent) {
          draft.status = "sent";
          customer.followUpCount += 1;
          customer.lastContactAt = new Date().toISOString();
        }
        return result;
      }

      if (draft.agent === "appointment") {
        const appointment = store.appointments.find((row) => row.id === draft.recordId && row.businessId === businessId);
        if (!appointment) throw new Error("appointment not found for tenant");
        if (appointment.status === "cancelled") throw new Error("cannot remind a cancelled booking");
        const result = await sendReminderEmail({ to: appointment.customerEmail, subject: draft.subject, body: draft.body });
        if (result.sent) {
          draft.status = "sent";
          appointment.reminderCount += 1;
        }
        return result;
      }

      if (draft.agent === "compliance") {
        const existing = store.evidence.find((row) => row.businessId === businessId && row.requirementId === draft.recordId);
        if (existing) existing.status = "submitted";
        else {
          store.evidence.unshift({
            id: crypto.randomUUID(),
            businessId,
            requirementId: draft.recordId,
            status: "submitted",
            note: "Owner approved screening checklist",
          });
        }
        draft.status = "completed";
        return { sent: false, detail: `compliance gap ${draft.recordId} marked submitted` };
      }

      draft.status = "completed";
      return { sent: false, detail: `${draft.agent} checklist stored after approval` };
    },

    async send_approved_reminder(draftId: string) {
      return this.execute_approved_draft(draftId);
    },
  };
}
