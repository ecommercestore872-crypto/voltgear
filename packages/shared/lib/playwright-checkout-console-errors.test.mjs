import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  classifyCheckoutConsoleErrors,
  expectedStatusBag,
  isCheckoutApiUrl,
  parseFailedResourceStatus,
} from "./playwright-checkout-console-errors.mjs";

describe("playwright-checkout-console-errors", () => {
  const expectedTrio = [
    { status: 409, url: "https://preview.example/api/checkout" },
    { status: 429, url: "https://preview.example/api/checkout" },
    { status: 500, url: "https://preview.example/api/checkout" },
  ];

  it("parses Chromium failed-resource status codes", () => {
    assert.equal(
      parseFailedResourceStatus(
        "Failed to load resource: the server responded with a status of 409 (Conflict)",
      ),
      409,
    );
    assert.equal(
      parseFailedResourceStatus(
        "Failed to load resource: the server responded with a status of 429 (Too Many Requests)",
      ),
      429,
    );
    assert.equal(parseFailedResourceStatus("TypeError: boom"), null);
  });

  it("recognizes checkout API URLs only", () => {
    assert.equal(isCheckoutApiUrl("https://x.test/api/checkout"), true);
    assert.equal(isCheckoutApiUrl("https://x.test/api/checkout?x=1"), true);
    assert.equal(isCheckoutApiUrl("https://x.test/api/orders"), false);
  });

  it("does not fail the gate on intended mocked checkout 409/429/500 console noise", () => {
    const result = classifyCheckoutConsoleErrors(
      [
        "Failed to load resource: the server responded with a status of 409 (Conflict)",
        "Failed to load resource: the server responded with a status of 429 (Too Many Requests)",
        "Failed to load resource: the server responded with a status of 500 (Internal Server Error)",
      ],
      expectedTrio,
    );
    assert.deepEqual(result.unexpected, []);
    assert.deepEqual(result.matchedExpectedStatuses, [409, 429, 500]);
    assert.deepEqual(result.remainingExpected, {});
  });

  it("still fails on an extra 500 beyond intercepted checkout mocks", () => {
    const result = classifyCheckoutConsoleErrors(
      [
        "Failed to load resource: the server responded with a status of 500 (Internal Server Error)",
        "Failed to load resource: the server responded with a status of 500 (Internal Server Error)",
      ],
      [{ status: 500, url: "https://preview.example/api/checkout" }],
    );
    assert.equal(result.matchedExpectedStatuses.length, 1);
    assert.equal(result.unexpected.length, 1);
    assert.match(result.unexpected[0] ?? "", /status of 500/);
  });

  it("still fails on genuine unexpected JavaScript / console errors", () => {
    const result = classifyCheckoutConsoleErrors(
      [
        "Failed to load resource: the server responded with a status of 409 (Conflict)",
        "TypeError: Cannot read properties of undefined (reading 'map')",
        "Uncaught Error: hydration failed",
      ],
      [{ status: 409, url: "https://preview.example/api/checkout" }],
    );
    assert.deepEqual(result.matchedExpectedStatuses, [409]);
    assert.equal(result.unexpected.length, 2);
    assert.match(result.unexpected[0] ?? "", /TypeError/);
    assert.match(result.unexpected[1] ?? "", /hydration/);
  });

  it("does not treat non-checkout expected entries as consumable", () => {
    const bag = expectedStatusBag([
      { status: 500, url: "https://preview.example/api/other" },
    ]);
    assert.equal(bag.size, 0);

    const result = classifyCheckoutConsoleErrors(
      [
        "Failed to load resource: the server responded with a status of 500 (Internal Server Error)",
      ],
      [{ status: 500, url: "https://preview.example/api/other" }],
    );
    assert.equal(result.unexpected.length, 1);
  });
});
