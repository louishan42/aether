import { GRANT_CATALOG } from "../../../agents/catalogs/grants.js";
import { COMPLIANCE_CATALOG } from "../../../agents/catalogs/compliance.js";
import { runAllAgents } from "../../../agents/runners/run.js";
import { isEligible } from "./overdue.js";
import { saveSnapshot } from "./persist.js";
import { addLog, getPolicy, getProfile, getStore } from "./store.js";

export type ChatLink = { href: string; label: string };
export type ChatReply = { reply: string; links: ChatLink[] };

function has(text: string, ...words: string[]) {
  return words.some((word) => text.includes(word));
}

export async function answerChat(businessId: string, raw: string): Promise<ChatReply> {
  const text = raw.trim().toLowerCase();
  const store = getStore();
  const policy = getPolicy(businessId);
  const profile = getProfile(businessId);
  const invoices = store.invoices.filter((row) => row.businessId === businessId);
  const overdue = invoices.filter((row) => isEligible(row, policy).ok);
  const customers = store.customers.filter((row) => row.businessId === businessId);
  const appointments = store.appointments.filter((row) => row.businessId === businessId);
  const drafts = store.drafts.filter((draft) => draft.status === "pending" || draft.status === "approved");
  const files = store.imports.filter((row) => row.businessId === businessId);

  if (!text || has(text, "help", "hi", "hello", "what can")) {
    return {
      reply: "I can manage this desk with you. Try: overview, overdue invoices, run agents, approvals, datasets, grants, or approve INV-1001.",
      links: [
        { href: "/dashboard", label: "Overview" },
        { href: "/approvals", label: "Approvals" },
        { href: "/datasets", label: "Datasets" },
      ],
    };
  }

  if (has(text, "run agent", "prepare", "analyze", "start agent", "kick")) {
    const result = await runAllAgents(businessId);
    await saveSnapshot();
    const created =
      result.invoice.drafts.length +
      result.grant.drafts.length +
      result.customer.drafts.length +
      result.compliance.drafts.length +
      result.appointment.drafts.length;
    return {
      reply: `Agents ran. New drafts: ${created}. Open Approvals to approve before anything is sent.`,
      links: [{ href: "/approvals", label: "Approvals" }],
    };
  }

  const approveMatch = raw.match(/inv[-\s]?(\d+)/i);
  if (has(text, "approve") && approveMatch) {
    const needle = `INV-${approveMatch[1]}`.toUpperCase();
    const draft = store.drafts.find(
      (item) =>
        item.status === "pending" &&
        (item.subject.toUpperCase().includes(needle) ||
          store.invoices.find((invoice) => invoice.id === item.recordId)?.invoiceNumber.toUpperCase() === needle),
    );
    if (!draft) {
      return { reply: `No pending draft for ${needle}. Run agents first, or check Approvals.`, links: [{ href: "/approvals", label: "Approvals" }] };
    }
    draft.status = "approved";
    addLog({ agent: draft.agent, agentRunId: null, invoiceId: draft.recordId, action: "approve_draft", result: `chat approved ${draft.id}` });
    await saveSnapshot();
    return { reply: `Approved: ${draft.subject}. On Approvals, tap send to finish.`, links: [{ href: "/approvals", label: "Approvals" }] };
  }

  if (has(text, "overdue", "unpaid", "collection")) {
    const lines = overdue.slice(0, 8).map((row) => `${row.invoiceNumber} · ${row.customerName} · SGD ${row.amountSgd.toFixed(2)}`);
    return {
      reply: overdue.length
        ? `${overdue.length} overdue invoice(s):\n${lines.join("\n")}`
        : "No overdue invoices right now.",
      links: [{ href: "/invoices", label: "Invoices" }],
    };
  }

  if (has(text, "approval", "draft", "pending")) {
    const lines = drafts.slice(0, 8).map((row) => `${row.agent}: ${row.subject} (${row.status})`);
    return {
      reply: drafts.length ? `${drafts.length} item(s) waiting:\n${lines.join("\n")}` : "No drafts waiting. Say “run agents” after you load data.",
      links: [{ href: "/approvals", label: "Approvals" }],
    };
  }

  if (has(text, "dataset", "csv", "import", "file", "upload")) {
    const lines = files.slice(0, 8).map((row) => `${row.filename} · ${row.kind} · ${row.rowCount} rows`);
    return {
      reply: files.length
        ? `Loaded files:\n${lines.join("\n")}\nDrop more on Datasets. Delete there to remove rows everywhere.`
        : "No files yet. Open Datasets and drop a CSV.",
      links: [{ href: "/datasets", label: "Datasets" }],
    };
  }

  if (has(text, "customer", "follow")) {
    return {
      reply: `${customers.length} customer(s) in the desk. Follow-up agent uses last-contact dates.`,
      links: [{ href: "/customers", label: "Customers" }],
    };
  }

  if (has(text, "book", "appoint")) {
    return {
      reply: `${appointments.length} booking(s). Reminders are drafted for booked slots inside the reminder window.`,
      links: [{ href: "/appointments", label: "Bookings" }],
    };
  }

  if (has(text, "grant")) {
    const matches = GRANT_CATALOG.filter((grant) => grant.match(profile).ok);
    return {
      reply: profile.industry
        ? `${matches.length} grant match(es): ${matches.map((row) => row.name).join("; ") || "none"}.`
        : "Set industry in Settings so grant matching can run.",
      links: [
        { href: "/grants", label: "Grants" },
        { href: "/settings", label: "Settings" },
      ],
    };
  }

  if (has(text, "compliance", "pdpa", "gst")) {
    const gaps = COMPLIANCE_CATALOG.filter((item) => item.appliesWhen(profile)).length;
    return { reply: `${gaps} compliance item(s) apply to the current profile. Screening only, not legal advice.`, links: [{ href: "/compliance", label: "Compliance" }] };
  }

  if (has(text, "overview", "stat", "dashboard", "how many", "summary")) {
    return {
      reply: `Overview: ${invoices.length} invoices (${overdue.length} overdue), ${customers.length} customers, ${appointments.length} bookings, ${drafts.filter((d) => d.status === "pending").length} pending approvals, ${files.length} dataset file(s).`,
      links: [{ href: "/dashboard", label: "Overview" }],
    };
  }

  if (has(text, "delete", "remove")) {
    return { reply: "To delete a dataset and update invoices, customers, bookings, and drafts, use Delete on the Datasets page.", links: [{ href: "/datasets", label: "Datasets" }] };
  }

  return {
    reply: "I didn’t catch that. Try overview, overdue, run agents, approvals, datasets, or grants.",
    links: [
      { href: "/chat", label: "Chat" },
      { href: "/dashboard", label: "Overview" },
    ],
  };
}
