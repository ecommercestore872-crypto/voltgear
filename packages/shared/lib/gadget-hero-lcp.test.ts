import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  heroLcpImageUrl,
  heroLcpPreload,
  heroLcpPreloads,
  parseHeroSlideMeta,
} from "./gadget-hero-lcp";

describe("gadget-hero-lcp", () => {
  it("preloads one matching image when no separate mobile artwork exists", () => {
    const images = heroLcpPreloads({ imageUrl: "https://res.cloudinary.com/demo/image/upload/v1/banner.jpg" });
    assert.equal(images.length, 1);
    assert.match(images[0].href, /q_65/);
    assert.equal(images[0].media, undefined);
    assert.match(images[0].imageSizes, /640px/);
  });

  it("selects the two art-directed sources by viewport without fetching both", () => {
    const images = heroLcpPreloads({ imageUrl: "https://res.cloudinary.com/demo/image/upload/v1/d.jpg", subtitle: '{"mobile":"https://res.cloudinary.com/demo/image/upload/v1/m.jpg"}' });
    assert.equal(images.length, 2);
    assert.match(images[0].href, /q_62.*m.webp/);
    assert.equal(images[0].media, "(max-width: 639px)");
    assert.match(images[1].href, /q_65.*d.webp/);
    assert.equal(images[1].media, "(min-width: 640px)");
  });
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
