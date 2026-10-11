"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/PageHeader";
import { useReload } from "../../lib/useReload";
import { DatasetFilter } from "../../components/DatasetFilter";
import { TablePager } from "../../components/TablePager";
import { listedDatasets, pageRows, rowsForView, type DatasetFile, type FileView } from "../../lib/datasets";

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<{ id: string; customerName: string; customerEmail: string; startsAt: string; status: string; sourceImportId?: string | null }[]>([]);
  const [files, setFiles] = useState<DatasetFile[]>([]);
  const [fileId, setFileId] = useState<FileView>("all");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ customerName: "", customerEmail: "", startsAt: "" });

  async function load() {
    const [all, records] = await Promise.all([api.appointments(), api.records()]);
    setAppointments(all.appointments);
    setFiles(listedDatasets(records).filter((file) => file.kind === "appointments"));
  }

  const visible = rowsForView(appointments, fileId);
  const paged = pageRows(visible, page);

  useReload(load, setMessage);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Records"
        title="Bookings"
        description="All loaded booking files combined. Reminders are prepared only for booked slots inside the reminder window."
        action={
          <button
            className="btn-primary"
            disabled={!visible.length}
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
      <DatasetFilter
        files={files}
        value={fileId}
        onChange={(next) => {
          setFileId(next);
          setPage(1);
        }}
        hasManual={appointments.some((row) => row.sourceImportId === "manual")}
        rowTotal={visible.length}
      />

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
            {visible.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={4}>
                  No bookings yet.
                </td>
              </tr>
            )}
            {paged.map((row) => (
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
        <TablePager total={visible.length} page={page} onPage={setPage} />
      </section>
    </div>
  );
}
