import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSettingsDocument,
  settingsFormFromRow,
  type SettingsRow,
} from "./admin-settings-form-rules";

describe("settingsFormFromRow", () => {
  it("prefers draft fields, normalizes legacy branding, and keeps safe defaults", () => {
    const row: SettingsRow = {
      brand_name: "Accessories Hub",
      email: "live@example.com",
      cod_enabled: undefined,
      social_links: [
        { platform: "instagram", url: "https://instagram.com/live" },
      ],
      draft: {
        email: "draft@example.com",
        socialLinks: [
          { platform: "tiktok", url: "https://tiktok.com/@draft" },
        ],
      },
    };

    const form = settingsFormFromRow(row);

    assert.equal(form.brandName, "Buy n Try");
    assert.equal(form.email, "draft@example.com");
    assert.equal(form.instagram, "");
    assert.equal(form.tiktok, "https://tiktok.com/@draft");
    assert.equal(form.codEnabled, true);
    assert.ok(form.navLinks.length > 0);
  });

  it("reads the live row when the draft is explicitly discarded", () => {
    const form = settingsFormFromRow({
      brand_name: "Buy n Try",
      email: "live@example.com",
      draft: null,
    });

    assert.equal(form.email, "live@example.com");
  });
});

describe("buildSettingsDocument", () => {
  it("converts numeric fields, omits blank social links, and nulls blank optional dates", () => {
    const form = settingsFormFromRow(null);
    Object.assign(form, {
      instagram: "https://instagram.com/buyntry",
      tiktok: "",
      facebook: "",
      freeShippingThreshold: "5000",
      warrantyMonths: "12",
      returnWindowDays: "7",
      maxCodAmount: "25000",
      shippingFee: "250",
      announcementStartsAt: "",
      announcementEndsAt: "",
      homeFeaturedProductSlug: "",
      homeFeaturedCustomImage: "",
    });

    const document = buildSettingsDocument(form);

    assert.equal(document.freeShippingThreshold, 5_000);
    assert.equal(document.warrantyMonths, 12);
    assert.equal(document.returnWindowDays, 7);
    assert.equal(document.maxCodAmount, 25_000);
    assert.equal(document.shippingFee, 250);
    assert.deepEqual(document.socialLinks, [
      { platform: "instagram", url: "https://instagram.com/buyntry" },
    ]);
    assert.equal(document.announcement.startsAt, null);
    assert.equal(document.announcement.endsAt, null);
    assert.equal(document.homeFeaturedProductSlug, null);
    assert.equal(document.homeFeaturedCustomImage, null);
  });
});
