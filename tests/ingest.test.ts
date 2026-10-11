import { describe, expect, it } from "vitest";
import { deleteImportedDataset, ingestCsv } from "../backend/src/services/ingest.js";
import { getStore } from "../backend/src/services/store.js";

describe("csv ingest", () => {
  it("replaces older customer rows so pages match the latest file", () => {
    const businessId = `biz-${crypto.randomUUID()}`;
    ingestCsv(businessId, "name,email\nOld Co,old@example.com\n", "customers.csv", "customers");
    ingestCsv(businessId, "name,email\nNew Co,new@example.com\n", "customers.csv", "customers");
    const customers = getStore().customers.filter((row) => row.businessId === businessId);
    expect(customers.map((row) => row.email)).toEqual(["new@example.com"]);
  });

  it("deletes every customer row when the customer file is removed", () => {
    const businessId = `biz-${crypto.randomUUID()}`;
    const result = ingestCsv(businessId, "name,email\nAcme,acme@example.com\n", "customers.csv", "customers");
    const removed = deleteImportedDataset(businessId, result.file.id);
    expect(removed.removed.customers).toBe(1);
    expect(getStore().customers.filter((row) => row.businessId === businessId)).toHaveLength(0);
  });
});
