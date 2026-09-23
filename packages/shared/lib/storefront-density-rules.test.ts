import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cardWidthIsComfortable,
  desktopNavAtWidth,
  estimatedGridCardWidth,
  productGridColumns,
  railCardWidth,
} from "./storefront-density-rules";

describe("productGridColumns", () => {
  it("keeps two columns on phones, three on iPad portrait, four from laptop up", () => {
    assert.equal(productGridColumns(320), 2);
    assert.equal(productGridColumns(390), 2);
    assert.equal(productGridColumns(430), 2);
    assert.equal(productGridColumns(768), 3);
    assert.equal(productGridColumns(834), 3);
    assert.equal(productGridColumns(1024), 4);
    assert.equal(productGridColumns(1440), 4);
    assert.equal(productGridColumns(1920), 4);
  });
});

describe("estimatedGridCardWidth", () => {
  it("stays in a comfortable range so cards are not tiny or oversized", () => {
    const viewports = [320, 375, 390, 430, 768, 834, 1024, 1280, 1440, 1920];
    for (const width of viewports) {
      const card = estimatedGridCardWidth(width);
      assert.equal(
        cardWidthIsComfortable(card),
        true,
        `${width}px viewport produced ${card}px cards`
      );
    }
  });
});

describe("railCardWidth", () => {
  it("peeks the next card on phones and matches grid cards on larger screens", () => {
    assert.ok(railCardWidth(390) >= 200 && railCardWidth(390) <= 250);
    assert.ok(railCardWidth(768) >= 240 && railCardWidth(768) <= 260);
    assert.ok(railCardWidth(1280) >= 250 && railCardWidth(1280) <= 280);
  });
});

describe("desktopNavAtWidth", () => {
  it("uses the compact menu on iPhone and iPad portrait", () => {
    assert.equal(desktopNavAtWidth(390), false);
    assert.equal(desktopNavAtWidth(768), false);
    assert.equal(desktopNavAtWidth(1024), true);
    assert.equal(desktopNavAtWidth(1440), true);
  });
});
