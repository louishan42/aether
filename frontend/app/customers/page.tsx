"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/PageHeader";
import { useReload } from "../../lib/useReload";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<{ id: string; name: string; email: string; lastContactAt: string | null; notes: string }[]>([]);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", email: "", lastContactAt: "", notes: "" });

  async function load() {
    setCustomers((await api.customers()).customers);
  }

  useReload(load, setMessage);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Records"
        title="Customers"
        description="People who may need a check-in. Messages stay in Approvals until you send them."
        action={
          <button
            className="btn-primary"
            disabled={!customers.length}
            onClick={async () => {
              await api.analyze("customer");
              setMessage("Drafts are waiting in Approvals.");
            }}
          >
            Prepare follow-ups
          </button>
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
      <p className="text-sm text-muted">
        Bulk import is on{" "}
        <Link href="/datasets" className="accent-text font-semibold hover:underline">
          Datasets
        </Link>
        .
      </p>
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
            {customers.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={3}>
                  No customers yet.
                </td>
              </tr>
            )}
            {customers.map((row) => (
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
      </section>
    </div>
  );
}
