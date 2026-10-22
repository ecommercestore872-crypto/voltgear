import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { it } from "node:test";
import { EMAIL_SEND_ISSUE_PREFIX } from "./order-email-status";
import { EMAIL_SEND_ISSUE_PREFIX as legacyExport, orderEmailFailureNote } from "./email-rules";

it("keeps the email-history marker compatible with sender and admin readers", () => {
  assert.equal(EMAIL_SEND_ISSUE_PREFIX, "Email send issue:");
  assert.equal(legacyExport, EMAIL_SEND_ISSUE_PREFIX);
  assert.equal(orderEmailFailureNote({ customerSent: false, adminSent: true, adminTo: "fixture@example.test" }),
    `${EMAIL_SEND_ISSUE_PREFIX} customer confirmation failed.`);
});

it("keeps browser order rules outside the email signing dependency graph", () => {
  const rules = readFileSync(new URL("./db/order-rules.ts", import.meta.url), "utf8");
  assert.doesNotMatch(rules, /from\s+["']\.\.\/email-rules["']/);
  const marker = readFileSync(new URL("./order-email-status.ts", import.meta.url), "utf8");
  assert.doesNotMatch(marker, /^\s*import\s/m);
});
