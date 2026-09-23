import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_INVOICE_TEMPLATE,
  invoiceFileTitle,
  invoiceLineTotal,
  invoiceTemplateOverrides,
  invoiceTotals,
  isInvoicePath,
  mergeInvoiceTemplate,
  parseInvoiceTemplate,
  resolveInvoiceIdentity,
} from "./invoice-template-rules";

describe("parseInvoiceTemplate", () => {
  it("keeps only set fields and rejects invalid accent colors", () => {
    const parsed = parseInvoiceTemplate({
      documentTitle: " Tax Invoice ",
      accent: "purple",
      footer: "Paid in full",
      notes: "",
    });
    assert.equal(parsed.documentTitle, "Tax Invoice");
    assert.equal(parsed.accent, undefined);
    assert.equal(parsed.footer, "Paid in full");
    assert.equal(parsed.notes, undefined);
  });
});

describe("mergeInvoiceTemplate", () => {
  it("overlays backend values onto the code template", () => {
    const merged = mergeInvoiceTemplate({
      accent: "#0F2A1C",
      companyName: "Buy n Try",
    });
    assert.equal(merged.accent, "#0F2A1C");
    assert.equal(merged.companyName, "Buy n Try");
    assert.equal(merged.documentTitle, DEFAULT_INVOICE_TEMPLATE.documentTitle);
    assert.equal(merged.footer, DEFAULT_INVOICE_TEMPLATE.footer);
  });
});

describe("invoiceTemplateOverrides", () => {
  it("stores only fields that differ from the code template", () => {
    const overrides = invoiceTemplateOverrides({
      documentTitle: DEFAULT_INVOICE_TEMPLATE.documentTitle,
      accent: "#0F2A1C",
      footer: DEFAULT_INVOICE_TEMPLATE.footer,
      companyName: "Outlet",
    });
    assert.deepEqual(overrides, { accent: "#0F2A1C", companyName: "Outlet" });
  });
});

describe("resolveInvoiceIdentity", () => {
  it("prefers template fields, then store settings, then brand fallback", () => {
    const fromSettings = resolveInvoiceIdentity(mergeInvoiceTemplate({}), {
      brandName: "Store Co",
      email: "hi@store.co",
      phone: "0300",
      address: "Lahore",
    });
    assert.equal(fromSettings.name, "Store Co");
    assert.equal(fromSettings.email, "hi@store.co");

    const fromTemplate = resolveInvoiceIdentity(
      mergeInvoiceTemplate({ companyName: "BNT Outlet", companyEmail: "a@b.c" }),
      { brandName: "Store Co", email: "hi@store.co" }
    );
    assert.equal(fromTemplate.name, "BNT Outlet");
    assert.equal(fromTemplate.email, "a@b.c");
  });
});

describe("invoiceTotals", () => {
  it("does not invent tax and only shows subtotal when shipping or a gap exists", () => {
    const simple = invoiceTotals({
      items: [{ name: "Watch", price: 2000, quantity: 1 }],
      total: 2000,
    });
    assert.equal(simple.total, 2000);
    assert.equal(simple.shipping, 0);
    assert.equal(simple.showSubtotal, false);
    assert.equal(invoiceLineTotal({ price: 500, quantity: 2 }), 1000);

    const shipped = invoiceTotals({
      items: [{ name: "Watch", price: 2000, quantity: 1 }],
      subtotal: 2000,
      shipping: 199,
      total: 2199,
    });
    assert.equal(shipped.showSubtotal, true);
    assert.equal(shipped.shipping, 199);
    assert.equal(shipped.total, 2199);
  });
});

describe("invoice path helpers", () => {
  it("detects invoice routes and builds a download title", () => {
    assert.equal(isInvoicePath("/order/BNT-1/invoice"), true);
    assert.equal(isInvoicePath("/order/BNT-1"), false);
    assert.equal(invoiceFileTitle("BNT-1042"), "Invoice-BNT-1042");
  });
});
