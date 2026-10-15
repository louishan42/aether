import type { AgentKind } from "../types.js";
import { addLog, getStore } from "./store.js";

export function datasetForRecord(businessId: string, agent: AgentKind, recordId: string) {
  const store = getStore();
  let sourceImportId: string | null = null;
  if (agent === "invoice") {
    sourceImportId = store.invoices.find((row) => row.businessId === businessId && row.id === recordId)?.sourceImportId ?? null;
  } else if (agent === "customer") {
    sourceImportId = store.customers.find((row) => row.businessId === businessId && row.id === recordId)?.sourceImportId ?? null;
  } else if (agent === "appointment") {
    sourceImportId = store.appointments.find((row) => row.businessId === businessId && row.id === recordId)?.sourceImportId ?? null;
  } else {
    return { sourceImportId: null, datasetName: "Settings" };
  }
  if (sourceImportId === "manual") return { sourceImportId: "manual", datasetName: "Manual" };
  if (!sourceImportId) return { sourceImportId: null, datasetName: "" };
  const file = store.imports.find((row) => row.id === sourceImportId);
  return { sourceImportId, datasetName: file?.filename ?? "Unknown file" };
}

export function logDraftApproved(input: {
  businessId: string;
  userId: string;
  agent: AgentKind;
  recordId: string;
  draftId: string;
  status?: string;
}) {
  const dataset = datasetForRecord(input.businessId, input.agent, input.recordId);
  const status = input.status ?? "approved";
  return addLog({
    agent: input.agent,
    agentRunId: null,
    invoiceId: input.recordId,
    action: "DRAFT_APPROVED",
    eventType: "DRAFT_APPROVED",
    userId: input.userId,
    businessId: input.businessId,
    status,
    sourceImportId: dataset.sourceImportId,
    datasetName: dataset.datasetName,
    result: `${input.userId} approved ${input.draftId}${dataset.datasetName ? ` · ${dataset.datasetName}` : ""}`,
  });
}
