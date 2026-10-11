"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/PageHeader";
import { useReload } from "../../lib/useReload";
import { DatasetFilter } from "../../components/DatasetFilter";
import { TablePager } from "../../components/TablePager";
import { listedDatasets, pageRows, rowsForView, type DatasetFile } from "../../lib/datasets";
import { useFileView } from "../../lib/fileView";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<{ id: string; name: string; email: string; lastContactAt: string | null; notes: string; sourceImportId?: string | null }[]>([]);
  const { view: fileId } = useFileView();
  const [files, setFiles] = useState<DatasetFile[]>([]);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", email: "", lastContactAt: "", notes: "" });

  async function load() {
    const [all, records] = await Promise.all([api.customers(), api.records()]);
    setCustomers(all.customers);
    setFiles(listedDatasets(records));
  }

  const visible = rowsForView(customers, fileId);
  const paged = pageRows(visible, page);

  useReload(load, setMessage);
  useEffect(() => {
    setPage(1);
  }, [fileId]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Records"
        title="Customers"
        action={
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-ghost"
              onClick={async () => {
                try {
                  const res = await fetch("/demo_customers.csv");
                  const csv = await res.text();
                  const result = await api.importAny(csv, "demo_customers.csv", "customers");
                  await load();
                  setMessage(`demo_customers.csv: ${result.mapped} customers.`);
                } catch (err) {
                  setMessage(err instanceof Error ? err.message : "Demo load failed");
                }
              }}
            >
              Load demo customers
            </button>
            <button
              className="btn-primary"
              disabled={!visible.length}
              onClick={async () => {
                await api.analyze("customer");
                setMessage("Drafts are waiting in Approvals.");
              }}
            >
              Prepare follow-ups
            </button>
          </div>
        }
      />
      <section className="panel p-5">
        <h2 className="font-medium tracking-tight">Add customer</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input className="field" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="field" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="field" type="date" value={form.lastContactAt} onChange={(e) => setForm({ ...form, lastContactAt: e.target.value })} />
          <input className="field" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <button
          className="btn-ink mt-3"
          onClick={async () => {
            await api.createCustomer({
              name: form.name,
              email: form.email,
              lastContactAt: form.lastContactAt || undefined,
              notes: form.notes,
            });
            setForm({ name: "", email: "", lastContactAt: "", notes: "" });
            await load();
          }}
        >
          Save customer
        </button>
      </section>
      {message && <p className="text-sm">{message}</p>}
      <DatasetFilter files={files} hasManual={customers.some((row) => row.sourceImportId === "manual")} />

      <section className="panel table-wrap">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead className="bg-paper text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Last contact</th>
              <th className="px-4 py-3 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={3}>
                  No customers yet.
                </td>
              </tr>
            )}
            {paged.map((row) => (
              <tr key={row.id} className="border-t border-edge">
                <td className="px-4 py-3">
                  {row.name}
                  <div className="text-muted">{row.email}</div>
                </td>
                <td className="px-4 py-3">{row.lastContactAt ? row.lastContactAt.slice(0, 10) : "Never"}</td>
                <td className="px-4 py-3">{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <TablePager total={visible.length} page={page} onPage={setPage} />
      </section>
    </div>
  );
}
