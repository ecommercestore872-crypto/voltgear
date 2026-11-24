import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cityMetaDescription,
  cleanFaq,
  guideParagraphs,
  productKeySpec,
  productSeoTitle,
  resolveCategorySeo,
} from "./onpage-seo";

describe("productSeoTitle", () => {
  it("uses the pattern with a real spec", () => {
    assert.equal(
      productSeoTitle({ name: "Anker Power Bank", specifications: [{ label: "Capacity", value: "20000mAh" }] }),
      "Anker Power Bank 20000mAh Price in Pakistan | Buy n Try",
    );
  });
  it("omits the spec when there is none or the name already has it", () => {
    assert.equal(productSeoTitle({ name: "Mic" }), "Mic Price in Pakistan | Buy n Try");
    assert.equal(
      productSeoTitle({ name: "Power Bank 20000mAh", specifications: [{ label: "Capacity", value: "20000 mAh" }] }),
      "Power Bank 20000mAh Price in Pakistan | Buy n Try",
    );
  });
  it("admin override wins", () => {
    assert.equal(productSeoTitle({ name: "X", seoTitle: "  Custom  " }), "Custom");
  });
  it("ignores empty or long spec values", () => {
    assert.equal(productKeySpec("X", [{ label: "Capacity", value: " " }]), undefined);
    assert.equal(productKeySpec("X", [{ label: "Battery", value: "a".repeat(40) }]), undefined);
  });
});

describe("category seo", () => {
  const fallback = { title: "T", description: "D", intro: "I", faq: [{ question: "q", answer: "a" }] };
  it("falls back when empty", () => {
    const r = resolveCategorySeo({ seoTitle: " ", faq: [{ question: "q", answer: "" }] }, fallback);
    assert.equal(r.title, "T");
    assert.equal(r.h1, undefined);
    assert.deepEqual(r.guide, []);
    assert.deepEqual(r.faq, fallback.faq);
  });
  it("uses admin values", () => {
    const r = resolveCategorySeo(
      { seoH1: "H", seoIntro: "Intro", guideText: "a\n\nb", faq: [{ question: "Q", answer: "A" }] },
      fallback,
    );
    assert.equal(r.h1, "H");
    assert.equal(r.intro, "Intro");
    assert.deepEqual(r.guide, ["a", "b"]);
    assert.deepEqual(r.faq, [{ question: "Q", answer: "A" }]);
  });
  it("cleans faq and guide", () => {
    assert.deepEqual(cleanFaq("x"), []);
    assert.deepEqual(guideParagraphs(undefined), []);
  });
});

describe("cityMetaDescription", () => {
  it("falls back and truncates", () => {
    assert.equal(cityMetaDescription("", "F"), "F");
    assert.equal(cityMetaDescription("a".repeat(200), "F").length, 160);
  });
});
