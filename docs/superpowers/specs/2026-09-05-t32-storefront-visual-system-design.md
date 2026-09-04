# T-32 — Storefront visual system (Buy n Try hardware stage)

**Status:** Written spec — waiting for user review  
**Task:** T-32  
**Surface:** All shopper-facing pages and chrome (not admin)  
**UI plan:** `docs/ui/2026-09-05-t32-buyntryy-hardware-stage-ui.md`  
**Approved in chat:** 2026-09-05 (intent + three design sections)

## 1. Problem / goal

How might we make buyntryy.com look like one real accessories store — not an AI collage — while keeping the cream/forest brand and the current buy path?

Shoppers in Pakistan should land, know the store is **Buy n Try**, trust COD, find a product type, and check out. The UI must feel hand-finished: one color system, one type system, hardware-stage cards, quiet icons, a calm welcome coupon.

**Success:** A first-time visitor can name the store, the pages share one craft language, and nothing on the path uses VoltGear, Accessories Hub, teal leftovers, gold carnival, emoji chrome, or fake ratings.

## 2. Brand

| Layer | Value |
|---|---|
| Domain | buyntryy.com (unchanged) |
| Spoken name | **Buy n Try** |
| Short mark | **BNT** (favicon, mobile nav, bag, packing-style seal) |
| Tagline | Buy it. Try it. |
| Welcome coupon | **BNT10** (10% off first order over Rs. 3,000 — same rule as today’s VOLT10) |
| Not shopper-facing | VoltGear, Accessories Hub, “kewl” outlined BNT, glow logos |

## 3. Scope

### In scope

- Keep cream / forest / sage; add complementary tokens only for missing roles (line, sale, danger)
- One font identity on every shopper page: **Newsreader** (wordmark + section titles) + **Manrope** (UI, body, prices)
- Hardware-stage product cards and matching components (buttons, badges, inputs, tiles)
- One-stroke icon language; no emoji as UI; no Lucide Sparkles/Gift
- Welcome coupon popup restyle + quieter timing
- Default home section order (categories earlier; lifestyle off by default)
- Shopper copy fallbacks: Buy n Try, BNT10
- Pages: home, category, search, product, cart, checkout, order success, invoice (shopper), blog, write-review, wishlist, compare, contact, track, FAQ, about, warranty, shipping-returns, privacy, terms, bulk-order, 404, cart drawer, announcement bar

### Out of scope

- Admin theme, admin VoltGear leftover strings
- New payments, new products, new photography shoot
- Custom illustrated logo file (admin-uploaded logo still wins if present)
- Transactional / marketing email HTML (spawned **T-33**)
- Changing checkout validation or order rules
- 4K wallpaper backgrounds — “realistic” means staged product images, not filters

## 4. Visual decisions (approved)

**Direction A — hardware stage.** The product is a studio object on a cream well. Chrome is quiet. Apple / Aesop / Nothing taught the structure (image-first, no emoji, hairline not shadow). We do not copy their brands.

**Type**

- Newsreader: “Buy n Try”, marketing page titles (Blog, Checkout, Order confirmed), home section titles
- Manrope: nav, **all product names including PDP heading**, buttons, body, tabular PKR
- Remove storefront use of Fraunces, DM Sans, Sora, Jakarta, Inter
- Ignore settings `headingFont` / `bodyFont` on the storefront (admin pickers may remain unused)

**Card**

- Cream-deep stage, object-contain, generous pad, no inner frame
- No enclosing white box; no rest shadow; hover 8px/24px forest-tinted shadow only
- Radius 16px stage, 12px buttons
- Wishlist always visible; no hover-only compare
- Left-aligned name (2 lines); tabular price; amber/terracotta only on a real sale
- Forest Add to cart always visible
- Trust line only when settings make it true
- Stars only when `reviewCount > 0` and `rating > 0` — drawn SVG, not ★
- Kill hardcoded `4.8 (44)` and fake “20W fast charging…” fallback

**Grid:** 2 columns phone, 4 desktop.

**Icons:** 1.75px stroke, forest on cream. Category silhouettes stay (refine). One family for actions.

**Popup:** Cream panel, BNT seal, Newsreader title, BNT10 well, forest Copy, “Continue shopping”. Once per browser for 7 days (`localStorage`), ~5s delay. Esc + X. Focus trapped.

**Home default order (empty / unset `home_sections` only):**  
Hero → categories → trust → bestsellers → featured → offers → reviews → blog.  
`lifestyle` stays in the admin list, **disabled by default**. Saved admin orders are not rewritten.

**Motion:** 180ms lift ~2px. Added state on ATC. No bounce / ping / confetti. Honor `prefers-reduced-motion`.

**Color tokens**

| Token | Hex | Job |
|---|---|---|
| Cream | `#F5F1E8` | Page |
| Cream deep | `#EFEAE0` | Stage |
| Forest | `#1F3626` | CTA, footer, BNT |
| Sage | `#8FA888` | Quiet accent |
| Charcoal | `#1A1A1A` | Type |
| Taupe | `#8A8578` | Secondary type |
| Line | `#E8E3D8` | Hairline |
| Sale | `#C87A4B` | Sale price only |
| Danger | `#B42318` | Form errors |

Kill: `:root` cloud teal as the live shopper theme, gold `#F3D052` on blog/review/success.

## 5. Impact analysis

Sweep of the live storefront (admin excluded except where it feeds shopper defaults).

### Data model

- No new tables required.
- `settings.brand_name` fallback in code becomes `Buy n Try` (`lib/site-config.ts` `FALLBACK_STORE_NAME` is `VoltGear` today).
- `home_sections` default order in `lib/db/home-section-rules.ts` changes for **unset** layouts only. Existing JSON order is preserved.
- Welcome coupon: popup is hardcoded `VOLT10` today. Checkout applies whatever code exists in promotions. **T-32 must not advertise BNT10 unless that code is a real active coupon** (create/rename in promotions, or read the active welcome code from settings/promo). `lib/autopilot/coupon-evaluator.test.ts` uses `VOLT10` as a fixture string only — leave the evaluator math; do not treat that fixture as a shopper contract.

### Shared / cross-cutting

| Surface | Today | T-32 |
|---|---|---|
| `app/globals.css` `:root` | Cloud teal HSL | Shopper pages use `.gadget-theme` Biometic remap; teal must not leak on checkout/blog/success |
| `lib/sanity/settings.ts` `resolveFonts` | Sora / Jakarta / Inter / Manrope / Space Grotesk | Storefront loads Newsreader + Manrope only |
| `components/gadget/gadget-fonts.ts` | Fraunces + DM Sans | Newsreader + Manrope |
| `components/ui/button.tsx` `card.tsx` `badge.tsx` | Generic / slate / teal-primary | Inherit gadget tokens; 12px radius; no slate-900 |
| `PromoPopupModal` | Gift + gold gradient + VOLT10 | Hardware-stage popup |
| Announcement bar | Sparkles / Volt leftover | Same chrome as nav |
| Cart drawer | Mixed | Same cards/type/icons |
| Emails (`lib/email.ts`, templates) | VoltGear | **Not T-32** → **T-33** |

### Per-page / module visibility (shopper)

| Module / screen | Exposes today | Should show | Limited / coherent now? | Gap → task |
|---|---|---|---|---|
| Home `/` | Gadget sections, Fraunces, two card languages | Hardware cards, new default order | ❌ mixed | T-32 |
| Category / products | Catalog + gadget cards | Same hardware grid | ❌ | T-32 |
| Product PDP | Buy box + leftover Volt copy | Stage gallery + Buy n Try | ❌ | T-32 (absorbs live part of T-17) |
| Search / wishlist / compare | Mixed chrome | Same system | ❌ | T-32 (absorbs live part of T-18) |
| Cart / drawer | Mixed | Same system | ❌ | T-32 |
| Checkout | Icon soup, Gift, mixed type | Manrope form, forest CTA | ❌ | T-32 |
| Order success | Gold rings, bounce, + sparkles | Quiet cream + forest check | ❌ | T-32 |
| Invoice | VoltGear / Accessories Hub | Buy n Try | ❌ | T-32 |
| Blog list/post | Dark gold hero, VoltGear meta | Cream + Newsreader | ❌ | T-32 |
| Write review | Dark gold card, VoltGear meta | Cream form | ❌ | T-32 |
| Contact / track / FAQ / warranty / shipping / about / legal / bulk | Mixed leftovers | Same chrome | ❌ | T-32 |
| 404 | Generic | Same chrome | ❌ | T-32 |
| Welcome popup | AI gift modal | BNT10 stage | ❌ | T-32 |
| Delivery token page | Operational | Same chrome if shopper-facing | ⚠️ | T-32 light pass |
| Admin | Biometic / Volt strings | Unchanged | ✅ out of scope | — |
| Transactional email | VoltGear | Buy n Try | ❌ | **T-33** |
| Marketing compose defaults | VoltGear / VOLT10 | Buy n Try / BNT10 | ❌ | T-33 (admin compose is admin; customer-received mail is T-33) |

**Summary line:** Home, catalog, PDP, search, cart, checkout, success, invoice, blog, reviews, care pages, popup, and drawer all mix palettes or brand names and must share one hardware-stage language. Emails leak VoltGear and are **T-33**, not dropped.

### Tests that will change (planned)

| Test | Why |
|---|---|
| `lib/db/home-section-rules.test.ts` | Default `HOME_SECTION_IDS` / `DEFAULT_HOME_SECTIONS` order and lifestyle `enabled: false` |
| Any snapshot/e2e that expects Fraunces, VOLT10, VoltGear, or gold hero | Copy and chrome |
| `lib/gadget-preview.test.ts` | Unchanged unless chrome paths change (they should not) |
| Coupon evaluator VOLT10 fixture | **Do not break** — code string is arbitrary |

### Integration

- No schema migration required if BNT10 is created as a promotions row (or VOLT10 is renamed in admin).
- Clarity / first-party events: same routes; no new funnel steps.
- WebSockets / mobile app: none.
- PWA cache: CSS/font change; no offline contract change.

### Spawned follow-ups

| ID | Title | Depends |
|---|---|---|
| T-33 | Customer email + message brand: Buy n Try / BNT (not VoltGear) | T-32 |

T-17 and T-18 (preview product2 / catalog chrome) are **narrowed**: live `/product` and `/products` visual language is T-32. Preview-only leftovers can stay planned or be closed after T-32 if `/` and `/product` are the live paths.

## 6. Architecture

- Keep gadget chrome (`.gadget-theme`) as the live shopper shell.
- One card component used by home rails, catalog, search, related, wishlist.
- Tokens live in `.gadget-theme` / `.admin-theme` split: admin may keep current tokens; shopper tokens match the table above.
- Fonts loaded once in root layout for shopper requests; do not load both Fraunces and Newsreader.
- Popup reads welcome coupon from promotions/settings when available; fallback display code is BNT10 only if that coupon is active.

## 7. Error handling

- Missing product image: empty cream stage + “No image”, not a broken icon.
- Empty grid: one sentence + Shop all.
- Checkout field errors: under the field, danger token, `aria-invalid` + `aria-describedby`.
- Popup: if coupon inactive, do not show a dead code (hide popup or show “Offers” without a fake code).
- Font load failure: system-ui fallback, no FOUT flash that blocks buy.

## 8. Testing (T-32)

- Update home-section default tests first (TDD).
- Add/adjust unit tests for popup storage key and “do not render if coupon inactive” if logic is extracted.
- Playwright: home grid, popup copy (or skip if coupon off), checkout still places COD.
- `tsc --noEmit` clean.
- Manual 390px + desktop path: home → category → product → cart → checkout → success; blog; review; popup once.

## 9. Phase breakdown

Plan: `docs/superpowers/plans/2026-09-05-t32-storefront-visual-system.md`

1. Brand constants + home default order (TDD)  
2. Welcome coupon picker (TDD)  
3. Tokens + Newsreader/Manrope  
4. Letterpress seal, studio-stage cards, ticket popup  
5. Chrome + remaining shopper pages + copy sweep  
6. `npm test` + `tsc --noEmit` + manual path  

Acceptance: all in-scope pages use Newsreader/Manrope and hardware cards; no shopper VoltGear/Accessories Hub/dead VOLT10/teal/gold carnival; suites green.

## 10. Open questions

None. Brand, direction, popup, restack, tokens, and out-of-scope emails are decided.
