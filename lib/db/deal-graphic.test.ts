import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { dealGraphicHtml, escapeHtml } from "./deal-graphic";

describe("dealGraphicHtml", () => {
  it("escapes product names so a title cannot inject markup", () => {
    assert.equal(escapeHtml(`Watch <script>alert(1)</script>`), "Watch &lt;script&gt;alert(1)&lt;/script&gt;");
    const html = dealGraphicHtml(
      {
        id: "d1",
        title: `Deal <img src=x>`,
        slugA: "watch",
        slugB: "strap",
        percentOff: 10,
        active: true,
      },
      { slug: "watch", name: `Watch <b>x</b>`, price: 2500, costPrice: 900, imageUrl: "https://img/watch.jpg" },
      { slug: "strap", name: "Strap", price: 1200, costPrice: 300, imageUrl: null }
    );
    assert.equal(html.includes("<script>"), false);
    assert.equal(html.includes("<b>x</b>"), false);
    assert.match(html, /Watch &lt;b&gt;x&lt;\/b&gt;/);
    assert.match(html, /10% off the cheaper item/);
    assert.match(html, /1080px/);
    assert.match(html, /1920px/);
  });
});
