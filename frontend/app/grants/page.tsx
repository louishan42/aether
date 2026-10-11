"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/PageHeader";

type Grant = {
  id: string;
  name: string;
  agency: string;
  summary: string;
  match: { ok: boolean; reason: string; score: number };
};

export default function GrantsPage() {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [profileReady, setProfileReady] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const data = await api.grants();
    setGrants(data.grants);
    setProfileReady(data.profileReady);
  }

  useEffect(() => {
    load().catch((err) => setMessage(err.message));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Records"
        title="Grants"
        description="Matches your business profile to a Singapore grant catalog. This is a shortlist, not a funding decision."
        action={
          <button
            className="btn-primary w-full sm:w-auto"
            onClick={async () => {
              await api.analyze("grant");
              setMessage("Checklists are waiting in Approvals.");
              await load();
            }}
          >
            Prepare checklists
          </button>
        }
      />
      {!profileReady && <p className="panel p-4 text-sm">Set industry and size in Settings so matching is useful.</p>}
      {message && <p className="text-sm">{message}</p>}
      <div className="space-y-3">
        {grants.map((grant) => (
          <article key={grant.id} className="panel p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-medium tracking-tight">{grant.name}</h2>
                <p className="text-sm text-muted">{grant.agency}</p>
              </div>
              <span className="text-sm">{grant.match.ok ? `Fit ${grant.match.score}` : "No fit"}</span>
            </div>
            <p className="mt-2 text-sm">{grant.summary}</p>
            <p className="mt-2 text-sm text-muted">{grant.match.reason}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
