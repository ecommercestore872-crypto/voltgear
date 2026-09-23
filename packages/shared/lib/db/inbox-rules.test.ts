import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseInboxKind, validateContactSubmission } from "./inbox-rules";

describe("validateContactSubmission", () => {
  it("requires name, email, and message", () => {
    const bad = validateContactSubmission({ name: "", email: "a@b.com", message: "hi" });
    assert.equal(bad.ok, false);
  });

  it("accepts a contact and defaults kind", () => {
    const ok = validateContactSubmission({
      name: "Ali",
      email: "ali@example.com",
      subject: "Help",
      message: "Need order help",
    });
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.data.kind, "contact");
      assert.equal(ok.data.name, "Ali");
    }
  });

  it("accepts complaint kind", () => {
    assert.equal(parseInboxKind("complaint"), "complaint");
    const ok = validateContactSubmission({
      name: "Sara",
      email: "s@example.com",
      message: "Broken item",
      kind: "complaint",
    });
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.data.kind, "complaint");
  });
});
