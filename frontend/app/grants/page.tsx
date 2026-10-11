"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/PageHeader";
import { useReload } from "../../lib/useReload";
import { DatasetFilter } from "../../components/DatasetFilter";

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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Records"
        title="Grants"
        action={
          <button
            className="btn-primary w-full sm:w-auto"
            disabled={busy || !fits.length}
            onClick={async () => {
              setBusy(true);
              try {
                const result = await api.analyze("grant");
                const count = Array.isArray(result?.drafts) ? result.drafts.length : fits.length;
                setMessage(`${count} in Approvals.`);
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
        }
      />
      <DatasetFilter />
      <p className="text-sm text-muted">Grants use industry in Settings, not a CSV.</p>
      {!profileReady && (
        <p className="panel p-4 text-sm">
          Set industry in{" "}
          <Link href="/settings" className="accent-text font-semibold hover:underline">
            Settings
          </Link>
          .
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
