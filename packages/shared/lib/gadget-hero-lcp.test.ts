import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  heroLcpImageUrl,
  heroLcpPreload,
  parseHeroSlideMeta,
} from "./gadget-hero-lcp";

describe("gadget-hero-lcp", () => {
  it("prefers mobile image from slide subtitle JSON", () => {
    const meta = parseHeroSlideMeta(
      '{"text":"Sale","mobile":"https://res.cloudinary.com/demo/image/upload/v1/m.jpg"}',
    );
    assert.equal(meta.mobile?.includes("m.jpg"), true);
    const url = heroLcpImageUrl(
      {
        imageUrl: "https://res.cloudinary.com/demo/image/upload/v1/d.jpg",
        subtitle:
          '{"text":"Sale","mobile":"https://res.cloudinary.com/demo/image/upload/v1/m.jpg"}',
      },
      { mobile: true },
    );
    assert.match(url, /m\.jpg|w_828/);
  });

  it("builds a matching responsive preload srcset", () => {
    const preload = heroLcpPreload(
      {
        imageUrl: "https://res.cloudinary.com/demo/image/upload/v1/d.jpg",
        subtitle: null,
      },
      { mobile: false, quality: 65 },
    );
    assert.match(preload.href, /q_65/);
    assert.match(preload.imageSrcSet ?? "", /w_640\/.* 640w/);
    assert.match(preload.imageSrcSet ?? "", /w_1200\/.* 1200w/);
  });
});
