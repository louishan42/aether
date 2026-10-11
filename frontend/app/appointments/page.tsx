"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/PageHeader";

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<{ id: string; customerName: string; customerEmail: string; startsAt: string; status: string }[]>([]);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ customerName: "", customerEmail: "", startsAt: "" });

  async function load() {
    setAppointments((await api.appointments()).appointments);
  }

  useEffect(() => {
    load().catch((err) => setMessage(err.message));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Records"
        title="Bookings"
        description="Create or cancel appointments. Reminders are prepared only for bookings inside the reminder window."
        action={
          <button
            className="btn-primary"
            disabled={!appointments.length}
            onClick={async () => {
              await api.analyze("appointment");
              setMessage("Reminder drafts are waiting in Approvals.");
            }}
          >
            Prepare reminders
          </button>
        }
      />
      <section className="panel p-5">
        <h2 className="font-medium tracking-tight">New booking</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <input className="field" placeholder="Customer name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
          <input className="field" placeholder="Email" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} />
          <input className="field" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
        </div>
        <button
          className="btn-ink mt-3"
          onClick={async () => {
            await api.createAppointment(form);
            setForm({ customerName: "", customerEmail: "", startsAt: "" });
            await load();
          }}
        >
          Save booking
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
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="bg-paper text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Starts</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {appointments.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={4}>
                  No bookings yet.
                </td>
              </tr>
            )}
            {appointments.map((row) => (
              <tr key={row.id} className="border-t border-edge">
                <td className="px-4 py-3">
                  {row.customerName}
                  <div className="text-muted">{row.customerEmail}</div>
                </td>
                <td className="px-4 py-3">{new Date(row.startsAt).toLocaleString()}</td>
                <td className="px-4 py-3">{row.status}</td>
                <td className="px-4 py-3">
                  {row.status === "booked" && (
                    <button
                      className="text-sm underline"
                      onClick={async () => {
                        await api.cancelAppointment(row.id);
                        await load();
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
