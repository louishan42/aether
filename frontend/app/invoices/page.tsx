"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/PageHeader";
import type { Invoice } from "../../lib/types";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [overdue, setOverdue] = useState<Invoice[]>([]);
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
    const [all, due] = await Promise.all([api.invoices(), api.overdue()]);
    setInvoices(all.invoices);
    setOverdue(due.invoices);
  }

  useEffect(() => {
    load().catch((err) => setMessage(err.message));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Records"
        title="Invoices"
        description="Track unpaid bills. Paid and disputed rows are skipped. Bulk files go in Datasets."
        action={
          <button
            className="btn-primary"
            disabled={!invoices.length}
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

      <p className="text-sm text-muted">
        {overdue.length} overdue and eligible. Need a file?{" "}
        <Link href="/datasets" className="accent-text font-semibold hover:underline">
          Open Datasets
        </Link>
      </p>

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
            {invoices.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={5}>
                  No invoices yet.
                </td>
              </tr>
            )}
            {invoices.map((invoice) => (
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
      </section>
    </div>
  );
}
