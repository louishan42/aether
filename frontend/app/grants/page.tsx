"use client";

import { useState } from "react";
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
  const [busy, setBusy] = useState<"profile" | "prepare" | null>(null);

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
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-ghost"
              disabled={busy !== null}
              onClick={async () => {
                setBusy("profile");
                try {
                  await api.saveProfile(DEMO_SME_PROFILE);
                  await load();
                  setMessage("Demo SME profile saved.");
                } catch (err) {
                  setMessage(err instanceof Error ? err.message : "Could not save profile.");
                } finally {
                  setBusy(null);
                }
              }}
            >
              {busy === "profile" ? "Saving…" : "Use demo SME profile"}
            </button>
            <button
              className="btn-primary w-full sm:w-auto"
              disabled={busy !== null || !fits.length}
              onClick={async () => {
                setBusy("prepare");
                try {
                  const result = await api.analyze("grant");
                  const count = Array.isArray(result?.drafts) ? result.drafts.length : fits.length;
                  setMessage(`${count} grant checklist(s) in Approvals.`);
                  await load();
                } catch (err) {
                  setMessage(err instanceof Error ? err.message : "Could not prepare grant checklists.");
                } finally {
                  setBusy(null);
                }
              }}
            >
              {busy === "prepare" ? "Preparing…" : "Prepare checklists"}
            </button>
          </div>
        }
      />

      {message && <p className="text-sm">{message}</p>}
      {!profileReady || grants.length === 0 ? (
        <p className="text-sm text-muted">None yet.</p>
      ) : (
        <>
          <p className="text-sm text-muted">
            {fits.length} fit · {rest.length} not a fit
          </p>
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
        </>
      )}
    </div>
  );
}
