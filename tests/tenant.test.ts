import { describe, expect, it } from "vitest";
import { draftBelongsToTenant } from "../backend/src/services/drafts.js";
import type { AgentDraft } from "../backend/src/types.js";

const grantDraft = (businessId: string): AgentDraft => ({
  id: "d1",
  businessId,
  agent: "grant",
  recordId: "mra",
  invoiceId: "mra",
  subject: "Grant",
  body: "Checklist",
  status: "pending",
  generatedAt: new Date().toISOString(),
  rationale: "test",
});

describe("tenant drafts", () => {
  it("blocks another business from approving a grant draft", () => {
    expect(draftBelongsToTenant("biz-b", grantDraft("biz-a"))).toBe(false);
  });

  it("allows the owning business to approve its grant draft", () => {
    expect(draftBelongsToTenant("biz-a", grantDraft("biz-a"))).toBe(true);
  });
});
