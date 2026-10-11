"use client";

import { useState } from "react";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/PageHeader";
import type { Invoice } from "../../lib/types";
import { useReload } from "../../lib/useReload";
import { DatasetFilter } from "../../components/DatasetFilter";
import { TablePager } from "../../components/TablePager";
import { listedDatasets, pageRows, rowsForView, type DatasetFile, type FileView } from "../../lib/datasets";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [overdue, setOverdue] = useState<Invoice[]>([]);
  const [files, setFiles] = useState<DatasetFile[]>([]);
  const [fileId, setFileId] = useState<FileView>("all");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    invoiceNumber: "",
    customerName: "",
    customerEmail: "",
    amountSgd: "",
    dueDate: "",
    status: "unpaid" as "unpaid" | "paid" | "disputed",
  });

  async function load() {
    const [all, due, records] = await Promise.all([api.invoices(), api.overdue(), api.records()]);
    setInvoices(all.invoices);
    setOverdue(due.invoices);
    setFiles(listedDatasets(records).filter((file) => file.kind === "invoices"));
  }

  const visible = rowsForView(invoices, fileId);
  const visibleOverdue = rowsForView(overdue, fileId);
  const paged = pageRows(visible, page);

  useReload(load, setMessage);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Records"
        title="Invoices"
        action={
          <button
            className="btn-primary"
            disabled={!visible.length}
            onClick={async () => {
              await api.analyze("invoice");
              setMessage("Drafts are waiting in Approvals.");
              await load();
            }}
          >
            Prepare reminders
          </button>
        }
      />
      {message && <p className="text-sm">{message}</p>}

      <section className="panel p-5">
        <h2 className="font-medium tracking-tight">Add invoice</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <input className="field" placeholder="INV-1001" value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
          <input className="field" placeholder="Customer name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
          <input className="field" placeholder="email@example.com" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} />
          <input className="field" placeholder="Amount SGD" value={form.amountSgd} onChange={(e) => setForm({ ...form, amountSgd: e.target.value })} />
          <input className="field" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          <select className="field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}>
            <option value="unpaid">unpaid</option>
            <option value="paid">paid</option>
            <option value="disputed">disputed</option>
          </select>
        </div>
        <button
          className="btn-ink mt-3"
          onClick={async () => {
            await api.createInvoice({ ...form, amountSgd: Number(form.amountSgd) });
            setForm({ invoiceNumber: "", customerName: "", customerEmail: "", amountSgd: "", dueDate: "", status: "unpaid" });
            await load();
          }}
        >
          Save invoice
        </button>
      </section>

      <DatasetFilter
        files={files}
        value={fileId}
        onChange={(next) => {
          setFileId(next);
          setPage(1);
        }}
        hasManual={invoices.some((row) => row.sourceImportId === "manual")}
        rowTotal={visible.length}
      />

      <section className="panel table-wrap">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="bg-paper text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Invoice</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Amount (SGD)</th>
              <th className="px-4 py-3 font-medium">Due</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={5}>
                  No invoices yet.
                </td>
              </tr>
            )}
            {paged.map((invoice) => (
              <tr key={invoice.id} className="border-t border-edge">
                <td className="px-4 py-3">{invoice.invoiceNumber}</td>
                <td className="px-4 py-3">
                  {invoice.customerName}
                  <div className="text-muted">{invoice.customerEmail}</div>
                </td>
                <td className="px-4 py-3">{invoice.amountSgd.toFixed(2)}</td>
                <td className="px-4 py-3">{invoice.dueDate.slice(0, 10)}</td>
                <td className="px-4 py-3">{invoice.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <TablePager total={visible.length} page={page} onPage={setPage} />
      </section>
    </div>
  );
}
