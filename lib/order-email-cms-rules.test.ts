import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyEmailWrapper,
  emailBodyToHtml,
  parseOrderEmailConfig,
  wrapperHtmlIsUsable,
} from "./order-email-cms-rules";

describe("wrapperHtmlIsUsable", () => {
  it("requires title and body slots", () => {
    assert.equal(wrapperHtmlIsUsable("<div>{{title}}</div>"), false);
    assert.equal(wrapperHtmlIsUsable("<div>{{title}}{{body}}</div>"), true);
  });
});

describe("applyEmailWrapper", () => {
  it("falls back to the white card when wrapper slots are missing", () => {
    const html = applyEmailWrapper({
      theme: { wrapperHtml: "<p>broken</p>", background: "#111111" },
      title: "Hi",
      body: "<p>Body</p>",
      footer: "Foot",
      brand: "Buy n Try",
    });
    assert.match(html, /#111111/);
    assert.match(html, /Body/);
    assert.equal(html.includes("<p>broken</p>"), false);
  });

  it("uses wrapper HTML when both slots exist", () => {
    const html = applyEmailWrapper({
      theme: { wrapperHtml: "<section>{{title}} :: {{body}}</section>" },
      title: "Packed",
      body: "<p>OK</p>",
      footer: "Foot",
      brand: "Buy n Try",
    });
    assert.equal(html, "<section>Packed :: <p>OK</p></section>");
  });
});

describe("emailBodyToHtml", () => {
  it("escapes order data in placeholders", () => {
    const html = emailBodyToHtml("Hi {{name}}", { name: "<script>x</script>" });
    assert.equal(html.includes("<script>"), false);
    assert.match(html, /&lt;script&gt;/);
  });
});

describe("parseOrderEmailConfig", () => {
  it("keeps a custom confirmed subject", () => {
    const cfg = parseOrderEmailConfig({
      letters: { confirmed: { subject: "Got it {{orderId}}" } },
    });
    assert.equal(cfg.letters?.confirmed?.subject, "Got it {{orderId}}");
  });
});
