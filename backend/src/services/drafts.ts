import type { AgentKind } from "../types.js";
import { getStore } from "./store.js";

const SEND_AGENTS: AgentKind[] = ["invoice", "customer", "appointment"];
const CHECKLIST_AGENTS: AgentKind[] = ["grant", "compliance"];

export function draftInTenant(businessId: string, recordId: string, agent: AgentKind) {
  const store = getStore();
  if (agent === "invoice") return store.invoices.some((row) => row.id === recordId && row.businessId === businessId);
  if (agent === "customer") return store.customers.some((row) => row.id === recordId && row.businessId === businessId);
  if (agent === "appointment") return store.appointments.some((row) => row.id === recordId && row.businessId === businessId);
  if (agent === "grant" || agent === "compliance") {
    return store.drafts.some((draft) => draft.recordId === recordId && draft.agent === agent && draft.businessId === businessId);
  }
  return false;
}

export function draftBelongsToTenant(businessId: string, draft: { businessId?: string; recordId: string; agent: AgentKind }) {
  if (draft.businessId) return draft.businessId === businessId;
  return draftInTenant(businessId, draft.recordId, draft.agent);
}

export function openDrafts(businessId: string) {
  const store = getStore();
  return store.drafts
    .filter((draft) => (draft.status === "pending" || draft.status === "approved") && draftBelongsToTenant(businessId, draft))
    .map((draft) => ({
      ...draft,
      invoice: store.invoices.find((invoice) => invoice.id === draft.recordId),
      customer: store.customers.find((row) => row.id === draft.recordId),
      appointment: store.appointments.find((row) => row.id === draft.recordId),
    }));
}

export function draftBuckets(businessId: string) {
  const store = getStore();
  const pending = store.drafts.filter(
    (draft) => draft.status === "pending" && draftBelongsToTenant(businessId, draft),
  );
  const sent = store.drafts.filter(
    (draft) =>
      (draft.status === "sent" || draft.status === "completed") && draftBelongsToTenant(businessId, draft),
  );
  return {
    pendingSend: pending.filter((draft) => SEND_AGENTS.includes(draft.agent)).length,
    pendingChecklists: pending.filter((draft) => CHECKLIST_AGENTS.includes(draft.agent)).length,
    pendingApprovals: pending.length,
    sent: sent.length,
  };
}
