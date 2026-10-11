const headers = { "Content-Type": "application/json" };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { ...headers, ...init?.headers }, cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  stats: () => request<import("./types").Stats>("/api/dashboard/stats"),
  invoices: () => request<{ invoices: import("./types").Invoice[] }>("/api/invoices"),
  overdue: () => request<{ invoices: import("./types").Invoice[] }>("/api/invoices/overdue"),
  createInvoice: (body: {
    invoiceNumber: string;
    customerName: string;
    customerEmail: string;
    amountSgd: number;
    dueDate: string;
    status: "unpaid" | "paid" | "disputed";
  }) => request("/api/invoices", { method: "POST", body: JSON.stringify(body) }),
  importCsv: (csv: string, filename?: string) =>
    request("/api/invoices/import", { method: "POST", body: JSON.stringify({ csv, filename }) }),
  analyze: (agent: string = "invoice") =>
    request("/api/agent/analyze", { method: "POST", body: JSON.stringify({ agent }) }),
  pending: () => request<{ drafts: import("./types").Draft[] }>("/api/reminders/pending"),
  decide: (id: string, decision: "approved" | "rejected") =>
    request(`/api/reminders/${id}/approve`, { method: "POST", body: JSON.stringify({ decision }) }),
  send: (id: string) => request<{ detail: string }>(`/api/reminders/${id}/send`, { method: "POST" }),
  activity: () => request<{ logs: { id: string; action: string; result: string; timestamp: string }[] }>("/api/agent/activity"),
  savePolicy: (policy: import("./types").Stats["policy"]) =>
    request<{ policy: import("./types").Stats["policy"] }>("/api/dashboard/policy", { method: "POST", body: JSON.stringify(policy) }),
  profile: () => request<{ profile: import("./types").BusinessProfile }>("/api/workspace/profile"),
  saveProfile: (profile: import("./types").BusinessProfile) =>
    request<{ profile: import("./types").BusinessProfile }>("/api/workspace/profile", { method: "POST", body: JSON.stringify(profile) }),
  grants: () =>
    request<{ grants: { id: string; name: string; agency: string; summary: string; match: { ok: boolean; reason: string; score: number } }[]; profileReady: boolean }>(
      "/api/workspace/grants",
    ),
  customers: () => request<{ customers: { id: string; name: string; email: string; lastContactAt: string | null; notes: string }[] }>("/api/workspace/customers"),
  createCustomer: (body: { name: string; email: string; lastContactAt?: string; notes?: string }) =>
    request("/api/workspace/customers", { method: "POST", body: JSON.stringify(body) }),
  importCustomers: (csv: string, filename?: string) =>
    request("/api/workspace/customers/import", { method: "POST", body: JSON.stringify({ csv, filename }) }),
  compliance: () =>
    request<{ requirements: { id: string; framework: string; title: string; summary: string; applies: boolean; evidenceStatus: string }[] }>(
      "/api/workspace/compliance",
    ),
  markEvidence: (id: string, status: "missing" | "submitted" | "waived") =>
    request(`/api/workspace/compliance/${id}/evidence`, { method: "POST", body: JSON.stringify({ status }) }),
  appointments: () =>
    request<{ appointments: { id: string; customerName: string; customerEmail: string; startsAt: string; status: string }[] }>("/api/workspace/appointments"),
  createAppointment: (body: { customerName: string; customerEmail: string; startsAt: string }) =>
    request("/api/workspace/appointments", { method: "POST", body: JSON.stringify(body) }),
  cancelAppointment: (id: string) => request(`/api/workspace/appointments/${id}/cancel`, { method: "POST" }),
  importAppointments: (csv: string, filename?: string) =>
    request("/api/workspace/appointments/import", { method: "POST", body: JSON.stringify({ csv, filename }) }),
  records: () =>
    request<{
      invoices: import("./types").Invoice[];
      customers: { id: string; name: string; email: string; lastContactAt: string | null; notes: string }[];
      appointments: { id: string; customerName: string; customerEmail: string; startsAt: string; status: string }[];
      files: {
        id: string;
        filename: string;
        kind: string;
        rowCount: number;
        importedAt: string;
        headers: string[];
        rows: Record<string, string>[];
      }[];
      datasets: {
        id: string;
        filename: string;
        kind: string;
        rowCount: number;
        importedAt: string;
        headers: string[];
        rows: Record<string, string>[];
      }[];
    }>("/api/workspace/records"),
  importAny: (csv: string, filename?: string, kind?: string) =>
    request<{ kind: string; mapped: number; stored: number; agentReady: boolean; file: { filename: string } }>(
      "/api/workspace/datasets/import",
      { method: "POST", body: JSON.stringify({ csv, filename, kind }) },
    ),
  chat: (message: string) =>
    request<{ reply: string; links: { href: string; label: string }[] }>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
  deleteDataset: (id: string) =>
    request<{ filename: string; removed: { invoices: number; customers: number; appointments: number } }>(
      `/api/workspace/datasets/${id}`,
      { method: "DELETE" },
    ),
};
