import { addLog, getPolicy, getProfile, getStore } from "../../backend/src/services/store.js";
import { createTools } from "../tools/index.js";
import { daysOverdue } from "../../backend/src/services/overdue.js";
import { GRANT_CATALOG } from "../catalogs/grants.js";
import { COMPLIANCE_CATALOG } from "../catalogs/compliance.js";
import type { AgentKind, AgentRun } from "../../backend/src/types.js";

function dropPending(agent: AgentKind) {
  const store = getStore();
  store.drafts = store.drafts.filter((draft) => !(draft.agent === agent && draft.status === "pending"));
}

function startRun(businessId: string, agent: AgentKind): AgentRun {
  const run: AgentRun = {
    id: crypto.randomUUID(),
    businessId,
    agent,
    startedAt: new Date().toISOString(),
    completedAt: null,
    status: "running",
  };
  getStore().runs.unshift(run);
  return run;
}

function finishRun(run: AgentRun, result: string) {
  run.status = "completed";
  run.completedAt = new Date().toISOString();
  addLog({
    agent: run.agent,
    agentRunId: run.id,
    invoiceId: null,
    action: "agent_analyze",
    result,
  });
}

export async function runInvoiceAgent(businessId: string) {
  dropPending("invoice");
  const store = getStore();
  const run = startRun(businessId, "invoice");
  const tools = createTools(businessId);
  const eligible = tools.get_overdue_invoices();
  const created = [];

  for (const invoice of eligible) {
    const existingPending = store.drafts.find(
      (draft) => draft.agent === "invoice" && draft.recordId === invoice.id && draft.status === "pending",
    );
    if (existingPending) continue;
    const overdue = daysOverdue(invoice);
    const draft = tools.create_draft({
      agent: "invoice",
      recordId: invoice.id,
      subject: `Friendly reminder: invoice ${invoice.invoiceNumber} is overdue`,
      body: `Hi ${invoice.customerName},\n\nInvoice ${invoice.invoiceNumber} for SGD ${invoice.amountSgd.toFixed(2)} was due on ${invoice.dueDate.slice(0, 10)} (${overdue} day(s) overdue).\n\nPlease arrange payment at your earliest convenience.\n\nThank you`,
      rationale: `Unpaid invoice, ${overdue} day(s) past due. Facts taken from stored records.`,
    });
    created.push(draft);
    addLog({ agent: "invoice", agentRunId: run.id, invoiceId: invoice.id, action: "create_reminder_draft", result: draft.id });
  }

  finishRun(run, `eligible=${eligible.length}; drafts_created=${created.length}`);
  return { run, eligibleCount: eligible.length, drafts: created };
}

export async function runAgent(businessId: string) {
  return runInvoiceAgent(businessId);
}

export async function runGrantAgent(businessId: string) {
  dropPending("grant");
  const store = getStore();
  const run = startRun(businessId, "grant");
  const profile = getProfile(businessId);
  const tools = createTools(businessId);
  const matches = GRANT_CATALOG.map((grant) => ({ grant, verdict: grant.match(profile) })).filter((row) => row.verdict.ok);
  const created = [];

  for (const { grant, verdict } of matches) {
    const existing = store.drafts.find((d) => d.agent === "grant" && d.recordId === grant.id && d.status === "pending");
    if (existing) continue;
    const draft = tools.create_draft({
      agent: "grant",
      recordId: grant.id,
      subject: `Application checklist: ${grant.name}`,
      body: `${grant.summary}\nAgency: ${grant.agency}\nMatch: ${verdict.reason}\n\nChecklist:\n${grant.checklist.map((item, i) => `${i + 1}. ${item}`).join("\n")}`,
      rationale: `${verdict.reason} (score ${verdict.score}). Catalog rules only; not a funding decision.`,
    });
    created.push(draft);
    addLog({ agent: "grant", agentRunId: run.id, invoiceId: grant.id, action: "create_grant_checklist", result: grant.name });
  }

  finishRun(run, `matches=${matches.length}; drafts_created=${created.length}`);
  return { run, eligibleCount: matches.length, drafts: created, matches };
}

export async function runCustomerAgent(businessId: string) {
  dropPending("customer");
  const store = getStore();
  const run = startRun(businessId, "customer");
  const policy = getPolicy(businessId);
  const tools = createTools(businessId);
  const now = Date.now();
  const cutoff = policy.customerFollowUpDays * 24 * 60 * 60 * 1000;
  const eligible = store.customers.filter((customer) => {
    if (customer.businessId !== businessId) return false;
    if (!customer.lastContactAt) return true;
    return now - new Date(customer.lastContactAt).getTime() >= cutoff;
  });
  const created = [];

  for (const customer of eligible) {
    const existing = store.drafts.find((d) => d.agent === "customer" && d.recordId === customer.id && d.status === "pending");
    if (existing) continue;
    const draft = tools.create_draft({
      agent: "customer",
      recordId: customer.id,
      subject: `Checking in, ${customer.name}`,
      body: `Hi ${customer.name},\n\nIt has been a while since we last spoke. Would you like help with anything this month?\n\n${customer.notes ? `Internal note (do not invent extra facts): ${customer.notes}` : ""}\n\nBest regards`,
      rationale: `Last contact older than ${policy.customerFollowUpDays} days, or never contacted.`,
    });
    created.push(draft);
    addLog({ agent: "customer", agentRunId: run.id, invoiceId: customer.id, action: "create_followup_draft", result: customer.email });
  }

  finishRun(run, `eligible=${eligible.length}; drafts_created=${created.length}`);
  return { run, eligibleCount: eligible.length, drafts: created };
}

export async function runComplianceAgent(businessId: string) {
  dropPending("compliance");
  const store = getStore();
  const run = startRun(businessId, "compliance");
  const profile = getProfile(businessId);
  const tools = createTools(businessId);
  const applicable = COMPLIANCE_CATALOG.filter((req) => req.appliesWhen(profile));
  const created = [];

  for (const requirement of applicable) {
    const evidence = store.evidence.find(
      (row) => row.businessId === businessId && row.requirementId === requirement.id,
    );
    if (evidence && evidence.status !== "missing") continue;
    const existing = store.drafts.find((d) => d.agent === "compliance" && d.recordId === requirement.id && d.status === "pending");
    if (existing) continue;
    const draft = tools.create_draft({
      agent: "compliance",
      recordId: requirement.id,
      subject: `Gap: ${requirement.framework} — ${requirement.title}`,
      body: `${requirement.summary}\n\nSuggested next step: assign an owner, attach evidence later, and approve this review note.\nThis is a screening checklist, not legal advice.`,
      rationale: "Requirement applies to the current business profile and no evidence is stored yet.",
    });
    created.push(draft);
    addLog({ agent: "compliance", agentRunId: run.id, invoiceId: requirement.id, action: "flag_requirement", result: requirement.id });
  }

  finishRun(run, `applicable=${applicable.length}; gaps=${created.length}`);
  return { run, eligibleCount: created.length, drafts: created, applicable };
}

export async function runAppointmentAgent(businessId: string) {
  dropPending("appointment");
  const store = getStore();
  const run = startRun(businessId, "appointment");
  const policy = getPolicy(businessId);
  const tools = createTools(businessId);
  const horizon = policy.appointmentReminderHours * 60 * 60 * 1000;
  const now = Date.now();
  const eligible = store.appointments.filter((row) => {
    if (row.businessId !== businessId || row.status !== "booked") return false;
    const start = new Date(row.startsAt).getTime();
    return start > now && start - now <= horizon && row.reminderCount === 0;
  });
  const created = [];

  for (const appointment of eligible) {
    const existing = store.drafts.find((d) => d.agent === "appointment" && d.recordId === appointment.id && d.status === "pending");
    if (existing) continue;
    const draft = tools.create_draft({
      agent: "appointment",
      recordId: appointment.id,
      subject: `Reminder: appointment on ${appointment.startsAt.slice(0, 16)}`,
      body: `Hi ${appointment.customerName},\n\nThis is a reminder of your booking on ${new Date(appointment.startsAt).toLocaleString()}. Reply if you need to cancel or reschedule.\n\nThank you`,
      rationale: `Booking is within the ${policy.appointmentReminderHours}h reminder window and has not been reminded.`,
    });
    created.push(draft);
    addLog({ agent: "appointment", agentRunId: run.id, invoiceId: appointment.id, action: "create_booking_reminder", result: appointment.id });
  }

  finishRun(run, `eligible=${eligible.length}; drafts_created=${created.length}`);
  return { run, eligibleCount: eligible.length, drafts: created };
}

export async function runAllAgents(businessId: string) {
  const invoice = await runInvoiceAgent(businessId);
  const grant = await runGrantAgent(businessId);
  const customer = await runCustomerAgent(businessId);
  const compliance = await runComplianceAgent(businessId);
  const appointment = await runAppointmentAgent(businessId);
  return { invoice, grant, customer, compliance, appointment };
}

export async function runAgentsForKind(businessId: string, kind: string) {
  if (kind === "invoices") return runInvoiceAgent(businessId);
  if (kind === "customers") return runCustomerAgent(businessId);
  if (kind === "appointments") return runAppointmentAgent(businessId);
  return { skipped: true, reason: "No matching agent for this file type." };
}
