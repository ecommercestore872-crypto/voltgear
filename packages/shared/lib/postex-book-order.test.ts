import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PostExOrderPayload } from "@/lib/postex";
import type { Order } from "@/lib/types";

import {
  POSTEX_BOOKING_CONFLICT_MESSAGE,
  runPostExBookOrder,
  shouldReleasePostExBookingClaim,
  type PostExBookOrderDeps,
} from "./postex-book-order";
import {
  buildPostExOrderPayloadFromOrder,
  formatPostExOrderPayloadBuildError,
  toPostExOrderPayloadForApi,
} from "./postex-order-payload";

const OPERATIONAL_CITIES = ["Lahore", "Karachi", "Islamabad"];

const baseOrder = (): Order => ({
  _id: "uuid-1",
  orderId: "BNT-1001",
  createdAt: "2026-09-30T00:00:00.000Z",
  total: 2000,
  status: "new",
  customer: {
    name: "Customer",
    phone: "03001234567",
    address: "House 1, Street 2",
    city: "Lahore",
  },
  items: [{ name: "Widget", quantity: 1 }],
});

async function buildPayloadFromCanonicalBuilder(order: Order) {
  const built = buildPostExOrderPayloadFromOrder(order, OPERATIONAL_CITIES, {
    POSTEX_PICKUP_ADDRESS_CODE: "001",
  });
  if (!built.ok) {
    return {
      ok: false as const,
      status: 400,
      error: formatPostExOrderPayloadBuildError(built.missingOrInvalid),
    };
  }
  return { ok: true as const, payload: built.payload };
}

function deps(overrides: Partial<PostExBookOrderDeps> = {}): PostExBookOrderDeps {
  return {
    getOrder: async () => baseOrder(),
    buildPostExPayload: buildPayloadFromCanonicalBuilder,
    claimOrder: async () => true,
    releaseClaim: async () => {},
    completeBooking: async () => ({ ok: true }),
    createPostExOrder: async () => ({ ok: true, trackingNumber: "PX-123" }),
    now: () => "2026-09-30T12:00:00.000Z",
    ...overrides,
  };
}

describe("shouldReleasePostExBookingClaim", () => {
  it("releases on missing token and explicit PostEx errors", () => {
    assert.equal(
      shouldReleasePostExBookingClaim({
        ok: false,
        error: "PostEx API Token is missing.",
      }),
      true,
    );
    assert.equal(
      shouldReleasePostExBookingClaim({ ok: false, error: "PostEx error (400)" }),
      true,
    );
  });

  it("keeps claim on ambiguous failures", () => {
    assert.equal(
      shouldReleasePostExBookingClaim({
        ok: false,
        error: "PostEx booking succeeded but tracking number was missing in response.",
      }),
      false,
    );
    assert.equal(
      shouldReleasePostExBookingClaim({
        ok: false,
        error: "Failed to communicate with PostEx API.",
      }),
      false,
    );
  });
});

describe("runPostExBookOrder", () => {
  it("returns 409 when order already has tracking and does not call PostEx", async () => {
    let postExCalls = 0;
    const result = await runPostExBookOrder(
      "BNT-1001",
      deps({
        getOrder: async () => ({
          ...baseOrder(),
          postexTrackingNumber: "PX-EXISTING",
        }),
        createPostExOrder: async () => {
          postExCalls++;
          return { ok: true, trackingNumber: "PX-NEW" };
        },
      }),
    );
    assert.equal(result.status, 409);
    assert.equal(result.body.error, POSTEX_BOOKING_CONFLICT_MESSAGE);
    assert.equal(postExCalls, 0);
  });

  it("passes canonical normalized payload to createPostExOrder (lahore -> Lahore)", async () => {
    let captured: PostExOrderPayload | null = null;
    const order = baseOrder();
    order.customer = { ...order.customer!, city: "lahore" };

    const result = await runPostExBookOrder(
      "BNT-1001",
      deps({
        getOrder: async () => order,
        createPostExOrder: async (payload) => {
          captured = payload;
          return { ok: true, trackingNumber: "PX-777" };
        },
      }),
    );

    assert.equal(result.status, 200);
    assert.ok(captured);
    assert.equal(captured!.cityName, "Lahore");
    assert.equal(captured!.orderRefNumber, "BNT-1001");
    assert.equal(captured!.invoicePayment, 2000);
    assert.equal(captured!.items, 1);
    assert.equal(captured!.pickupAddressCode, "001");
  });

  it("uses the same mapper as dry-run before calling PostEx", async () => {
    let captured: PostExOrderPayload | null = null;
    const order = baseOrder();

    await runPostExBookOrder(
      "BNT-1001",
      deps({
        getOrder: async () => order,
        createPostExOrder: async (payload) => {
          captured = payload;
          return { ok: true, trackingNumber: "PX-1" };
        },
      }),
    );

    const built = buildPostExOrderPayloadFromOrder(order, OPERATIONAL_CITIES, {
      POSTEX_PICKUP_ADDRESS_CODE: "001",
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    assert.deepEqual(captured, toPostExOrderPayloadForApi(built.payload));
  });

  it("returns 400 for unsupported city before claiming or calling PostEx", async () => {
    let claimCalls = 0;
    let postExCalls = 0;
    const order = baseOrder();
    order.customer = { ...order.customer!, city: "Atlantis" };

    const result = await runPostExBookOrder(
      "BNT-1001",
      deps({
        getOrder: async () => order,
        claimOrder: async () => {
          claimCalls++;
          return true;
        },
        createPostExOrder: async () => {
          postExCalls++;
          return { ok: true, trackingNumber: "PX-1" };
        },
      }),
    );

    assert.equal(result.status, 400);
    assert.match(String(result.body.error), /not a PostEx operational city/i);
    assert.equal(claimCalls, 0);
    assert.equal(postExCalls, 0);
  });

  it("claims atomically then calls PostEx once on success", async () => {
    let claimCalls = 0;
    let postExCalls = 0;
    let completed: { tracking: string; shippedAt: string } | null = null;

    const result = await runPostExBookOrder(
      "BNT-1001",
      deps({
        claimOrder: async (_id, claimedAt) => {
          claimCalls++;
          assert.equal(claimedAt, "2026-09-30T12:00:00.000Z");
          return true;
        },
        createPostExOrder: async () => {
          postExCalls++;
          return { ok: true, trackingNumber: "PX-999" };
        },
        completeBooking: async (_id, trackingNumber, shippedAt) => {
          completed = { tracking: trackingNumber, shippedAt };
          return { ok: true };
        },
      }),
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.trackingNumber, "PX-999");
    assert.equal(claimCalls, 1);
    assert.equal(postExCalls, 1);
    assert.deepEqual(completed, {
      tracking: "PX-999",
      shippedAt: "2026-09-30T12:00:00.000Z",
    });
  });

  it("returns 409 when claim fails and does not call PostEx", async () => {
    let postExCalls = 0;
    const result = await runPostExBookOrder(
      "BNT-1001",
      deps({
        claimOrder: async () => false,
        createPostExOrder: async () => {
          postExCalls++;
          return { ok: true, trackingNumber: "PX-1" };
        },
      }),
    );
    assert.equal(result.status, 409);
    assert.equal(postExCalls, 0);
  });

  it("releases claim on definite PostEx failure before shipment", async () => {
    let released = false;
    const result = await runPostExBookOrder(
      "BNT-1001",
      deps({
        createPostExOrder: async () => ({
          ok: false,
          error: "PostEx error (422): invalid city",
        }),
        releaseClaim: async () => {
          released = true;
        },
      }),
    );
    assert.equal(result.status, 400);
    assert.equal(released, true);
  });

  it("keeps claim on ambiguous PostEx failure", async () => {
    let released = false;
    const result = await runPostExBookOrder(
      "BNT-1001",
      deps({
        createPostExOrder: async () => ({
          ok: false,
          error: "Failed to communicate with PostEx API.",
        }),
        releaseClaim: async () => {
          released = true;
        },
      }),
    );
    assert.equal(result.status, 503);
    assert.equal(released, false);
  });

  it("keeps claim when PostEx succeeds but DB persist fails", async () => {
    let released = false;
    const result = await runPostExBookOrder(
      "BNT-1001",
      deps({
        completeBooking: async () => ({
          ok: false,
          error: "Could not save PostEx tracking on the order.",
        }),
        releaseClaim: async () => {
          released = true;
        },
      }),
    );
    assert.equal(result.status, 503);
    assert.equal(released, false);
  });

  it("allows only one concurrent winner through the claim gate", async () => {
    let claimCount = 0;
    let postExCalls = 0;
    const claimOrder = async () => {
      claimCount++;
      return claimCount === 1;
    };

    const shared = deps({
      claimOrder,
      createPostExOrder: async () => {
        postExCalls++;
        return { ok: true, trackingNumber: "PX-CONC" };
      },
    });

    const [a, b] = await Promise.all([
      runPostExBookOrder("BNT-1001", shared),
      runPostExBookOrder("BNT-1001", shared),
    ]);

    const statuses = [a.status, b.status].sort();
    assert.deepEqual(statuses, [200, 409]);
    assert.equal(postExCalls, 1);
  });
});
