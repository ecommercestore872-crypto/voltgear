import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseProductDetailCopy,
  portableTextToCopyBlocks,
  portableTextToPlain,
  previewProductCopy,
  textToPortableText,
} from "./product-detail-copy";

describe("parseProductDetailCopy", () => {
  it("turns the first paragraph into a lead and keeps later paragraphs", () => {
    const blocks = parseProductDetailCopy(
      "A quiet everyday companion for long days.\n\nBuilt for comfort and all-day battery."
    );
    assert.deepEqual(
      blocks.map((b) => b.type),
      ["lead", "paragraph"]
    );
    assert.equal(blocks[0].type === "lead" && blocks[0].spans[0]?.text, "A quiet everyday companion for long days.");
  });

  it("reads markdown headings, lists, callouts, and inline marks", () => {
    const blocks = parseProductDetailCopy(
      [
        "# Why it stands out",
        "",
        "Feel the **bass** and a *clear* vocal.",
        "",
        "- 40-hour battery",
        "- IPX4 water resistance",
        "",
        "> Official warranty in Pakistan",
        "",
        "DETAILS:",
        "Fast USB-C charging.",
      ].join("\n")
    );

    assert.equal(blocks[0].type, "heading");
    if (blocks[0].type === "heading") {
      assert.equal(blocks[0].level, 2);
      assert.equal(blocks[0].text, "Why it stands out");
    }

    const para = blocks.find((b) => b.type === "lead" || b.type === "paragraph");
    assert.ok(para && (para.type === "lead" || para.type === "paragraph"));
    assert.deepEqual(
      para.spans.map((s) => [s.text, s.mark ?? ""]),
      [
        ["Feel the ", ""],
        ["bass", "bold"],
        [" and a ", ""],
        ["clear", "italic"],
        [" vocal.", ""],
      ]
    );

    const list = blocks.find((b) => b.type === "list");
    assert.ok(list && list.type === "list");
    assert.equal(list.ordered, false);
    assert.equal(list.items.length, 2);
    assert.equal(list.items[0][0]?.text, "40-hour battery");

    const callout = blocks.find((b) => b.type === "callout");
    assert.ok(callout && callout.type === "callout");
    assert.equal(callout.spans[0]?.text, "Official warranty in Pakistan");

    const sub = blocks.find((b) => b.type === "heading" && b.level === 3);
    assert.ok(sub && sub.type === "heading");
    assert.equal(sub.text, "DETAILS");
  });

  it("treats ALL CAPS lines and fully bold lines as headings", () => {
    const blocks = parseProductDetailCopy("KEY FEATURES\n\n**Battery life**\n\nLasts 40 hours.");
    const headings = blocks.filter((b) => b.type === "heading");
    assert.equal(headings.length, 2);
    if (headings[0].type === "heading") assert.equal(headings[0].text, "KEY FEATURES");
    if (headings[1].type === "heading") assert.equal(headings[1].text, "Battery life");
  });

  it("keeps a single wall of text readable by splitting on blank lines", () => {
    const blocks = parseProductDetailCopy("One thought.\n\nAnother thought.");
    assert.equal(blocks.length, 2);
  });
});

describe("textToPortableText round-trip", () => {
  it("keeps headings, lists, and marks when saved then opened in admin", () => {
    const source = "# Care\n\nWipe **gently**.\n\n- Store dry";
    const plain = portableTextToPlain(textToPortableText(source));
    const again = parseProductDetailCopy(plain);
    assert.deepEqual(
      again.map((b) => b.type),
      ["heading", "lead", "list"]
    );
  });
});

describe("portableTextToCopyBlocks", () => {
  it("reads seed-style paragraph objects that only have a text field", () => {
    const blocks = portableTextToCopyBlocks([
      {
        _type: "paragraph",
        text: "Multi-functional 4-in-1 charger.\n\n# Power\n\n- 66W peak",
      },
    ]);
    assert.deepEqual(
      blocks.map((b) => b.type),
      ["lead", "heading", "list"]
    );
    assert.equal(blocks[0].type === "lead" && blocks[0].spans[0]?.text, "Multi-functional 4-in-1 charger.");
  });

  it("recovers structure from a single dumped portable-text block", () => {
    const blocks = portableTextToCopyBlocks([
      {
        _type: "block",
        _key: "b1",
        style: "normal",
        children: [
          {
            _type: "span",
            _key: "s1",
            text: "Welcome home.\n\n# Care\n\n- Wipe gently\n- Store dry",
            marks: [],
          },
        ],
      },
    ]);
    assert.deepEqual(
      blocks.map((b) => b.type),
      ["lead", "heading", "list"]
    );
  });
});

describe("previewProductCopy", () => {
  it("keeps a short single paragraph as the whole preview", () => {
    const copy = parseProductDetailCopy("Small note.");
    const preview = previewProductCopy(copy);
    assert.equal(preview.hasMore, false);
    assert.equal(preview.blocks.length, 1);
  });

  it("shows only a short opening and flags the rest for Read more", () => {
    const copy = parseProductDetailCopy(
      "A quiet everyday companion for long days on the road and at the desk.\n\n# Care\n\n- Wipe gently\n- Store dry"
    );
    const preview = previewProductCopy(copy);
    assert.equal(preview.hasMore, true);
    assert.equal(preview.blocks.length, 1);
    assert.equal(preview.blocks[0]?.type, "lead");
  });

  it("truncates a long single paragraph so Read more can open the rest", () => {
    const copy = parseProductDetailCopy(
      "Multi-functional 4-in-1 car cigarette lighter charger featuring 2 built-in 80cm retractable cables plus dual extra USB ports."
    );
    const preview = previewProductCopy(copy);
    assert.equal(preview.hasMore, true);
    const text = preview.blocks[0]?.type === "lead" ? preview.blocks[0].spans.map((s) => s.text).join("") : "";
    assert.ok(text.endsWith("…"));
    assert.ok(text.length < 120);
  });
});
