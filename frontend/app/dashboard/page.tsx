"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { Stats } from "../../lib/types";

const hrefs: Record<string, string> = {
  invoice: "/invoices",
  grant: "/grants",
  customer: "/customers",
  compliance: "/compliance",
  appointment: "/appointments",
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
  const [clock, setClock] = useState("");

  async function load() {
    try {
      setStats(await api.stats());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "API is not running");
    }
  }

  useEffect(() => {
    load();
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted">
            <span className="live-dot" />
            Live desk · {clock || "--:--:--"} SGT
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Overview</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Collections, grants, follow-ups, compliance, and bookings — drafts sit in Approvals until you send them.
          </p>
        </div>
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
          {busy ? "Preparing…" : "Prepare all drafts"}
        </button>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Waiting on you" value={totals?.pendingApprovals ?? 0} />
        <Metric label="Completed" value={totals?.sent ?? 0} />
        <Metric label="Overdue invoices" value={totals?.overdue ?? 0} />
        <Metric label="Grant matches" value={totals?.grantMatches ?? 0} />
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
                <p className="mt-2 text-sm text-muted">{item.readyHint}</p>
              </div>
              <p className="text-3xl font-semibold tabular-nums tracking-tight">{item.records}</p>
            </div>
            <p className="accent-text mt-6 text-xs font-semibold tracking-wide">Open →</p>
          </Link>
        ))}
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
        {!stats?.recentActivity.length && <p className="mt-4 text-sm text-muted">Quiet. Nothing logged yet.</p>}
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
