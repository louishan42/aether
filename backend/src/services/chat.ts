import { GRANT_CATALOG } from "../../../agents/catalogs/grants.js";
import { COMPLIANCE_CATALOG } from "../../../agents/catalogs/compliance.js";
import { runAllAgents } from "../../../agents/runners/run.js";
import { isEligible } from "./overdue.js";
import { saveSnapshot } from "./persist.js";
import { draftBuckets, openDrafts } from "./drafts.js";
import { addLog, getPolicy, getProfile, getStore } from "./store.js";
import { logDraftApproved } from "./actions.js";
import { draftBelongsToTenant } from "./drafts.js";
import { groqReady, groqReply } from "./groq.js";

export type ChatLink = { href: string; label: string };
export type ChatReply = { reply: string; links: ChatLink[] };

function has(text: string, ...words: string[]) {
  return words.some((word) => text.includes(word));
}

export async function answerChat(businessId: string, raw: string, actorId = "demo-owner"): Promise<ChatReply> {
  const text = raw.trim().toLowerCase();
  const store = getStore();
  const policy = getPolicy(businessId);
  const profile = getProfile(businessId);
  const invoices = store.invoices.filter((row) => row.businessId === businessId);
  const overdue = invoices.filter((row) => isEligible(row, policy).ok);
  const customers = store.customers.filter((row) => row.businessId === businessId);
  const appointments = store.appointments.filter((row) => row.businessId === businessId);
  const buckets = draftBuckets(businessId);
  const files = store.imports.filter((row) => row.businessId === businessId);

  if (!text || has(text, "help", "hi", "hello", "what can")) {
    return {
      reply: "Try: overdue, approvals, datasets, grants, or approve INV-1001.",
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
    const created = result.invoice.drafts.length + result.customer.drafts.length + result.appointment.drafts.length;
    return {
      reply: `Agents ran. New drafts: ${created}. Open Approvals to approve before anything is sent.`,
      links: [{ href: "/approvals", label: "Approvals" }],
    };
  }

  const approveMatch = raw.match(/inv[-\s]?(\d+)/i);
  if (has(text, "approve") && approveMatch) {
    const needle = `INV-${approveMatch[1]}`.toUpperCase();
    const draft = store.drafts.find((item) => {
      if (item.status !== "pending" || item.businessId !== businessId) return false;
      const invoice = store.invoices.find((row) => row.id === item.recordId && row.businessId === businessId);
      return item.subject.toUpperCase().includes(needle) || invoice?.invoiceNumber.toUpperCase() === needle;
    });
    if (!draft || !draftBelongsToTenant(businessId, draft)) {
      return { reply: `No pending draft for ${needle}. Run agents first, or check Approvals.`, links: [{ href: "/approvals", label: "Approvals" }] };
    }
    draft.status = "approved";
    logDraftApproved({
      businessId,
      userId: actorId,
      agent: draft.agent,
      recordId: draft.recordId,
      draftId: draft.id,
      status: "approved",
    });
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
    const drafts = openDrafts(businessId);
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

  if (has(text, "analys", "chart", "pdf", "report")) {
    return {
      reply: `${invoices.length} invoices, ${overdue.length} overdue, ${customers.length} customers, ${appointments.length} bookings. Charts and the locked PDF are on Analysis.`,
      links: [{ href: "/analysis", label: "Open Analysis" }],
    };
  }

  if (has(text, "overview", "stat", "dashboard", "how many", "summary")) {
    return {
      reply: `Overview is combined from ${files.length} dataset file(s): ${invoices.length} invoices (${overdue.length} overdue), ${customers.length} customers, ${appointments.length} bookings, ${buckets.pendingSend} reminder draft(s), ${buckets.pendingChecklists} checklist(s).`,
      links: [{ href: "/dashboard", label: "Overview" }],
    };
  }

  if (has(text, "delete", "remove")) {
    return { reply: "To delete a dataset and update invoices, customers, bookings, and drafts, use Delete on the Datasets page.", links: [{ href: "/datasets", label: "Datasets" }] };
  }

  const links: ChatLink[] = [
    { href: "/dashboard", label: "Overview" },
    { href: "/approvals", label: "Approvals" },
    { href: "/datasets", label: "Datasets" },
  ];

  if (groqReady()) {
    try {
      const snapshot = [
        `Files: ${files.length} (${files.map((row) => row.filename).slice(0, 8).join(", ") || "none"})`,
        `Invoices: ${invoices.length}, overdue: ${overdue.length}`,
        `Customers: ${customers.length}, bookings: ${appointments.length}`,
        `Reminder drafts waiting: ${buckets.pendingSend}, checklists: ${buckets.pendingChecklists}`,
        `Industry: ${profile.industry || "not set"}`,
      ].join("\n");
      const reply = await groqReply(
        "You are the Aether desk helper for a Singapore SME. Answer in short plain sentences. Use only the snapshot. Approve-then-act: you never send email. Grants and compliance are screening, not legal advice. Do not claim PDPA certification or a live PII scrubber. If asked to send or pay, tell them to use Approvals.",
        `Snapshot:\n${snapshot}\n\nQuestion: ${raw.trim()}`,
      );
      if (reply) return { reply, links };
    } catch {
      // Fall through to the desk fallback below.
    }
  }

  return {
    reply: "I didn’t catch that. Try overview, overdue, run agents, approvals, datasets, or grants.",
    links,
  };
}
