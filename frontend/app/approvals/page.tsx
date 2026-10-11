"use client";

import { useMemo, useState } from "react";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/PageHeader";
import type { AgentId, Draft } from "../../lib/types";
import { useReload } from "../../lib/useReload";
import { DatasetFilter } from "../../components/DatasetFilter";
import { rowsForView } from "../../lib/datasets";
import { useFileView } from "../../lib/fileView";

const filters: (AgentId | "all")[] = ["all", "invoice", "grant", "customer", "compliance", "appointment"];

const executeLabel: Record<AgentId, string> = {
  invoice: "Send reminder",
  customer: "Send follow-up",
  appointment: "Send booking reminder",
  grant: "Save checklist",
  compliance: "Record review",
};

export default function ApprovalsPage() {
  const { view } = useFileView();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [filter, setFilter] = useState<AgentId | "all">("all");
  const [message, setMessage] = useState("");

  async function load() {
    const data = await api.pending();
    setDrafts(data.drafts);
    setMessage(data.drafts.length ? "" : "Nothing waiting.");
  }

  useReload(load, setMessage);

  const visible = useMemo(() => {
    const byFile = drafts.filter((draft) => {
      const sid =
        draft.invoice?.sourceImportId ??
        (draft.customer as { sourceImportId?: string } | undefined)?.sourceImportId ??
        (draft.appointment as { sourceImportId?: string } | undefined)?.sourceImportId ??
        null;
      if (view !== "all" && (draft.agent === "grant" || draft.agent === "compliance")) return false;
      if (view === "all") return true;
      return rowsForView([{ sourceImportId: sid }], view).length > 0;
    });
    return filter === "all" ? byFile : byFile.filter((draft) => draft.agent === filter);
  }, [drafts, filter, view]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Approvals"
      />
      <DatasetFilter />
      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={`min-h-11 px-3 py-2 text-sm ${filter === item ? "chip-on" : "btn-ghost"}`}
          >
            {item}
            {item === "all"
              ? ` (${drafts.length})`
              : ` (${drafts.filter((draft) => draft.agent === item).length})`}
          </button>
        ))}
      </div>
      {message && <p className="text-sm">{message}</p>}
      {visible.length === 0 && <div className="panel p-6 text-sm text-muted">No drafts in this filter.</div>}
      <div className="space-y-4">
        {visible.map((draft) => (
          <article key={draft.id} className="panel p-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">
              {draft.agent}
              {draft.invoice?.invoiceNumber ? ` · ${draft.invoice.invoiceNumber}` : ""}
              {draft.customer?.name ? ` · ${draft.customer.name}` : ""}
              {draft.appointment?.customerName ? ` · ${draft.appointment.customerName}` : ""}
            </p>
            <h2 className="mt-1 text-lg font-medium tracking-tight">{draft.subject}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm">{draft.body}</p>
            <p className="mt-3 text-sm text-muted">{draft.rationale}</p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-muted">Status: {draft.status}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {draft.status === "pending" && (
                <>
                  <button onClick={() => api.decide(draft.id, "approved").then(load)} className="btn-primary">
                    Approve
                  </button>
                  <button onClick={() => api.decide(draft.id, "rejected").then(load)} className="btn-ghost">
                    Reject
                  </button>
                </>
              )}
              {draft.status === "approved" && (
                <button
                  onClick={async () => {
                    const result = await api.send(draft.id);
                    setMessage(result.detail);
                    await load();
                  }}
                  className="btn-ink"
                >
                  {executeLabel[draft.agent]}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
