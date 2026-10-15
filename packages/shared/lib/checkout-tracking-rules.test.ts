import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { readMetaCookieIds } from "./checkout-tracking-rules";

describe("readMetaCookieIds", () => {
  test("extracts Meta identifiers without including unrelated cookies", () => {
    assert.deepEqual(
      readMetaCookieIds("session=private; _fbp=fb.1.123; _fbc=fb.1.click; theme=dark"),
      { fbp: "fb.1.123", fbc: "fb.1.click" },
    );
  });

  test("returns no identifiers when Meta cookies are absent", () => {
    assert.deepEqual(readMetaCookieIds("session=private"), {});
  });
});
