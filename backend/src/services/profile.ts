import { GRANT_CATALOG } from "../../../agents/catalogs/grants.js";
import { COMPLIANCE_CATALOG } from "../../../agents/catalogs/compliance.js";
import type { BusinessProfile } from "../types.js";
import { getProfile, getStore } from "./store.js";

export function enrichProfile(businessId: string): BusinessProfile {
  const base = { ...getProfile(businessId) };
  const store = getStore();
  let staff = 0;
  let industry = base.industry;
  const deskRows =
    store.invoices.filter((row) => row.businessId === businessId).length +
    store.customers.filter((row) => row.businessId === businessId).length +
    store.appointments.filter((row) => row.businessId === businessId).length;
  let usesDigitalTools = base.usesDigitalTools || deskRows > 0;

  for (const file of store.imports.filter((row) => row.businessId === businessId)) {
    const blob = `${file.filename} ${(file.headers ?? []).join(" ")}`.toLowerCase();
    if (/employee_id|employee_name|payroll|gusto|staff/.test(blob)) {
      const ids = new Set(
        file.rows.map((row) => row.employee_id || row.employee_name || row.name).filter((value) => value && value.trim()),
      );
      staff = Math.max(staff, ids.size);
    }
    if (!industry && /barista|fnb|f&b|kopi|bakery|cafe|gusto|payroll/.test(blob)) industry = "F&B";
    if (/software|saas|digital|pos/.test(blob)) {
      usesDigitalTools = true;
      if (!industry) industry = "software";
    }
  }

  return {
    ...base,
    industry,
    employeeCount: Math.max(base.employeeCount, staff),
    usesDigitalTools,
  };
}

export function grantMatches(businessId: string) {
  const profile = enrichProfile(businessId);
  return GRANT_CATALOG.map((grant) => ({
    id: grant.id,
    name: grant.name,
    agency: grant.agency,
    summary: grant.summary,
    checklist: grant.checklist,
    match: grant.match(profile),
  }));
}

export function complianceItems(businessId: string) {
  const profile = enrichProfile(businessId);
  const store = getStore();
  return COMPLIANCE_CATALOG.map((item) => {
    const evidence = store.evidence.find((row) => row.businessId === businessId && row.requirementId === item.id);
    const applies = item.appliesWhen(profile);
    return {
      id: item.id,
      framework: item.framework,
      title: item.title,
      summary: item.summary,
      applies,
      evidenceStatus: evidence?.status ?? (applies ? "missing" : "not_required"),
    };
  });
}
