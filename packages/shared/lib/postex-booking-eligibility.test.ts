import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Order } from "./types";
import { runPostExBookOrder, type PostExBookOrderDeps } from "./postex-book-order";

describe("PostEx live booking eligibility", () => {
  it("rejects terminal, dispatched and demo orders before payload/provider/claim work", async () => {
    for (const status of ["new", "processing", "shipped", "delivered", "cancelled"] as const) {
      for (const isDemo of [false, true]) {
        if (!isDemo && ["new", "processing"].includes(status)) continue;
        const unexpected = async (): Promise<never> => { throw new Error("Side effect reached"); };
        const dependencies: PostExBookOrderDeps = {
          getOrder: async () => ({ orderId: "BNT-TEST", status, isDemo }) as Order,
          buildPostExPayload: unexpected, claimOrder: unexpected, releaseClaim: unexpected,
          createPostExOrder: unexpected, completeBooking: unexpected,
        };
        assert.equal((await runPostExBookOrder("BNT-TEST", dependencies)).status, 409);
      }
    }
  });

  it("rejects malformed order ids as validation errors", async () => {
    const unexpected = async (): Promise<never> => { throw new Error("Lookup reached"); };
    const dependencies = { getOrder: unexpected } as unknown as PostExBookOrderDeps;
    for (const value of [null, 12, {}, " "]) {
      assert.equal((await runPostExBookOrder(value as string, dependencies)).status, 400);
    }
  });
});
