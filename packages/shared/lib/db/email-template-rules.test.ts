import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateEmailTemplate } from "./email-template-rules";

describe("validateEmailTemplate", () => {
  it("requires a name", () => {
    const r = validateEmailTemplate({ name: "  ", subject: "Hi", bodyText: "Body" });
    assert.equal(r.ok, false);
  });

  it("accepts a valid template", () => {
    const r = validateEmailTemplate({
      name: "Promo",
      subject: "Hello",
      bodyText: "Shop now",
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.data.name, "Promo");
      assert.equal(r.data.bodyText, "Shop now");
    }
  });
});
