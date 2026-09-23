import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  EMAIL_SEND_PURPOSES,
  formatSenderFrom,
  parseEmailSenderConfig,
  resolvePurposeFromAddress,
  senderFieldError,
} from "./email-sender-rules";

describe("EMAIL_SEND_PURPOSES", () => {
  it("lists every send job the shop can fire", () => {
    assert.deepEqual(
      EMAIL_SEND_PURPOSES.map((p) => p.kind),
      [
        "orderConfirmation",
        "ownerNewOrder",
        "orderStatus",
        "abandonedCart",
        "reviewRequest",
        "winback",
        "marketing",
      ]
    );
  });
});

describe("parseEmailSenderConfig", () => {
  it("keeps known mailboxes and drops junk keys", () => {
    assert.deepEqual(
      parseEmailSenderConfig({
        orderConfirmation: "  noreply@mail.buyntryy.com  ",
        mystery: "x@y.com",
        abandonedCart: "",
      }),
      { orderConfirmation: "noreply@mail.buyntryy.com" }
    );
  });
});

describe("senderFieldError", () => {
  it("accepts empty, a mailbox, or Name <mailbox>", () => {
    assert.equal(senderFieldError(""), null);
    assert.equal(senderFieldError("noreply@mail.buyntryy.com"), null);
    assert.equal(senderFieldError("Buy n Try <contact@mail.buyntryy.com>"), null);
  });

  it("rejects a non-email string", () => {
    assert.match(senderFieldError("not-an-email") ?? "", /valid email/i);
  });
});

describe("formatSenderFrom", () => {
  it("wraps a bare mailbox with the brand display name", () => {
    assert.equal(
      formatSenderFrom("noreply@mail.buyntryy.com", "Buy n Try"),
      "Buy n Try <noreply@mail.buyntryy.com>"
    );
  });

  it("keeps an already-formatted From header", () => {
    assert.equal(
      formatSenderFrom("Support <contact@mail.buyntryy.com>", "Buy n Try"),
      "Support <contact@mail.buyntryy.com>"
    );
  });
});

describe("resolvePurposeFromAddress", () => {
  it("uses the purpose mailbox when set", () => {
    assert.equal(
      resolvePurposeFromAddress({
        purpose: "orderConfirmation",
        senders: { orderConfirmation: "noreply@mail.buyntryy.com" },
        envFrom: "Buy n Try <onboarding@resend.dev>",
        brand: "Buy n Try",
      }),
      "Buy n Try <noreply@mail.buyntryy.com>"
    );
  });

  it("falls back to FROM_EMAIL when the purpose field is empty", () => {
    assert.equal(
      resolvePurposeFromAddress({
        purpose: "marketing",
        senders: { orderConfirmation: "noreply@mail.buyntryy.com" },
        envFrom: "Buy n Try <noreply@mail.buyntryy.com>",
        brand: "Buy n Try",
      }),
      "Buy n Try <noreply@mail.buyntryy.com>"
    );
  });
});
