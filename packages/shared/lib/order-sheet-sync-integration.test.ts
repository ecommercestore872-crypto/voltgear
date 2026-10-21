import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();
const sender = readFileSync(
  join(root, "packages/shared/lib/order-sheet-sync.ts"),
  "utf8",
);
const receiver = readFileSync(
  join(root, "integrations/google-apps-script/WebsiteSync.gs"),
  "utf8",
);

describe("order sheet synchronization integration", () => {
  it("only reads canonical orders and never writes to the website database", () => {
    assert.match(sender, /getOrderByPublicId\(orderId\)/);
    assert.doesNotMatch(sender, /order-sheet-sync-store|\.from\(|\.rpc\(|\.insert\(|\.update\(|\.delete\(/);
    assert.match(sender, /if \(order.isDemo\)/);
  });

  it("requires signed fresh requests and never touches the Ads sheet", () => {
    assert.match(receiver, /computeHmacSha256Signature/);
    assert.match(receiver, /maximumClockSkewMs/);
    assert.match(receiver, /Invalid signature/);
    assert.doesNotMatch(receiver, /getSheetByName\(['"]Ads['"]\)/);
  });

  it("preserves operator-managed financial columns on updates", () => {
    assert.match(receiver, /const productCost = existing/);
    assert.match(receiver, /const courierCost = existing/);
    assert.match(receiver, /const received = existing/);
  });
});
