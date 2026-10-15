import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { sendBulk } from "./messaging";

describe("sendBulk", () => {
  test("preserves recipient order across concurrent workers", async () => {
    const previousProvider = process.env.MSG_PROVIDER;
    const previousInfo = console.info;
    process.env.MSG_PROVIDER = "";
    console.info = () => undefined;
    try {
      const recipients = [
        { phone: "+923001111111", name: "A" },
        { phone: "+923002222222", name: "B" },
        { phone: "+923003333333", name: "C" },
      ];
      const results = await sendBulk(recipients, "Hello {name}", {
        concurrency: 3,
      });
      assert.deepEqual(
        results.map((result) => result.phone),
        recipients.map((recipient) => recipient.phone),
      );
    } finally {
      console.info = previousInfo;
      if (previousProvider === undefined) delete process.env.MSG_PROVIDER;
      else process.env.MSG_PROVIDER = previousProvider;
    }
  });
});
