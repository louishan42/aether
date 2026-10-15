"use client";

import { useState } from "react";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/PageHeader";
import { useReload } from "../../lib/useReload";
import { DEMO_SME_PROFILE } from "../../lib/demoProfile";
import { DatasetTable } from "../../components/DatasetTable";

type FileRow = {
  id: string;
  filename: string;
  kind: string;
  rowCount: number;
  importedAt: string;
  headers: string[];
  rows: Record<string, string>[];
};

export default function DatasetsPage() {
  const [message, setMessage] = useState("");
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [paste, setPaste] = useState("");
  const [kind, setKind] = useState("auto");
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [shown, setShown] = useState(Number.POSITIVE_INFINITY);

  async function load() {
    const data = await api.records();
    setFiles(data.datasets?.length ? data.datasets : data.files);
  }

  useReload(load, setMessage);

  const filteredAll = files
    .filter((file) => kindFilter === "all" || file.kind === kindFilter)
    .filter((file) => !query.trim() || file.filename.toLowerCase().includes(query.trim().toLowerCase()))
    .slice()
    .sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime());
  const filteredCount = filteredAll.length;
  const filteredFiles = filteredAll.slice(0, shown);

  async function importOne(csv: string, filename: string, chosenKind?: string) {
    const result = await api.importAny(csv, filename, chosenKind === "auto" ? undefined : chosenKind);
    return result;
  }

  async function handleFiles(list: FileList | File[]) {
    const chosen = Array.from(list).filter(
      (file) =>
        file.name.toLowerCase().endsWith(".csv") ||
        file.name.toLowerCase().endsWith(".tsv") ||
        file.name.toLowerCase().endsWith(".txt") ||
        file.type.includes("csv") ||
        file.type === "text/plain" ||
        file.type === "text/tab-separated-values",
    );
    if (!chosen.length) {
      setMessage("Drop a CSV or TSV file. Any columns are accepted.");
      return;
    }
    setBusy(true);
    try {
      const notes: string[] = [];
      for (const file of chosen) {
        const csv = await file.text();
        const result = await importOne(csv, file.name, kind);
        notes.push(
          `${file.name}: treated as ${result.kind} (${result.stored} rows, ${result.mapped} matched). ${result.reason ?? ""}`,
        );
      }
      await load();
      setMessage(notes.join(" · "));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workspace"
        title="Datasets"
      />
      {message && <p className="text-sm">{message}</p>}

      <section
        className={`panel drop-zone p-8 text-center ${active ? "active" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setActive(true);
        }}
        onDragLeave={() => setActive(false)}
        onDrop={async (event) => {
          event.preventDefault();
          setActive(false);
          await handleFiles(event.dataTransfer.files);
        }}
      >
        <p className="text-lg font-semibold tracking-tight">Drop any dataset here</p>
        <p className="mt-2 text-sm text-muted">CSV or TSV.</p>
        <label className="mt-4 inline-block text-left text-sm">
          Treat file as
          <select className="field mt-1" value={kind} onChange={(event) => setKind(event.target.value)}>
            <option value="auto">Auto-detect</option>
            <option value="invoices">Invoices (collections agent)</option>
            <option value="customers">Customers (follow-up agent)</option>
            <option value="appointments">Bookings (appointment agent)</option>
            <option value="custom">Custom (store only)</option>
          </select>
        </label>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const res = await fetch("/demo_data.csv");
                if (!res.ok) throw new Error("Could not load demo_data.csv");
                const csv = await res.text();
                const result = await importOne(csv, "demo_data.csv", "invoices");
                await api.saveProfile(DEMO_SME_PROFILE);
                await load();
                setMessage(
                  `demo_data.csv: treated as ${result.kind} (${result.stored} rows, ${result.mapped} matched). Open Invoices.`,
                );
              } catch (err) {
                setMessage(err instanceof Error ? err.message : "Demo load failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Importing…" : "Load demo_data"}
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const notes: string[] = [];
                for (const [path, name, asKind] of [
                  ["/demo_customers.csv", "demo_customers.csv", "customers"],
                  ["/demo_bookings.csv", "demo_bookings.csv", "appointments"],
                ] as const) {
                  const res = await fetch(path);
                  if (!res.ok) throw new Error(`Could not load ${name}`);
                  const result = await importOne(await res.text(), name, asKind);
                  notes.push(`${name}: ${result.mapped} ${result.kind}`);
                }
                await api.saveProfile(DEMO_SME_PROFILE);
                await load();
                setMessage(`${notes.join(" · ")}. Open Customers and Bookings.`);
              } catch (err) {
                setMessage(err instanceof Error ? err.message : "Demo load failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Load demo customers & bookings
          </button>
          <a className="btn-ghost" href="/demo_data.csv" download="demo_data.csv">
            Download demo_data.csv
          </a>
          <label className="btn-ink inline-block cursor-pointer">
            {busy ? "Importing…" : "Choose files"}
            <input
              type="file"
              accept=".csv,.tsv,.txt,text/csv,text/plain,text/tab-separated-values"
              multiple
              className="hidden"
              disabled={busy}
              onChange={async (event) => {
                if (event.target.files) await handleFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="font-medium tracking-tight">Or paste rows</h2>
        <textarea
          className="field mt-3 h-32"
          placeholder="Paste any CSV, including a header row."
          value={paste}
          onChange={(event) => setPaste(event.target.value)}
        />
        <button
          className="btn-ink mt-3"
          disabled={busy}
          onClick={async () => {
            if (!paste.trim()) return;
            setBusy(true);
            try {
              const result = await importOne(paste, "pasted.csv", kind);
              setPaste("");
              await load();
              setMessage(
                `Pasted as ${result.kind} (${result.stored} rows, ${result.mapped} matched). ${result.reason ?? ""}`,
              );
            } catch (err) {
              setMessage(err instanceof Error ? err.message : "Import failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          Import paste
        </button>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["Files", files.length],
          ["Rows stored", files.reduce((sum, file) => sum + file.rowCount, 0)],
          ["Agent-linked", files.filter((file) => file.kind !== "custom").length],
        ].map(([label, value]) => (
          <div key={String(label)} className="panel p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
          </div>
        ))}
      </section>

      {files.length === 0 && <p className="text-sm text-muted">No datasets yet. Drop a file above.</p>}

      {files.length > 0 && (
        <section className="panel space-y-3 p-4">
          <input className="field" placeholder={`Search ${files.length} files`} value={query} onChange={(event) => setQuery(event.target.value)} />
          <div className="flex flex-wrap gap-2">
            {[
              ["all", "All"],
              ["invoices", "Invoices"],
              ["customers", "Customers"],
              ["appointments", "Bookings"],
              ["custom", "Custom"],
            ].map(([id, label]) => (
              <button key={id} type="button" className={kindFilter === id ? "chip-on min-h-11 px-3 py-2 text-sm" : "btn-ghost text-sm"} onClick={() => setKindFilter(id)}>
                {label}
              </button>
            ))}
          </div>
        </section>
      )}

      {filteredFiles.map((file) => (
        <div key={file.id} className="space-y-2">
          <div className="flex justify-end">
            <button
              className="btn-ghost"
              disabled={busy}
              onClick={async () => {
                if (!window.confirm(`Delete ${file.filename}?`)) return;
                setBusy(true);
                try {
                  const result = await api.deleteDataset(file.id);
                  await load();
                  setMessage(
                    `Deleted ${result.filename}. Removed invoices ${result.removed.invoices}, customers ${result.removed.customers}, bookings ${result.removed.appointments}.`,
                  );
                } catch (err) {
                  setMessage(err instanceof Error ? err.message : "Delete failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Delete
            </button>
          </div>
          <DatasetTable file={file} />
        </div>
      ))}
      {files.length > 0 && filteredCount === 0 && <p className="text-sm text-muted">No files match that search.</p>}
      {filteredCount > shown && (
        <button type="button" className="btn-ink" onClick={() => setShown((count) => count + 8)}>
          Show more files ({filteredCount - shown} left)
        </button>
      )}
    </div>
  );
}
