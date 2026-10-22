import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  acknowledgeOrderListNavigation,
  createOrderListNavigationState,
  editOrderListNavigation,
  ordersListHref,
  recordOrderListNavigation,
} from "./admin-order-navigation-rules";

describe("admin order list navigation URLs", () => {
  it("omits default filters and searches below the server minimum", () => {
    for (const q of ["", "   ", " a "]) {
      assert.equal(
        ordersListHref("/admin/orders", { tab: "all", page: 1, q }),
        "/admin/orders",
      );
    }
  });

  it("includes a trimmed search with a status on page one", () => {
    assert.equal(
      ordersListHref("/admin/orders", {
        tab: "processing",
        page: 1,
        q: "  Ali Khan  ",
      }),
      "/admin/orders?tab=processing&q=Ali+Khan",
    );
  });

  it("preserves the tab and search when paginating", () => {
    assert.equal(
      ordersListHref("/admin/orders", {
        tab: "shipped",
        page: 3,
        q: "VG-123",
      }),
      "/admin/orders?tab=shipped&page=3&q=VG-123",
    );
  });

  it("encodes customer search text without creating extra parameters", () => {
    const href = ordersListHref("/operations/orders", {
      tab: "all",
      page: 2,
      q: "ali+orders@example.com & #42",
    });
    const url = new URL(href, "https://example.test");
    assert.equal(url.pathname, "/operations/orders");
    assert.deepEqual([...url.searchParams.entries()], [
      ["page", "2"],
      ["q", "ali+orders@example.com & #42"],
    ]);
  });
});

describe("admin order list navigation acknowledgements", () => {
  const ali = "/admin/orders?q=ali";
  const alice = "/admin/orders?q=alice";

  it("preserves a newer edit when the older request commits before its debounce", () => {
    let state = editOrderListNavigation(createOrderListNavigationState());
    state = recordOrderListNavigation(state, ali);
    state = editOrderListNavigation(state);

    const result = acknowledgeOrderListNavigation(state, ali);
    assert.equal(result.preserveDraft, true);
    assert.equal(result.state.revision, state.revision);

    state = recordOrderListNavigation(result.state, alice);
    assert.equal(acknowledgeOrderListNavigation(state, alice).preserveDraft, false);
  });

  it("preserves the newer submitted search when the older request commits", () => {
    let state = recordOrderListNavigation(createOrderListNavigationState(), ali);
    state = editOrderListNavigation(state);
    state = recordOrderListNavigation(state, alice);

    const old = acknowledgeOrderListNavigation(state, ali);
    assert.equal(old.preserveDraft, true);
    assert.equal(old.state.pending.has(alice), true);
    const latest = acknowledgeOrderListNavigation(old.state, alice);
    assert.equal(latest.preserveDraft, false);
    assert.equal(latest.state.pending.size, 0);
  });

  it("clears superseded requests when the latest request commits first", () => {
    let state = recordOrderListNavigation(createOrderListNavigationState(), ali);
    state = recordOrderListNavigation(state, alice);
    const latest = acknowledgeOrderListNavigation(state, alice);
    assert.equal(latest.preserveDraft, false);
    assert.equal(latest.state.pending.size, 0);
    assert.equal(acknowledgeOrderListNavigation(latest.state, ali).preserveDraft, false);
  });

  it("makes an unknown Back URL authoritative despite a newer draft", () => {
    let state = recordOrderListNavigation(createOrderListNavigationState(), alice);
    state = editOrderListNavigation(state);
    const back = acknowledgeOrderListNavigation(state, "/admin/orders?page=2");
    assert.equal(back.preserveDraft, false);
    assert.equal(back.state.pending.size, 0);
  });

  it("preserves a newer tab request with the typed search on an older acknowledgement", () => {
    let state = recordOrderListNavigation(createOrderListNavigationState(), ali);
    const tabHref = ordersListHref("/admin/orders", {
      tab: "shipped", page: 1, q: "ali",
    });
    state = recordOrderListNavigation(state, tabHref);
    const old = acknowledgeOrderListNavigation(state, ali);
    assert.equal(old.preserveDraft, true);
    assert.equal(old.state.pending.has(tabHref), true);
    assert.equal(acknowledgeOrderListNavigation(old.state, tabHref).preserveDraft, false);
  });

  it("bounds requests that Next supersedes without committing", () => {
    let state = createOrderListNavigationState();
    for (let index = 0; index < 100; index++) {
      state = recordOrderListNavigation(state, `/admin/orders?q=order${index}`);
    }
    assert.equal(state.pending.size, 32);
    assert.equal(state.pending.has("/admin/orders?q=order99"), true);
  });
});
