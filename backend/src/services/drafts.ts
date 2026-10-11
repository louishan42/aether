import type { AgentKind } from "../types.js";
import { getStore } from "./store.js";

const SEND_AGENTS: AgentKind[] = ["invoice", "customer", "appointment"];
const CHECKLIST_AGENTS: AgentKind[] = ["grant", "compliance"];

export function draftInTenant(businessId: string, recordId: string, agent: AgentKind) {
  const store = getStore();
  if (agent === "invoice") return store.invoices.some((row) => row.id === recordId && row.businessId === businessId);
  if (agent === "customer") return store.customers.some((row) => row.id === recordId && row.businessId === businessId);
  if (agent === "appointment") return store.appointments.some((row) => row.id === recordId && row.businessId === businessId);
  if (agent === "grant" || agent === "compliance") return true;
  return false;
}

export function openDrafts(businessId: string) {
  const store = getStore();
  return store.drafts
    .filter((draft) => (draft.status === "pending" || draft.status === "approved") && draftInTenant(businessId, draft.recordId, draft.agent))
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
    (draft) => draft.status === "pending" && draftInTenant(businessId, draft.recordId, draft.agent),
  );
  const sent = store.drafts.filter(
    (draft) =>
      (draft.status === "sent" || draft.status === "completed") && draftInTenant(businessId, draft.recordId, draft.agent),
  );
  return {
    pendingSend: pending.filter((draft) => SEND_AGENTS.includes(draft.agent)).length,
    pendingChecklists: pending.filter((draft) => CHECKLIST_AGENTS.includes(draft.agent)).length,
    pendingApprovals: pending.length,
    sent: sent.length,
  };
}
