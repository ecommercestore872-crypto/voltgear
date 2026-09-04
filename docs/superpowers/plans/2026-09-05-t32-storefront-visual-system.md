# T-32 Storefront Visual System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline — user said perform). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every shopper page one Buy n Try hardware-stage system: cream/forest, Newsreader + Manrope, staged product cards, letterpress BNT seal, ticket-style BNT10 popup.

**Architecture:** Extract brand + welcome-coupon + home-default rules as testable modules. Drive shopper chrome from `.gadget-theme` tokens. One `ProductStageCard` on home/catalog/related. Do not rewrite admin.

**Tech Stack:** Next.js 14, Tailwind, next/font Google (Newsreader, Manrope), node:test via `tsx --test`, existing gadget components.

## Global Constraints

- Spoken name **Buy n Try**; seal **BNT**; domain unchanged
- Coupon display **BNT10** only if that code (or another first-order promo) is active — never a dead VOLT10
- Newsreader = brand + marketing titles only; Manrope = product names (including PDP) + UI + tabular PKR
- No emoji UI, no `#F3D052` gold carnival, no cloud-teal shopper theme
- Do not commit unless the user asks
- Unique craft (inside spec): letterpress BNT seal, studio vignette on card stages, perforated ticket well on the popup

---

### Task 1: Brand constants + home default order

**Files:**
- Create: `lib/brand.ts`
- Create: `lib/brand.test.ts`
- Modify: `lib/db/home-section-rules.ts`
- Modify: `lib/db/home-section-rules.test.ts`
- Modify: `lib/site-config.ts` (`FALLBACK_STORE_NAME`)
- Modify: `package.json` (`test` script add `lib/brand.test.ts`)

**Interfaces:**
- Consumes: none
- Produces: `SHOPPER_BRAND` (`spokenName`, `seal`, `tagline`, `preferredWelcomeCode`, `fallbackStoreName`)

- [ ] **Step 1: Write the failing tests**

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SHOPPER_BRAND } from "./brand";
import { DEFAULT_HOME_SECTIONS, HOME_SECTION_IDS } from "./db/home-section-rules";

describe("SHOPPER_BRAND", () => {
  it("uses Buy n Try spoken name and BNT seal", () => {
    assert.equal(SHOPPER_BRAND.spokenName, "Buy n Try");
    assert.equal(SHOPPER_BRAND.seal, "BNT");
    assert.equal(SHOPPER_BRAND.preferredWelcomeCode, "BNT10");
    assert.equal(SHOPPER_BRAND.fallbackStoreName, "Buy n Try");
  });
});

describe("DEFAULT_HOME_SECTIONS", () => {
  it("starts with categories then trust, and disables lifestyle", () => {
    assert.equal(HOME_SECTION_IDS[0], "categories");
    assert.equal(HOME_SECTION_IDS[1], "trust");
    assert.equal(DEFAULT_HOME_SECTIONS.find((s) => s.id === "lifestyle")?.enabled, false);
    assert.equal(DEFAULT_HOME_SECTIONS[0].id, "categories");
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL** (`SHOPPER_BRAND` missing; defaults still trust-first)

Run: `npx tsx --test lib/brand.test.ts lib/db/home-section-rules.test.ts`

- [ ] **Step 3: Implement `lib/brand.ts` and new defaults**

```ts
export const SHOPPER_BRAND = {
  spokenName: "Buy n Try",
  seal: "BNT",
  tagline: "Buy it. Try it.",
  preferredWelcomeCode: "BNT10",
  fallbackStoreName: "Buy n Try",
} as const;
```

`HOME_SECTION_IDS` order: categories, trust, bestsellers, featured, offers, lifestyle, reviews, blog.  
`DEFAULT_HOME_SECTIONS`: lifestyle `enabled: false`.

- [ ] **Step 4: Run tests — expect PASS**
- [ ] **Step 5: Wire `FALLBACK_STORE_NAME` to `SHOPPER_BRAND.fallbackStoreName`**

---

### Task 2: Welcome coupon picker

**Files:**
- Create: `lib/welcome-coupon-rules.ts`
- Create: `lib/welcome-coupon-rules.test.ts`
- Modify: `package.json` test script

**Interfaces:**
- Consumes: `PromoCodeRecord`, `isPromoCurrentlyValid`, `SHOPPER_BRAND.preferredWelcomeCode`
- Produces: `pickWelcomeCoupon(promos, now) => PromoCodeRecord | null`

- [ ] **Step 1: Failing tests** — prefer BNT10 if valid; else first-order active percent; else null; never return inactive VOLT10
- [ ] **Step 2: Run — FAIL**
- [ ] **Step 3: Implement picker**
- [ ] **Step 4: Run — PASS**

---

### Task 3: Tokens + fonts

**Files:**
- Modify: `components/gadget/gadget-fonts.ts` (Newsreader + Manrope)
- Modify: `app/globals.css` (`.gadget-theme` sale/danger; kill gold on shopper)
- Modify: `app/layout.tsx` shopper fallback brand + gadget font class
- Modify: `lib/sanity/settings.ts` — storefront still may load settings fonts for admin; shopper gadget theme ignores them

- [ ] **Step 1:** No unit test for CSS; visual check after Task 4
- [ ] **Step 2:** Swap gadget fonts to Newsreader (`--font-gadget-display`) + Manrope (`--font-gadget-sans`)
- [ ] **Step 3:** `--g-sale: #c87a4b`; `--g-danger: #b42318`; taupe `#8A8578`

---

### Task 4: Letterpress seal + ticket popup + stage card

**Files:**
- Create: `components/brand/bnt-seal.tsx`
- Create: `components/product/product-stage-card.tsx`
- Modify: `components/promotions/promo-popup-modal.tsx`
- Modify: `components/gadget/gadget-arrival-card.tsx` (re-export or replace internals)
- Modify: `components/product/product-card.tsx` (shopper path uses stage)
- Modify: `components/ui/button.tsx` (12px radius, inherit tokens)

Unique: seal = 24px rounded-square, 1px inset highlight; card stage = radial cream vignette; popup = perforated dashed code well.

- [ ] **Step 1:** Popup uses `pickWelcomeCoupon`; hide if null
- [ ] **Step 2:** `localStorage` key `bnt_welcome_seen` for 7 days; delay 5000ms
- [ ] **Step 3:** Card: no fake 4.8; no ★; no fake spec line; wishlist visible; forest ATC 12px

---

### Task 5: Chrome + pages

**Files:**
- `components/gadget/gadget-navbar.tsx`, `gadget-footer.tsx`
- `app/blog/page.tsx`, `app/blog/[slug]/page.tsx`
- `app/write-review/page.tsx`
- `app/order/[id]/page.tsx`, `app/order/[id]/invoice/page.tsx`
- `app/checkout/page.tsx` (remove Gift; fewer icons)
- Care pages: contact, track, faq, warranty, about, bulk-order metadata
- `app/layout.tsx` default metadata Accessories Hub → Buy n Try fallbacks

- [ ] Replace VoltGear / Accessories Hub / `#F3D052` / bounce-ping on shopper pages
- [ ] Nav fallback wordmark Buy n Try + BNT seal on phone

---

### Task 6: Verify

- [ ] `npm test` green
- [ ] `npx tsc --noEmit` clean
- [ ] Manual or browser: home, catalog, product, popup (or hidden), checkout, success, blog, review

---

## Spec coverage

| Spec item | Task |
|---|---|
| Brand Buy n Try / BNT | 1, 5 |
| Home default order + lifestyle off | 1 |
| Welcome coupon only if live | 2, 4 |
| Fonts | 3 |
| Tokens / kill teal+gold | 3, 5 |
| Hardware cards | 4 |
| Popup | 4 |
| Remaining pages + copy | 5 |
| Tests | 1, 2, 6 |
