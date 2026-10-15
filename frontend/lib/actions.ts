import type { DatasetFile, FileView } from "./datasets";
import { rowsForView } from "./datasets";

export type AuditEntry = {
  id: string;
  timestamp: string;
  eventType: string;
  userId: string;
  businessId: string;
  status: string;
  sourceImportId?: string | null;
  datasetName?: string;
  agent?: string;
  result?: string;
};

export function auditForView(entries: AuditEntry[], view: FileView, files: DatasetFile[] = []) {
  return entries.filter((entry) => {
    if (entry.eventType === "DRAFT_APPROVED" && (entry.datasetName === "Settings" || entry.agent === "grant" || entry.agent === "compliance")) {
      return view === "all" || view === "manual";
    }
    return rowsForView([{ sourceImportId: entry.sourceImportId }], view, files).length > 0;
  });
}
