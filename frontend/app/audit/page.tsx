"use client";

import { useState } from "react";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/PageHeader";
import { useReload } from "../../lib/useReload";
import { DatasetFilter } from "../../components/DatasetFilter";
import { listedDatasets, type DatasetFile } from "../../lib/datasets";
import { useFileView } from "../../lib/fileView";
import { auditForView, type AuditEntry } from "../../lib/actions";

export default function AuditPage() {
  const { view } = useFileView();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [files, setFiles] = useState<DatasetFile[]>([]);
  const [message, setMessage] = useState("");
  const [eventFilter, setEventFilter] = useState<"approved" | "all">("approved");

  async function load() {
    const [audit, records] = await Promise.all([api.audit(), api.records()]);
    setLogs(audit.logs);
    setFiles(listedDatasets(records));
    setMessage(audit.logs.length ? "" : "No audit entries yet. Approve a draft to write DRAFT_APPROVED.");
  }

  useReload(load, setMessage);

  const visible = auditForView(logs, view, files).filter((row) =>
    eventFilter === "approved" ? row.eventType === "DRAFT_APPROVED" : true,
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Workspace" title="Audit" />
      {message && <p className="text-sm">{message}</p>}
      <DatasetFilter files={files} hasManual={logs.some((row) => row.sourceImportId === "manual")} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className={eventFilter === "approved" ? "chip-on min-h-11 px-3 py-2 text-sm" : "btn-ghost text-sm"} onClick={() => setEventFilter("approved")}>
          DRAFT_APPROVED
        </button>
        <button type="button" className={eventFilter === "all" ? "chip-on min-h-11 px-3 py-2 text-sm" : "btn-ghost text-sm"} onClick={() => setEventFilter("all")}>
          All events
        </button>
      </div>

      <section className="panel table-wrap">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-paper text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Event</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Dataset</th>
              <th className="px-4 py-3 font-medium">Detail</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={6}>
                  No audit rows in this dataset view.
                </td>
              </tr>
            )}
            {visible.map((row) => (
              <tr key={row.id} className="border-t border-edge">
                <td className="px-4 py-3 whitespace-nowrap">{new Date(row.timestamp).toLocaleString("en-SG")}</td>
                <td className="px-4 py-3">{row.eventType}</td>
                <td className="px-4 py-3">{row.status || "—"}</td>
                <td className="px-4 py-3">{row.userId || "—"}</td>
                <td className="px-4 py-3">{row.datasetName || "—"}</td>
                <td className="px-4 py-3">{row.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
