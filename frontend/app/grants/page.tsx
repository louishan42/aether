"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/PageHeader";
import { useReload } from "../../lib/useReload";
import { DEMO_SME_PROFILE } from "../../lib/demoProfile";

type Grant = {
  id: string;
  name: string;
  agency: string;
  summary: string;
  checklist?: string[];
  match: { ok: boolean; reason: string; score: number };
};

export default function GrantsPage() {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [profileReady, setProfileReady] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await api.grants();
    setGrants(data.grants);
    setProfileReady(data.profileReady);
  }

  useReload(load, setMessage);

  const fits = grants.filter((grant) => grant.match.ok);
  const rest = grants.filter((grant) => !grant.match.ok);

  async function useDemoProfile() {
    setBusy(true);
    try {
      await api.saveProfile(DEMO_SME_PROFILE);
      await load();
      setMessage("Demo SME profile saved. Fits should show below.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Records"
        title="Grants"
        action={
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" disabled={busy} onClick={() => void useDemoProfile()}>
              Use demo SME profile
            </button>
            <button
              className="btn-primary w-full sm:w-auto"
              disabled={busy || !fits.length}
              onClick={async () => {
                setBusy(true);
                try {
                  const result = await api.analyze("grant");
                  const count = Array.isArray(result?.drafts) ? result.drafts.length : fits.length;
                  setMessage(`${count} grant checklist(s) in Approvals.`);
                  await load();
                } catch (err) {
                  setMessage(err instanceof Error ? err.message : "Could not prepare grant checklists.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Preparing…" : "Prepare checklists"}
            </button>
          </div>
        }
      />

      <section className="panel p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">How grants work</p>
        <p className="mt-2 text-sm">
          Not a CSV. Matching uses the business profile in Settings (industry, headcount, digital tools, exporting). Screening only — not a funding decision. Click Prepare checklists, then approve on Approvals.
        </p>
        <p className="mt-2 text-sm">
          Catalog: <code className="text-xs">agents/catalogs/grants.ts</code>
        </p>
        <Link href="/settings" className="btn-ghost mt-3">
          Open Settings
        </Link>
      </section>

      {!profileReady && (
        <p className="panel p-4 text-sm">
          No fits yet. Click Use demo SME profile, or set industry in Settings.
        </p>
      )}
      {message && <p className="text-sm">{message}</p>}
      <p className="text-sm text-muted">{fits.length} fit · {rest.length} not a fit</p>
      <div className="space-y-3">
        {[...fits, ...rest].map((grant) => (
          <article key={grant.id} className="panel p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-medium tracking-tight">{grant.name}</h2>
                <p className="text-sm text-muted">{grant.agency}</p>
              </div>
              <span className={`text-sm font-semibold ${grant.match.ok ? "accent-text" : "text-muted"}`}>
                {grant.match.ok ? `Fit ${grant.match.score}` : "No fit"}
              </span>
            </div>
            <p className="mt-2 text-sm">{grant.summary}</p>
            <p className="mt-2 text-sm text-muted">{grant.match.reason}</p>
            {grant.match.ok && grant.checklist?.length ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                {grant.checklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
