"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/PageHeader";
import type { BusinessProfile, Stats } from "../../lib/types";

const emptyPolicy: Stats["policy"] = {
  minimumOverdueDays: 1,
  maxReminders: 3,
  cooldownDays: 7,
  customerFollowUpDays: 14,
  appointmentReminderHours: 24,
};

const emptyProfile: BusinessProfile = {
  name: "Demo SME",
  industry: "",
  employeeCount: 0,
  annualRevenueSgd: 0,
  isExporting: false,
  usesDigitalTools: false,
  hasGstRegistration: false,
};

export default function SettingsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<{ id: string; action: string; result: string; timestamp: string }[]>([]);
  const [policy, setPolicy] = useState(emptyPolicy);
  const [profile, setProfile] = useState(emptyProfile);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([api.stats(), api.activity()])
      .then(([s, a]) => {
        setStats(s);
        setPolicy(s.policy);
        setProfile(s.profile);
        setLogs(a.logs);
      })
      .catch((err) => setMessage(err.message));
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
      />
      {message && <p className="text-sm">{message}</p>}

      <section className="space-y-4">
        <h2 className="font-medium tracking-tight">Business profile</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="panel p-4 text-sm">
            Business name
            <input className="field mt-2" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </label>
          <label className="panel p-4 text-sm">
            Industry
            <input
              className="field mt-2"
              placeholder="e.g. F&B, software, retail"
              value={profile.industry}
              onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
            />
          </label>
          <label className="panel p-4 text-sm">
            Employees
            <input
              type="number"
              className="field mt-2"
              value={profile.employeeCount}
              onChange={(e) => setProfile({ ...profile, employeeCount: Number(e.target.value) })}
            />
          </label>
          <label className="panel p-4 text-sm">
            Annual revenue (SGD)
            <input
              type="number"
              className="field mt-2"
              value={profile.annualRevenueSgd}
              onChange={(e) => setProfile({ ...profile, annualRevenueSgd: Number(e.target.value) })}
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={profile.isExporting} onChange={(e) => setProfile({ ...profile, isExporting: e.target.checked })} />
            Exporting
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={profile.usesDigitalTools} onChange={(e) => setProfile({ ...profile, usesDigitalTools: e.target.checked })} />
            Uses digital tools
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={profile.hasGstRegistration} onChange={(e) => setProfile({ ...profile, hasGstRegistration: e.target.checked })} />
            GST registered
          </label>
        </div>
        <button
          className="btn-ink"
          onClick={async () => {
            const result = await api.saveProfile(profile);
            setProfile(result.profile);
            setMessage("Profile saved.");
          }}
        >
          Save profile
        </button>
      </section>

      <section className="space-y-4">
        <h2 className="font-medium tracking-tight">Reminder rules</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {(
            [
              ["minimumOverdueDays", "Minimum overdue days"],
              ["maxReminders", "Max invoice reminders"],
              ["cooldownDays", "Invoice cooldown days"],
              ["customerFollowUpDays", "Customer follow-up days"],
              ["appointmentReminderHours", "Booking reminder hours"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="panel p-4 text-sm">
              {label}
              <input
                type="number"
                className="field mt-2"
                value={policy[key]}
                onChange={(e) => setPolicy({ ...policy, [key]: Number(e.target.value) })}
              />
            </label>
          ))}
        </div>
        <button
          className="btn-ink"
          onClick={async () => {
            const result = await api.savePolicy(policy);
            setPolicy(result.policy);
            setMessage("Rules saved.");
          }}
        >
          Save rules
        </button>
      </section>

      <section className="panel p-5">
        <h2 className="font-medium tracking-tight">Workspace</h2>
        <ul className="mt-2 space-y-1 text-sm text-muted">
          <li>frontend — operations UI</li>
          <li>backend — REST API and storage</li>
          <li>agents — catalogs, tools, and workflow runners</li>
          <li>Email and live models are not wired yet</li>
        </ul>
        {stats && (
          <p className="mt-3 text-sm">
            Invoices {stats.totals.invoices} · customers {stats.totals.customers} · bookings {stats.totals.appointments}
          </p>
        )}
      </section>

      <section className="panel p-5">
        <h2 className="font-medium tracking-tight">Activity log</h2>
        {!logs.length && <p className="mt-2 text-sm text-muted">Empty until work is prepared.</p>}
        <ul className="mt-3 space-y-2 text-sm">
          {logs.map((log) => (
            <li key={log.id}>
              <span className="font-medium">{log.action}</span> — {log.result}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
