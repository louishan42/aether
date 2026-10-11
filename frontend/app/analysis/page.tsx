"use client";

import { useState } from "react";
import { api } from "../../lib/api";
import type { Stats } from "../../lib/types";
import { useReload } from "../../lib/useReload";
import { BarChart, PieChart } from "../../components/Charts";
import { chartsFromStats } from "../../lib/chartsFromStats";
import { exportLockedReport } from "../../lib/exportReport";
import { PageHeader } from "../../components/PageHeader";

export default function AnalysisPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [password, setPassword] = useState("");

  async function load() {
    setStats(await api.stats());
  }

  useReload(load, setError);
  const charts = chartsFromStats(stats);
  const totals = stats?.totals;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Analysis"
        action={
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!stats || password.trim().length < 4) {
                setError("Password needs 4+ characters.");
                return;
              }
              setExporting(true);
              try {
                await exportLockedReport(stats, password.trim());
                setError("");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Export failed");
              } finally {
                setExporting(false);
              }
            }}
          >
            <input
              className="field"
              type="password"
              autoComplete="new-password"
              placeholder="PDF password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button className="btn-teal" type="submit" disabled={exporting || !stats}>
              {exporting ? "Exporting…" : "Export locked PDF"}
            </button>
          </form>
        }
      />

      {error && <p className="text-sm text-red-700">{error}</p>}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Invoices", totals?.invoices ?? 0],
          ["Overdue", totals?.overdue ?? 0],
          ["Customers", totals?.customers ?? 0],
          ["Bookings", totals?.appointments ?? 0],
          ["Files", totals?.files ?? 0],
          ["Grant fits", totals?.grantMatches ?? 0],
          ["Gaps", totals?.complianceGaps ?? 0],
          ["Drafts waiting", (totals?.pendingApprovals ?? 0) + (totals?.pendingChecklists ?? 0)],
        ].map(([label, value]) => (
          <div key={String(label)} className="panel p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-3 lg:grid-cols-3">
        <PieChart title="Drafts by agent" slices={charts.draftsByAgent} />
        <PieChart title="Invoices by status" slices={charts.invoicesByStatus} />
        <PieChart title="Files by kind" slices={charts.filesByKind} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <BarChart title="Agent load" slices={charts.agentLoad} />
        <PieChart title="Grant fit" slices={charts.grantsFit} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <PieChart title="Bookings" slices={charts.bookingsByStatus} />
        <PieChart title="Compliance evidence" slices={charts.complianceEvidence} />
      </div>
    </div>
  );
}
