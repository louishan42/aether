"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { classifyCsv, type DatasetKind } from "../../lib/dataset";
import { CsvImport } from "../../components/CsvImport";
import { PageHeader } from "../../components/PageHeader";
import type { Invoice } from "../../lib/types";

type CustomerRow = { id: string; name: string; email: string; lastContactAt: string | null; notes: string };
type BookingRow = { id: string; customerName: string; customerEmail: string; startsAt: string; status: string };
type FileRow = { id: string; filename: string; kind: string; rowCount: number; importedAt: string };

export default function DatasetsPage() {
  const [message, setMessage] = useState("");
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [appointments, setAppointments] = useState<BookingRow[]>([]);
  const [files, setFiles] = useState<FileRow[]>([]);

  async function load() {
    const data = await api.records();
    setInvoices(data.invoices);
    setCustomers(data.customers);
    setAppointments(data.appointments);
    setFiles(data.files);
  }

  useEffect(() => {
    load().catch((err) => setMessage(err.message));
  }, []);

  async function importKind(kind: DatasetKind, csv: string, filename?: string) {
    if (kind === "invoices") await api.importCsv(csv, filename);
    if (kind === "customers") await api.importCustomers(csv, filename);
    if (kind === "appointments") await api.importAppointments(csv, filename);
  }

  async function importThenRun(kind: DatasetKind, csv: string, filename?: string) {
    await importKind(kind, csv, filename);
    await api.analyze("all");
    await load();
  }

  async function handleFiles(list: FileList | File[]) {
    const chosen = Array.from(list).filter((file) => file.name.toLowerCase().endsWith(".csv") || file.type.includes("csv") || file.type === "text/plain");
    if (!chosen.length) {
      setMessage("Drop CSV files (invoices, customers, bookings).");
      return;
    }
    setBusy(true);
    try {
      const loaded: string[] = [];
      for (const file of chosen) {
        const csv = await file.text();
        const kind = classifyCsv(csv, file.name);
        if (!kind) {
          setMessage(`Could not tell what ${file.name} is. Name it invoices.csv, customers.csv, or appointments.csv.`);
          return;
        }
        await importKind(kind, csv, file.name);
        loaded.push(`${file.name} → ${kind}`);
      }
      await api.analyze("all");
      await load();
      setMessage(`${loaded.join(" · ")}. Open Approvals for drafts.`);
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
        description="Drop CSV files here. Imported rows stay on this page so you can check them. Records are saved in Supabase Postgres."
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
        tabIndex={0}
      >
        <p className="text-lg font-semibold tracking-tight">Drop CSV files here</p>
        <p className="mt-2 text-sm text-muted">invoices.csv, customers.csv, and appointments.csv — together or one at a time.</p>
        <label className="btn-ink mt-5 inline-block cursor-pointer">
          {busy ? "Importing…" : "Choose files"}
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            multiple
            className="hidden"
            disabled={busy}
            onChange={async (event) => {
              if (event.target.files) await handleFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
      </section>

      <section className="panel p-5">
        <h2 className="font-medium tracking-tight">Imported files</h2>
        {files.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No files yet. Drop CSVs above.</p>
        ) : (
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.14em] text-muted">
                <th className="py-2">File</th>
                <th>Type</th>
                <th>Rows</th>
                <th>Imported</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.id} className="border-t border-edge">
                  <td className="py-2">{file.filename}</td>
                  <td>{file.kind}</td>
                  <td>{file.rowCount}</td>
                  <td>{new Date(file.importedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["Invoices", invoices.length],
          ["Customers", customers.length],
          ["Bookings", appointments.length],
        ].map(([label, value]) => (
          <div key={String(label)} className="panel p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
          </div>
        ))}
      </section>

      <section className="panel overflow-x-auto p-5">
        <h2 className="font-medium tracking-tight">Invoices in the database</h2>
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.14em] text-muted">
              <th className="py-2">Number</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && (
              <tr>
                <td className="py-3 text-muted" colSpan={5}>
                  None yet.
                </td>
              </tr>
            )}
            {invoices.map((row) => (
              <tr key={row.id} className="border-t border-edge">
                <td className="py-2">{row.invoiceNumber}</td>
                <td>
                  {row.customerName}
                  <div className="text-muted">{row.customerEmail}</div>
                </td>
                <td>{row.amountSgd.toFixed(2)}</td>
                <td>{row.dueDate.slice(0, 10)}</td>
                <td>{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel overflow-x-auto p-5">
        <h2 className="font-medium tracking-tight">Customers in the database</h2>
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.14em] text-muted">
              <th className="py-2">Name</th>
              <th>Email</th>
              <th>Last contact</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 && (
              <tr>
                <td className="py-3 text-muted" colSpan={4}>
                  None yet.
                </td>
              </tr>
            )}
            {customers.map((row) => (
              <tr key={row.id} className="border-t border-edge">
                <td className="py-2">{row.name}</td>
                <td>{row.email}</td>
                <td>{row.lastContactAt ? row.lastContactAt.slice(0, 10) : "Never"}</td>
                <td>{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel overflow-x-auto p-5">
        <h2 className="font-medium tracking-tight">Bookings in the database</h2>
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.14em] text-muted">
              <th className="py-2">Customer</th>
              <th>When</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {appointments.length === 0 && (
              <tr>
                <td className="py-3 text-muted" colSpan={3}>
                  None yet.
                </td>
              </tr>
            )}
            {appointments.map((row) => (
              <tr key={row.id} className="border-t border-edge">
                <td className="py-2">
                  {row.customerName}
                  <div className="text-muted">{row.customerEmail}</div>
                </td>
                <td>{new Date(row.startsAt).toLocaleString()}</td>
                <td>{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid gap-4 lg:grid-cols-1">
        <CsvImport
          title="Invoices"
          hint="invoice_number, customer_name, customer_email, amount_sgd, due_date, status (unpaid | paid | disputed)"
          onImport={(csv) => importThenRun("invoices", csv, "pasted-invoices.csv")}
        />
        <CsvImport
          title="Customers"
          hint="name, email, last_contact_at, notes"
          onImport={(csv) => importThenRun("customers", csv, "pasted-customers.csv")}
        />
        <CsvImport
          title="Bookings"
          hint="customer_name, customer_email, starts_at, status (booked | cancelled | completed)"
          onImport={(csv) => importThenRun("appointments", csv, "pasted-appointments.csv")}
        />
      </div>
    </div>
  );
}
