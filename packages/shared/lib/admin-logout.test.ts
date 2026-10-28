import assert from "node:assert/strict";
import { it } from "node:test";
import { completeAdminLogout } from "./admin-logout";

it("keeps local state and navigation when logout fails or its result is uncertain", async () => {
  for (const request of [async () => { throw new Error("503"); }, async () => { throw new TypeError("Network failure"); },
    ...[null, undefined, {}, { ok: false }].map((result) => async () => result)]) {
    const effects: string[] = [];
    await assert.rejects(completeAdminLogout({ request,
      clearLocalToken: () => { effects.push("clear"); }, navigate: () => { effects.push("navigate"); } }));
    assert.deepEqual(effects, []);
  }
});
it("clears local state then navigates only after a confirmed logout", async () => {
  const effects: string[] = [];
  await completeAdminLogout({ request: async () => { effects.push("confirmed"); return { ok: true }; },
    clearLocalToken: () => { effects.push("clear"); }, navigate: () => { effects.push("navigate"); } });
  assert.deepEqual(effects, ["confirmed", "clear", "navigate"]);
});
