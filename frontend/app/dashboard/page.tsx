"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { Stats } from "../../lib/types";
import { useReload } from "../../lib/useReload";
import { BarChart, PieChart } from "../../components/Charts";
import { exportLockedReport } from "../../lib/exportReport";

const hrefs: Record<string, string> = {
  invoice: "/invoices",
  grant: "/grants",
  customer: "/customers",
  compliance: "/compliance",
  appointment: "/appointments",
};

const kindHref: Record<string, string> = {
  invoices: "/invoices",
  customers: "/customers",
  appointments: "/appointments",
  custom: "/datasets",
};

function Metric({ label, value }: { label: string; value: number }) {
  const width = Math.min(100, 12 + value * 8);
  return (
    <div className="panel relative overflow-hidden p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums">{value}</p>
      <div className="bar-track mt-4">
        <div className="bar-fill" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [password, setPassword] = useState("");
  const [clock, setClock] = useState("");

  async function load() {
    try {
      setStats(await api.stats());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "API is not running");
    }
  }

  useReload(load, setError);

  useEffect(() => {
    const tick = () =>
      setClock(
        new Intl.DateTimeFormat("en-SG", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: "Asia/Singapore",
        }).format(new Date()),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const totals = stats?.totals;
  const files = stats?.datasets ?? [];
  const fileCount = totals?.files ?? files.length;
  const charts = stats?.charts ?? {
    invoicesByStatus: [{ label: "Unpaid", value: totals?.invoices ?? 0 }],
    filesByKind: [
      { label: "Invoices", value: totals?.invoiceFiles ?? 0 },
      { label: "Customers", value: totals?.customerFiles ?? 0 },
      { label: "Bookings", value: totals?.appointmentFiles ?? 0 },
      { label: "Custom", value: totals?.customFiles ?? 0 },
    ],
    draftsByAgent: stats?.agents.map((item) => ({ label: item.name, value: item.records })) ?? [],
    bookingsByStatus: [{ label: "Bookings", value: totals?.appointments ?? 0 }],
    grantsFit: [
      { label: "Fit", value: totals?.grantMatches ?? 0 },
      { label: "Gaps", value: totals?.complianceGaps ?? 0 },
    ],
    complianceEvidence: [{ label: "Gaps", value: totals?.complianceGaps ?? 0 }],
    agentLoad: stats?.agents.map((item) => ({ label: item.name, value: item.records })) ?? [],
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted">
            <span className="live-dot" />
            Live desk · {clock || "--:--:--"} SGT
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Overview</h1>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto">
          <button
            className="btn-primary w-full sm:w-auto"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api.analyze("all");
                await load();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not prepare drafts");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Preparing…" : "Prepare record drafts"}
          </button>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!stats || password.trim().length < 4) {
                setError("Set a password of at least 4 characters to export.");
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
            <button className="btn-ink" type="submit" disabled={exporting || !stats}>
              {exporting ? "Exporting…" : "Export locked PDF"}
            </button>
          </form>
        </div>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Waiting to send" value={totals?.pendingApprovals ?? 0} />
        <Metric label="Checklists waiting" value={totals?.pendingChecklists ?? 0} />
        <Metric label="Overdue invoices" value={totals?.overdue ?? 0} />
        <Metric label="Grant matches" value={totals?.grantMatches ?? 0} />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Dataset files" value={fileCount} />
        <Metric label="Rows in files" value={totals?.fileRows ?? 0} />
        <Metric label="Customers" value={totals?.customers ?? 0} />
        <Metric label="Bookings" value={totals?.appointments ?? 0} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium tracking-tight">Agent analysis</h2>
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
      </section>

      <section className="grid gap-3 md:grid-cols-6">
        {stats?.agents.map((item, index) => (
          <Link
            key={item.id}
            href={hrefs[item.id]}
            className={`panel group p-5 ${index === 0 ? "md:col-span-4" : "md:col-span-2"}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="accent-text text-[11px] font-semibold uppercase tracking-[0.14em]">{item.id}</p>
                <h2 className="mt-2 text-xl font-medium tracking-tight">{item.name}</h2>
              </div>
              <p className="text-3xl font-semibold tabular-nums tracking-tight">{item.records}</p>
            </div>
            <p className="accent-text mt-6 text-xs font-semibold tracking-wide">Open →</p>
          </Link>
        ))}
      </section>

      <section className="panel overflow-hidden p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-medium tracking-tight">Current datasets</h2>
          </div>
          <Link href="/datasets" className="accent-text text-sm font-semibold hover:underline">
            Manage files
          </Link>
        </div>
        {files.length === 0 && <p className="mt-4 text-sm text-muted">No files.</p>}
        {files.length > 0 && (
          <ul className="mt-4 divide-y divide-edge">
            {files.slice(0, 12).map((file) => (
              <li key={file.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <Link href={kindHref[file.kind] ?? "/datasets"} className="font-medium hover:underline">
                  {file.filename}
                </Link>
                <span className="text-muted">
                  {file.kind} · {file.rowCount} rows
                </span>
              </li>
            ))}
          </ul>
        )}
        {files.length > 12 && (
          <p className="mt-3 text-sm text-muted">
            {files.length - 12} more on{" "}
            <Link href="/datasets" className="accent-text font-semibold hover:underline">
              Datasets
            </Link>
            .
          </p>
        )}
      </section>

      <section className="panel overflow-hidden p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="live-dot" />
            <h2 className="font-medium tracking-tight">Activity stream</h2>
          </div>
          <Link href="/datasets" className="accent-text text-sm font-semibold hover:underline">
            Load datasets
          </Link>
        </div>
        {!stats?.recentActivity.length && <p className="mt-4 text-sm text-muted">No activity.</p>}
        <ul className="mt-4 space-y-0 font-mono text-[13px]">
          {stats?.recentActivity.map((item) => (
            <li key={item.id} className="flex flex-col gap-1 border-t border-edge py-2.5 sm:flex-row sm:justify-between sm:gap-4">
              <span className="break-all">
                <span className="accent-text font-semibold">{item.action}</span> {item.result}
              </span>
              <span className="shrink-0 text-muted">{new Date(item.timestamp).toLocaleTimeString()}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
