"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/PageHeader";

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

  async function load() {
    const data = await api.records();
    setFiles(data.datasets?.length ? data.datasets : data.files);
  }

  useEffect(() => {
    load().catch((err) => setMessage(err.message));
  }, []);

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
          `${file.name}: saved as ${result.kind} (${result.stored} rows${result.agentReady ? ", agents ran" : ", stored only"})`,
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
        description="Add any spreadsheet (CSV/TSV). Invoice, customer, and booking files feed the agents. Everything else is stored as its own table so you can check it."
      />
      {message && <p className="text-sm text-red-800">{message}</p>}

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
        <p className="mt-2 text-sm text-muted">CSV or TSV. Headers can be named however you like.</p>
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
        <div className="mt-5">
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
              setMessage(`Pasted file saved as ${result.kind} (${result.stored} rows).`);
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

      {files.map((file) => {
        const headers = file.headers?.length ? file.headers : Object.keys(file.rows?.[0] ?? {});
        return (
          <section key={file.id} className="panel overflow-x-auto p-5">
            <h2 className="font-medium tracking-tight">{file.filename}</h2>
            <p className="mt-1 text-sm text-muted">
              {file.kind} · {file.rowCount} rows · {new Date(file.importedAt).toLocaleString()}
              {file.kind === "custom" ? " · stored for review (no agent yet)" : " · wired to an agent"}
            </p>
            <table className="mt-3 w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.14em] text-muted">
                  {headers.map((header) => (
                    <th key={header} className="py-2 pr-3">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(file.rows ?? []).length === 0 && (
                  <tr>
                    <td className="py-3 text-muted" colSpan={Math.max(headers.length, 1)}>
                      No row preview.
                    </td>
                  </tr>
                )}
                {(file.rows ?? []).slice(0, 50).map((row, index) => (
                  <tr key={`${file.id}-${index}`} className="border-t border-edge">
                    {headers.map((header) => (
                      <td key={header} className="py-2 pr-3">
                        {row[header] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}
