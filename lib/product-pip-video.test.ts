import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isPipDismissed,
  pipVideoForProduct,
  productWatchLinks,
  rememberPipDismissed,
  videoOnlyPlaySrc,
} from "./product-pip-video";

describe("videoOnlyPlaySrc", () => {
  it("uses the TikTok player without description chrome", () => {
    assert.equal(
      videoOnlyPlaySrc("tiktok", "https://www.tiktok.com/@shop/video/1234567890"),
      "https://www.tiktok.com/player/v1/1234567890?autoplay=1&loop=1&description=0&music_info=0"
    );
  });

  it("uses a caption-free Instagram embed path", () => {
    assert.equal(
      videoOnlyPlaySrc("instagram", "https://www.instagram.com/reel/abc123/"),
      "https://www.instagram.com/reel/abc123/embed"
    );
  });
});

describe("pipVideoForProduct", () => {
  it("prefers an uploaded file so the preview is video-only", () => {
    const pip = pipVideoForProduct({
      productVideo: { url: "https://cdn.example.com/demo.mp4", poster: "https://cdn.example.com/poster.jpg" },
      instagramUrl: "https://www.instagram.com/reel/abc123/",
    });
    assert.ok(pip);
    assert.equal(pip.kind, "file");
    assert.equal(pip.playSrc, "https://cdn.example.com/demo.mp4");
    assert.equal(pip.openHref, "https://www.instagram.com/reel/abc123/");
    assert.equal(pip.openLabel, "Open Instagram");
  });

  it("falls back to Instagram and keeps the original link for Open", () => {
    const pip = pipVideoForProduct({
      instagramUrl: "https://www.instagram.com/reel/abc123/",
    });
    assert.ok(pip);
    assert.equal(pip.kind, "instagram");
    assert.equal(pip.playSrc, "https://www.instagram.com/reel/abc123/embed");
    assert.equal(pip.openHref, "https://www.instagram.com/reel/abc123/");
    assert.equal(pip.openLabel, "Open Instagram");
  });

  it("returns null when there is no shopper video", () => {
    assert.equal(pipVideoForProduct({}), null);
  });
});

describe("productWatchLinks", () => {
  it("shows only Instagram when that link is set", () => {
    assert.deepEqual(
      productWatchLinks({ instagramUrl: "https://www.instagram.com/reel/abc123/" }),
      [{ platform: "instagram", href: "https://www.instagram.com/reel/abc123/" }]
    );
  });

  it("shows only TikTok when that link is set", () => {
    assert.deepEqual(
      productWatchLinks({ tiktokUrl: "https://www.tiktok.com/@shop/video/1" }),
      [{ platform: "tiktok", href: "https://www.tiktok.com/@shop/video/1" }]
    );
  });

  it("shows both icons when both links are set", () => {
    const links = productWatchLinks({
      instagramUrl: "https://www.instagram.com/reel/abc123/",
      tiktokUrl: "https://www.tiktok.com/@shop/video/1",
    });
    assert.deepEqual(
      links.map((l) => l.platform),
      ["instagram", "tiktok"]
    );
  });

  it("shows nothing when neither link is set", () => {
    assert.deepEqual(productWatchLinks({}), []);
  });
});

describe("pip dismiss memory", () => {
  it("remembers a closed preview so refresh does not show it again", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };
    assert.equal(isPipDismissed("c6-charger", storage), false);
    rememberPipDismissed("c6-charger", storage);
    assert.equal(isPipDismissed("c6-charger", storage), true);
    assert.equal(isPipDismissed("other-product", storage), false);
  });
});
