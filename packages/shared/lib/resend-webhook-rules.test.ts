import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseResendWebhookPayload,
  suppressionReasonFromResendKind,
  verifySvixWebhookSignature,
} from "./resend-webhook-rules";

describe("parseResendWebhookPayload", () => {
  it("extracts bounce recipients", () => {
    const parsed = parseResendWebhookPayload({
      type: "email.bounced",
      data: { to: [" Shopper@Example.com "] },
    });
    assert.ok(parsed);
    assert.equal(parsed.kind, "email.bounced");
    assert.deepEqual(parsed.emails, ["shopper@example.com"]);
  });

  it("ignores non-suppression events", () => {
    assert.equal(parseResendWebhookPayload({ type: "email.delivered", data: {} }), null);
  });
});

describe("suppressionReasonFromResendKind", () => {
  it("maps complaint vs bounce", () => {
    assert.equal(suppressionReasonFromResendKind("email.complained"), "complaint");
    assert.equal(suppressionReasonFromResendKind("email.bounced"), "bounce");
  });
});

describe("verifySvixWebhookSignature", () => {
  it("rejects missing headers", () => {
    assert.equal(
      verifySvixWebhookSignature({
        rawBody: "{}",
        svixId: null,
        svixTimestamp: "1",
        svixSignature: "v1,x",
        secret: "whsec_abc",
      }),
      false,
    );
  });
});
