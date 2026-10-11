import { describe, expect, it } from "vitest";
import { ingestCsv } from "../backend/src/services/ingest.js";
import { getStore } from "../backend/src/services/store.js";

describe("csv ingest", () => {
  it("replaces older customer rows so pages match the latest file", () => {
    const businessId = `biz-${crypto.randomUUID()}`;
    ingestCsv(businessId, "name,email\nOld Co,old@example.com\n", "customers.csv", "customers");
    ingestCsv(businessId, "name,email\nNew Co,new@example.com\n", "customers.csv", "customers");
    const customers = getStore().customers.filter((row) => row.businessId === businessId);
    expect(customers.map((row) => row.email)).toEqual(["new@example.com"]);
  });
});
