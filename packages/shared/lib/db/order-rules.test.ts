import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Order } from "../types";
import {
  EMAIL_SEND_ISSUE_PREFIX,
  SHOPPER_CANCEL_NOTE,
  SHOPPER_CANCEL_WINDOW_MS,
  canShopperCancel,
  orderEmailIssueFromHistory,
  emailsMatch,
  isAllowedOrderStatus,
  shopperCancelBlockReason,
  shopperCancelUntil,
  shopperLookupNotFound,
  toAdminListRow,
  toAdminOrderListItem,
  toShopperTrackPayload,
  withStatusNote,
} from "./order-rules";

const sample: Order = {
  _id: "1",
  orderId: "VG-TEST1",
  createdAt: "2026-08-26T10:00:00.000Z",
  customer: {
    name: "Ali Khan",
    email: "ali@example.com",
    phone: "03001234567",
    address: "House 1, Street 2",
    city: "Lahore",
    postal: "54000",
  },
  items: [{ name: "Charger", price: 1999, quantity: 1, variantName: "White" }],
  payment: "cod",
  subtotal: 1999,
  shipping: 0,
  total: 1999,
  status: "new",
  statusHistory: [],
};

describe("toShopperTrackPayload", () => {
  it("never includes phone or address", () => {
    const payload = toShopperTrackPayload(sample);
    const json = JSON.stringify(payload);
    assert.equal(json.includes("03001234567"), false);
    assert.equal(json.includes("House 1"), false);
    assert.equal("customer" in payload, false);
    assert.equal(payload.orderId, "VG-TEST1");
    assert.equal(payload.items[0].name, "Charger");
  });
});

describe("shopperLookupNotFound", () => {
  it("treats a missing order as not found", () => {
    assert.equal(shopperLookupNotFound(null, "ali@example.com"), true);
  });

  it("treats a wrong email as not found (same as missing)", () => {
    assert.equal(shopperLookupNotFound(sample, "other@example.com"), true);
  });

  it("allows the checkout email", () => {
    assert.equal(shopperLookupNotFound(sample, "Ali@example.com"), false);
  });
});

describe("toAdminListRow", () => {
  it("only exposes table fields, not address", () => {
    const row = toAdminListRow(sample);
    assert.deepEqual(Object.keys(row).sort(), [
      "createdAt",
      "customerName",
      "orderId",
      "status",
      "total",
    ]);
    assert.equal(row.customerName, "Ali Khan");
    assert.equal("address" in row, false);
    assert.equal("phone" in row, false);
  });
});

describe("toAdminOrderListItem", () => {
  it("adds isDemo without changing the compact table keys", () => {
    const item = toAdminOrderListItem({ ...sample, isDemo: true });
    assert.equal(item.isDemo, true);
    assert.equal(item.customerEmail, "ali@example.com");
    const row = toAdminListRow({ ...sample, isDemo: true });
    assert.equal("isDemo" in row, false);
  });
});

describe("isAllowedOrderStatus", () => {
  it("accepts any of the five statuses", () => {
    for (const s of ["new", "processing", "shipped", "delivered", "cancelled"]) {
      assert.equal(isAllowedOrderStatus(s), true);
    }
    assert.equal(isAllowedOrderStatus("refunded"), false);
  });
});

describe("withStatusNote", () => {
  it("stores the note on the history entry when provided", () => {
    const entry = withStatusNote("shipped", "Tracking: PKG-1");
    assert.equal(entry.status, "shipped");
    assert.equal(entry.note, "Tracking: PKG-1");
    assert.ok(entry.at);
  });

  it("omits note when empty", () => {
    const entry = withStatusNote("delivered", "  ");
    assert.equal(entry.note, undefined);
  });
});

describe("emailsMatch", () => {
  it("compares emails case-insensitively", () => {
    assert.equal(emailsMatch("Ali@example.com", "ali@example.com"), true);
    assert.equal(emailsMatch("a@b.com", "c@d.com"), false);
  });
});

describe("canShopperCancel", () => {
  const now = new Date("2026-09-01T12:00:00.000Z");

  it("allows new orders within 24 hours", () => {
    const order = {
      ...sample,
      status: "new" as const,
      createdAt: "2026-09-01T11:00:00.000Z",
    };
    assert.equal(canShopperCancel(order, now), true);
  });

  it("allows processing orders within 24 hours", () => {
    const order = {
      ...sample,
      status: "processing" as const,
      createdAt: "2026-08-31T13:00:00.000Z",
    };
    assert.equal(canShopperCancel(order, now), true);
  });

  it("denies processing orders older than 24 hours", () => {
    const order = {
      ...sample,
      status: "processing" as const,
      createdAt: "2026-08-31T11:00:00.000Z",
    };
    assert.equal(canShopperCancel(order, now), false);
  });

  it("denies shipped even when fresh", () => {
    const order = {
      ...sample,
      status: "shipped" as const,
      createdAt: "2026-09-01T11:30:00.000Z",
    };
    assert.equal(canShopperCancel(order, now), false);
  });

  it("denies delivered and cancelled", () => {
    assert.equal(
      canShopperCancel(
        { ...sample, status: "delivered", createdAt: "2026-09-01T11:00:00.000Z" },
        now
      ),
      false
    );
    assert.equal(
      canShopperCancel(
        { ...sample, status: "cancelled", createdAt: "2026-09-01T11:00:00.000Z" },
        now
      ),
      false
    );
  });

  it("denies missing createdAt", () => {
    const order = { ...sample, createdAt: undefined as unknown as string };
    assert.equal(canShopperCancel(order, now), false);
  });
});

describe("shopperCancelUntil", () => {
  it("returns createdAt + 24h for new/processing", () => {
    const order = {
      ...sample,
      status: "new" as const,
      createdAt: "2026-09-01T10:00:00.000Z",
    };
    assert.equal(
      shopperCancelUntil(order),
      new Date(Date.parse(order.createdAt) + SHOPPER_CANCEL_WINDOW_MS).toISOString()
    );
  });

  it("returns null for shipped", () => {
    assert.equal(shopperCancelUntil({ ...sample, status: "shipped" }), null);
  });
});

describe("shopperCancelBlockReason", () => {
  const now = new Date("2026-09-01T12:00:00.000Z");

  it("returns null when cancellable", () => {
    assert.equal(
      shopperCancelBlockReason(
        { ...sample, status: "new", createdAt: "2026-09-01T11:00:00.000Z" },
        now
      ),
      null
    );
  });

  it("explains already cancelled", () => {
    assert.match(
      shopperCancelBlockReason(
        { ...sample, status: "cancelled", createdAt: "2026-09-01T11:00:00.000Z" },
        now
      ) ?? "",
      /already cancelled/i
    );
  });

  it("explains shipped or delivered", () => {
    assert.match(
      shopperCancelBlockReason(
        { ...sample, status: "shipped", createdAt: "2026-09-01T11:00:00.000Z" },
        now
      ) ?? "",
      /no longer be cancelled/i
    );
  });

  it("explains window ended", () => {
    assert.match(
      shopperCancelBlockReason(
        { ...sample, status: "new", createdAt: "2026-08-30T12:00:00.000Z" },
        now
      ) ?? "",
      /24-hour cancel window/i
    );
  });
});

describe("toShopperTrackPayload cancellable", () => {
  it("includes cancellable and cancelUntil", () => {
    const recent = {
      ...sample,
      status: "new" as const,
      createdAt: new Date().toISOString(),
    };
    const payload = toShopperTrackPayload(recent);
    assert.equal(payload.cancellable, true);
    assert.ok(payload.cancelUntil);
    assert.equal(typeof payload.cancelUntil, "string");

    const shipped = toShopperTrackPayload({ ...sample, status: "shipped" });
    assert.equal(shipped.cancellable, false);
    assert.equal(shipped.cancelUntil, null);
  });
});

describe("SHOPPER_CANCEL_NOTE", () => {
  it("is the fixed customer note", () => {
    assert.equal(SHOPPER_CANCEL_NOTE, "Cancelled by customer");
  });
});

describe("orderEmailIssueFromHistory", () => {
  it("returns the latest email send issue note", () => {
    const note = orderEmailIssueFromHistory([
      { status: "new", note: "Order placed" },
      { status: "new", note: `${EMAIL_SEND_ISSUE_PREFIX} customer confirmation failed.` },
    ]);
    assert.match(note ?? "", /customer confirmation failed/);
  });
});
