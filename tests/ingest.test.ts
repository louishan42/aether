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

  it("keeps payroll files as review data instead of fake invoices", () => {
    const businessId = `biz-${crypto.randomUUID()}`;
    const result = ingestCsv(
      businessId,
      "pay_date,employee_id,employee_name,role,type,amount,account\n2022-02-15,E001,Alice Smith,Barista,Employee Pay,1865,Checking\n",
      "gusto_payroll.csv",
    );
    expect(result.kind).toBe("custom");
    expect(result.agentReady).toBe(false);
    const invoices = getStore().invoices.filter((row) => row.businessId === businessId);
    expect(invoices).toHaveLength(0);
  });

  it("maps a real invoice sheet to the collections agent", () => {
    const businessId = `biz-${crypto.randomUUID()}`;
    const result = ingestCsv(
      businessId,
      "invoice_number,customer_name,customer_email,amount_sgd,due_date,status\nINV-9,New Co,new@example.com,50,2026-01-01,unpaid\n",
      "invoices.csv",
    );
    expect(result.kind).toBe("invoices");
    expect(result.agentReady).toBe(true);
    const invoices = getStore().invoices.filter((row) => row.businessId === businessId);
    expect(invoices[0]?.customerName).toBe("New Co");
  });

  it("deletes every customer row when the customer file is removed", () => {
    const businessId = `biz-${crypto.randomUUID()}`;
    const result = ingestCsv(businessId, "name,email\nAcme,acme@example.com\n", "customers.csv", "customers");
    const removed = deleteImportedDataset(businessId, result.file.id);
    expect(removed.removed.customers).toBe(1);
    expect(getStore().customers.filter((row) => row.businessId === businessId)).toHaveLength(0);
  });
});
