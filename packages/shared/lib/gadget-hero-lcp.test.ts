import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { heroLcpImageUrl, parseHeroSlideMeta } from "./gadget-hero-lcp";

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
});
