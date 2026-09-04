import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  bccList,
  buildAdminNewOrderEmail,
  buildOrderConfirmationEmail,
  buildOrderStatusEmail,
  defaultFromAddress,
  orderEmailFailureNote,
  resolveNotifyAddress,
} from "./email-rules";

const confirm = {
  orderId: "VG-TEST1",
  name: "Ali Khan",
  email: "ali@example.com",
  items: [{ name: "Charger", price: 1999, quantity: 1, variantName: "White" }],
  total: 1999,
  phone: "03001234567",
  address: "House 1, Street 2",
  city: "Lahore",
  postal: "54000",
};

describe("buildOrderConfirmationEmail", () => {
  it("uses a light shell, COD, items, address, and a track link", () => {
    const msg = buildOrderConfirmationEmail(confirm);
    assert.equal(msg.html.includes("#0b0f19"), false);
    assert.equal(msg.html.includes("VG-TEST1"), true);
    assert.equal(msg.html.includes("Charger"), true);
    assert.match(msg.html, /cash on delivery/i);
    assert.equal(msg.html.includes("House 1, Street 2"), true);
    assert.equal(
      msg.html.includes("/track?orderId=VG-TEST1&email=ali%40example.com"),
      true
    );
  });

  it("uses custom subject and body and still injects items and track", () => {
    const msg = buildOrderConfirmationEmail(confirm, {
      letters: { confirmed: { subject: "Got it {{orderId}}", body: "Hi {{name}}" } },
      theme: { button: "#cc0000" },
    });
    assert.equal(msg.subject, "Got it VG-TEST1");
    assert.match(msg.html, /Hi Ali Khan/);
    assert.equal(msg.html.includes("Charger"), true);
    assert.equal(msg.html.includes("House 1, Street 2"), true);
    assert.match(msg.html, /#cc0000/);
    assert.equal(msg.html.includes("cash on delivery"), false);
  });
});

describe("buildOrderStatusEmail", () => {
  it("shows the note and never includes phone or address", () => {
    const msg = buildOrderStatusEmail({
      orderId: "VG-TEST1",
      name: "Ali Khan",
      status: "shipped",
      note: "Tracking: PKG-1",
      email: "ali@example.com",
      phone: "03001234567",
      address: "House 1, Street 2",
    });
    assert.equal(msg.html.includes("#0b0f19"), false);
    assert.equal(msg.html.includes("Tracking: PKG-1"), true);
    assert.equal(msg.html.includes("03001234567"), false);
    assert.equal(msg.html.includes("House 1"), false);
    assert.equal(
      msg.html.includes("/track?orderId=VG-TEST1&email=ali%40example.com"),
      true
    );
  });

  it("uses custom shipped copy and still appends the note and track link", () => {
    const msg = buildOrderStatusEmail(
      {
        orderId: "VG-TEST1",
        name: "Ali Khan",
        status: "shipped",
        note: "Tracking: PKG-1",
        email: "ali@example.com",
      },
      { letters: { shipped: { subject: "Out {{orderId}}", body: "Packed for {{name}}" } } }
    );
    assert.equal(msg.subject, "Out VG-TEST1");
    assert.match(msg.html, /Packed for Ali Khan/);
    assert.equal(msg.html.includes("Tracking: PKG-1"), true);
    assert.equal(
      msg.html.includes("/track?orderId=VG-TEST1&email=ali%40example.com"),
      true
    );
  });
});

describe("buildAdminNewOrderEmail", () => {
  it("tells the owner a customer placed an order and includes contact details", () => {
    const msg = buildAdminNewOrderEmail(confirm);
    assert.match(msg.subject, /new order/i);
    assert.match(msg.html, /New customer order/);
    assert.equal(msg.html.includes("Ali Khan"), true);
    assert.equal(msg.html.includes("ali@example.com"), true);
    assert.equal(msg.html.includes("03001234567"), true);
    assert.equal(msg.html.includes("VG-TEST1"), true);
    assert.match(msg.html, /because a customer placed an order/);
  });

  it("uses custom owner copy and still injects contact and items", () => {
    const msg = buildAdminNewOrderEmail(confirm, {
      letters: { owner: { subject: "Sale {{orderId}}", body: "New from {{name}}" } },
    });
    assert.equal(msg.subject, "Sale VG-TEST1");
    assert.match(msg.html, /New from Ali Khan/);
    assert.equal(msg.html.includes("ali@example.com"), true);
    assert.equal(msg.html.includes("Charger"), true);
  });
});

describe("resolveNotifyAddress", () => {
  it("prefers env, then settings, and skips the customer address", () => {
    assert.equal(
      resolveNotifyAddress({
        envNotify: "owner@shop.pk",
        settingsEmail: "settings@shop.pk",
        customerEmail: "ali@example.com",
      }),
      "owner@shop.pk"
    );
    assert.equal(
      resolveNotifyAddress({
        envNotify: "  ",
        settingsEmail: "settings@shop.pk",
        customerEmail: "ali@example.com",
      }),
      "settings@shop.pk"
    );
    assert.equal(
      resolveNotifyAddress({
        envNotify: "Ali@example.com",
        settingsEmail: "settings@shop.pk",
        customerEmail: "ali@example.com",
      }),
      ""
    );
  });
});

describe("defaultFromAddress", () => {
  it("uses the spoken brand as the display name", () => {
    assert.equal(defaultFromAddress("Buy n Try"), "Buy n Try <no-reply@voltgear.store>");
  });
});

describe("orderEmailFailureNote", () => {
  it("is silent when both sends succeeded", () => {
    assert.equal(
      orderEmailFailureNote({ customerSent: true, adminSent: true, adminTo: "a@b.com" }),
      null
    );
  });

  it("names the failed letters", () => {
    const note = orderEmailFailureNote({
      customerSent: false,
      adminSent: false,
      adminTo: "a@b.com",
    });
    assert.match(note ?? "", /customer confirmation failed/);
    assert.match(note ?? "", /owner alert failed/);
  });
});

describe("bccList", () => {
  it("returns the notify address on confirmation when it differs from the customer", () => {
    assert.deepEqual(bccList("ali@example.com", "shop@voltgear.store"), [
      "shop@voltgear.store",
    ]);
  });

  it("returns empty when notify is missing or the same as the customer", () => {
    assert.deepEqual(bccList("ali@example.com", undefined), []);
    assert.deepEqual(bccList("ali@example.com", "  "), []);
    assert.deepEqual(bccList("ali@example.com", "Ali@example.com"), []);
  });
});
