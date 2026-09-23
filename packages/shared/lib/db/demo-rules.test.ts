import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  guestCanSee,
  isPurgeable,
  isValidDemoLogin,
  orderIsDemo,
} from "./demo-rules";

describe("isValidDemoLogin", () => {
  it("accepts only username demo and password demo", () => {
    assert.equal(isValidDemoLogin("demo", "demo"), true);
    assert.equal(isValidDemoLogin("Demo", "demo"), true);
    assert.equal(isValidDemoLogin("demo", "Demo"), false);
    assert.equal(isValidDemoLogin("admin", "demo"), false);
  });
});

describe("guestCanSee", () => {
  it("hides demo catalog from guests and shows it in a demo session", () => {
    assert.equal(guestCanSee({ isDemo: true }, false), false);
    assert.equal(guestCanSee({ isDemo: false }, false), true);
    assert.equal(guestCanSee({ isDemo: true }, true), true);
    assert.equal(guestCanSee({ isDemo: false }, true), true);
  });
});

describe("orderIsDemo", () => {
  it("marks the order demo whenever the session is demo, even for a live product", () => {
    assert.equal(orderIsDemo(true, false), true);
    assert.equal(orderIsDemo(true, true), true);
    assert.equal(orderIsDemo(false, true), false);
    assert.equal(orderIsDemo(false, false), false);
  });
});

describe("isPurgeable", () => {
  it("only demo rows, never hero or settings", () => {
    assert.equal(isPurgeable({ kind: "product", isDemo: true }), true);
    assert.equal(isPurgeable({ kind: "order", isDemo: false }), false);
    assert.equal(isPurgeable({ kind: "hero", isDemo: true }), false);
    assert.equal(isPurgeable({ kind: "settings", isDemo: true }), false);
  });
});
