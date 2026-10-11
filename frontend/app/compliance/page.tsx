"use client";

import { useState } from "react";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/PageHeader";
import { useReload } from "../../lib/useReload";
import { DEMO_SME_PROFILE } from "../../lib/demoProfile";

type Requirement = {
  id: string;
  framework: string;
  title: string;
  summary: string;
  applies: boolean;
  evidenceStatus: string;
};

export default function CompliancePage() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"profile" | "review" | string | null>(null);

  async function load() {
    setRequirements((await api.compliance()).requirements);
  }

  useReload(load, setMessage);

  const gaps = requirements.filter((item) => item.applies && item.evidenceStatus === "missing");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Records"
        title="Compliance"
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
              className="btn-primary"
              disabled={busy !== null || !gaps.length}
              onClick={async () => {
                setBusy("review");
                try {
                  const result = await api.analyze("compliance");
                  const count = Array.isArray(result?.drafts) ? result.drafts.length : gaps.length;
                  setMessage(`${count} gap review(s) in Approvals.`);
                  await load();
                } catch (err) {
                  setMessage(err instanceof Error ? err.message : "Could not review compliance gaps.");
                } finally {
                  setBusy(null);
                }
              }}
            >
              {busy === "review" ? "Reviewing…" : "Review gaps"}
            </button>
          </div>
        }
      />

      {message && <p className="text-sm">{message}</p>}
      {requirements.length > 0 && (
        <div className="space-y-3">
          {requirements.map((item) => (
            <article key={item.id} className="panel p-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{item.framework}</p>
              <h2 className="mt-1 font-medium tracking-tight">{item.title}</h2>
              <p className="mt-2 text-sm">{item.summary}</p>
              <p className="mt-2 text-sm text-muted">
                {item.applies ? "Applies" : "Not flagged"} · evidence: {item.evidenceStatus.replace("_", " ")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["submitted", "waived", "missing"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={busy === item.id}
                    className={item.evidenceStatus === status ? "chip-on min-h-11 px-3 py-2 text-sm" : "btn-ghost text-xs"}
                    onClick={async () => {
                      setBusy(item.id);
                      setRequirements((current) =>
                        current.map((row) => (row.id === item.id ? { ...row, evidenceStatus: status } : row)),
                      );
                      try {
                        await api.markEvidence(item.id, status);
                        await load();
                      } catch (err) {
                        await load().catch(() => undefined);
                        setMessage(err instanceof Error ? err.message : "Could not save evidence.");
                      } finally {
                        setBusy(null);
                      }
                    }}
                  >
                    Mark {status}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
