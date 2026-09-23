import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { shouldLoadClarity } from "./clarity-rules";

describe("shouldLoadClarity", () => {
  it("loads on the live shop host when an id is set", () => {
    assert.equal(
      shouldLoadClarity({
        id: "y9fzz5qrvo",
        isAdmin: false,
        host: "voltgear-coral.vercel.app",
      }),
      true
    );
  });

  it("does not load without an id, on admin, or on localhost", () => {
    assert.equal(
      shouldLoadClarity({
        id: "",
        isAdmin: false,
        host: "voltgear-coral.vercel.app",
      }),
      false
    );
    assert.equal(
      shouldLoadClarity({
        id: "y9fzz5qrvo",
        isAdmin: true,
        host: "voltgear-coral.vercel.app",
      }),
      false
    );
    assert.equal(
      shouldLoadClarity({
        id: "y9fzz5qrvo",
        isAdmin: false,
        host: "localhost:3000",
      }),
      false
    );
  });
});
