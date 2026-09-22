import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getPublicSocialLinks } from "@/lib/social-links-rules";

describe("getPublicSocialLinks", () => {
  it("includes brand defaults when settings are empty", () => {
    const links = getPublicSocialLinks({
      instagramUrl: null,
      tiktokUrl: null,
      facebookUrl: null,
    });
    assert.equal(
      links.find((l) => l.id === "instagram")?.href,
      "https://www.instagram.com/buyntry_/",
    );
    assert.equal(
      links.find((l) => l.id === "tiktok")?.href,
      "https://www.tiktok.com/@buyntryy_",
    );
  });
});