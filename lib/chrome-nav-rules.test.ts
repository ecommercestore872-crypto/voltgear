import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_FOOTER_COMPANY_LINKS,
  DEFAULT_NAV_LINKS,
  resolveChromeLinks,
  sanitizeChromeLinks,
  useSettingsLogo,
  validateChromeLists,
} from "./chrome-nav-rules";

describe("sanitizeChromeLinks", () => {
  it("drops blank and javascript URLs", () => {
    assert.deepEqual(
      sanitizeChromeLinks([
        { label: "Offers", href: "/products" },
        { label: "Bad", href: "javascript:alert(1)" },
        { label: "", href: "/blog" },
      ]),
      [{ label: "Offers", href: "/products" }]
    );
  });
});

describe("resolveChromeLinks", () => {
  it("uses defaults when the saved value is missing", () => {
    assert.deepEqual(resolveChromeLinks(null, DEFAULT_NAV_LINKS), DEFAULT_NAV_LINKS);
  });

  it("hides a group when the owner saved an empty list", () => {
    assert.deepEqual(resolveChromeLinks([], DEFAULT_NAV_LINKS), []);
  });
});

describe("validateChromeLists", () => {
  it("rejects a filled list with no valid href", () => {
    const r = validateChromeLists({
      navLinks: [{ label: "Offers", href: "offers" }],
    });
    assert.equal(r.ok, false);
  });

  it("allows an empty list", () => {
    assert.equal(validateChromeLists({ navLinks: [] }).ok, true);
  });
});

describe("DEFAULT_FOOTER_COMPANY_LINKS", () => {
  it("keeps About, Contact, Privacy, Cookies, and Terms findable", () => {
    const hrefs = DEFAULT_FOOTER_COMPANY_LINKS.map((l) => l.href);
    for (const href of [
      "/about",
      "/contact",
      "/privacy-policy",
      "/cookies",
      "/terms-of-service",
    ]) {
      assert.equal(hrefs.includes(href), true, href);
    }
  });
});

describe("useSettingsLogo", () => {
  it("returns null for a blank logo so the wordmark can show", () => {
    assert.equal(useSettingsLogo("  "), null);
    assert.equal(useSettingsLogo("https://img/logo.png"), "https://img/logo.png");
  });
});
