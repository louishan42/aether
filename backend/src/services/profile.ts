import { GRANT_CATALOG } from "../../../agents/catalogs/grants.js";
import { COMPLIANCE_CATALOG } from "../../../agents/catalogs/compliance.js";
import type { BusinessProfile } from "../types.js";
import { getProfile, getStore } from "./store.js";

export function profileReady(profile: BusinessProfile) {
  return Boolean(profile.industry?.trim());
}

export function enrichProfile(businessId: string): BusinessProfile {
  return { ...getProfile(businessId) };
}

export function grantMatches(businessId: string) {
  const profile = enrichProfile(businessId);
  if (!profileReady(profile)) return [];
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
  if (!profileReady(profile)) return [];
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
