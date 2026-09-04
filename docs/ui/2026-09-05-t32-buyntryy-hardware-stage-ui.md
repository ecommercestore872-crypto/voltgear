# UI Plan: Buy n Try hardware stage (T-32)

## 1. Plain summary

This UI work makes every shopper page look like one store: cream and forest, Newsreader + Manrope, product cards that stage the object, quiet icons, and a calm BNT10 popup. Domain stays buyntryy.com. People say **Buy n Try**.

## 2. Links

- Product / master plan: `docs/superpowers/specs/2026-09-05-t32-storefront-visual-system-design.md`
- Tracker: T-32 in `docs/dev-priorities.md`
- Palette history: `docs/ui/2026-09-01-gadget-biometic-palette.md` (keep hexes, drop Fraunces/DM Sans)
- Related chat: keep colors; new type; layout path stays; restack allowed; Direction A hardware stage; no emoji chrome

## 3. Goal

Good UI means the product photograph does the talking. Type and buttons stay out of the way. A phone shopper can add to cart without hunting. Nothing looks like a generated gift-box template.

## 4. In scope (screens & surfaces)

- Home: hero, categories, trust, bestsellers, featured, offers, reviews, blog tiles
- Category `/products`, `/products/[category]`
- Search, wishlist, compare
- Product `/product/[slug]` (and live gadget PDP chrome)
- Cart page + cart drawer
- Checkout
- Order success `/order/[id]`, shopper invoice
- Blog list + post
- Write review
- Contact, track, FAQ, warranty, shipping-returns, about, privacy, terms, bulk-order
- 404
- Welcome coupon popup
- Announcement bar, nav, footer
- Empty, loading, error, no-permission (none on shopper beyond 404)

## 5. Out of scope

- Admin pages and admin Biometic leftovers
- Email HTML (T-33)
- New photo shoot, custom logo illustration
- New payment methods
- Rewriting saved home layouts in the database

## 6. Current app UI snapshot

- Colors: cream `#F5F1E8`, forest `#1F3626`, sage, plus leftover **cloud teal** in `:root` and **gold `#F3D052`** on blog/success/review
- Type: Fraunces + DM Sans on gadget; Sora/Jakarta/Inter/Manrope via settings
- Spacing: airy marketing home; mixed card padding
- Shape: 1.25rem gadget cards, 2xl white boxes, full pills on ATC
- Layout: gadget nav + forest footer; home section order from admin (default starts with trust)
- Components: two product cards (`ProductCard` vs `GadgetArrivalCard`); Lucide everywhere; Sparkles/Gift; ★ emoji; fake 4.8 (44)
- Motion: hover lift, reveals, success page bounce/ping
- Tone: meant to be calm retail; reads as assembled
- Breakpoints: mobile stack, lg nav

**Must stay:** cream/forest, COD-first trust, gadget chrome shell, admin home-section toggle.

## 7. Research collage

| Name / source | Good for | Steal | Fit |
|---|---|---|---|
| [Apple Store / HIG notes](https://github.com/conardli/garden-skills/blob/main/skills/web-design-engineer/references/style-recipes/apple-hig.md) | Hardware on a quiet field | Image-first, 12–18px radius, no emoji | High |
| [Aesop system](https://www.shadcn.io/design/aesop) | Cream/parchment restraint | Hairline, photography carries warmth | Medium (too slow for COD ATC) |
| [Nothing.tech](https://nothingnewsroom.com/nothing-new-website-design/) | Object gallery | Product is the excitement | Medium (too cold/white) |
| [Teenage Engineering](https://www.shadcn.io/design/teenage-engineering) | Spec grid | Hairline, no fake shadow cards | Low (too sharp/mono) |
| [Bang & Olufsen tokens](https://styles.refero.design/style/27a4a4fa-4b1a-4e7e-b2c3-3e5bf57f00e5) | Tight display tracking | One family discipline | Medium |
| [FontFYI / Shopifont pairings](https://fontfyi.com/blog/best-fonts-ecommerce/) | Type roles | Two families max; tabular prices | High |
| [Manrope pairings](https://madegooddesigns.com/manrope-font-pairing/) | UI + price | Manrope for commerce UI | High |
| [Newsreader + Manrope](https://webflow.com/templates/html/adept-startup-website-template) | Human title + clean UI | Wordmark vs body split | High |
| [Why AI icons repeat](https://uxskill.laithjunaidy.com/blog/ai-icon-design-generic.html) | Icon discipline | No emoji-as-icon; one stroke | High |
| [Custom DTC icons](https://tribe.studio/insights/the-power-of-custom-iconography-in-digital-experiences) | Trust + category | Custom SVG for shop-by-type | High |

Themes: stage the object; two fonts; no emoji; hairline over shadow; ATC always visible on phones.

## 8. Chosen direction

**Direction A — hardware stage** on Buy n Try cream/forest. Beats editorial (slow COD) and spec-sheet (too cold). Exceptional = coherent cards + type + popup, not spectacle.

## 9. Directions we did not pick

- Editorial Aesop tile — beautiful, weak add-to-cart on phones
- Teenage Engineering grid — wrong voice for Buy n Try
- Kewl BNT-only logo — looks empty at checkout
- Full rebrand / new palette — user kept cream/forest
- Outfit + Manrope — two geometrics, 2026 SaaS default

## 10. Visual mockup index

Chat-approved text specs (image gen not required for this approval):

| Label | Shows | Keep |
|---|---|---|
| UI-01 | Hardware product card anatomy | Yes |
| UI-02 | 2-col phone / 4-col desktop grid | Yes |
| UI-03 | BNT10 popup | Yes |
| UI-04 | Home restack | Yes |
| UI-05 | Success without gold carnival | Yes |
| UI-06 | Nav wordmark + BNT seal | Yes |

## 11. Design tokens

**Colors** (name + value + where)

- `cream` `#F5F1E8` — page background
- `cream-deep` `#EFEAE0` — image stage
- `forest` `#1F3626` — primary button, footer, BNT seal
- `forest-mid` `#25392A` — button hover
- `sage` `#8FA888` — rare accent (underline on wordmark hover)
- `charcoal` `#1A1A1A` — headings and body
- `taupe` `#8A8578` — secondary, strikes
- `white` `#FFFFFF` — inputs, drawer
- `line` `#E8E3D8` — borders
- `sale` `#C87A4B` — sale price only
- `danger` `#B42318` — errors only

**Typography**

- `--font-display`: Newsreader (opsz display), weights 400–600
- `--font-sans`: Manrope, weights 400–700
- H1 / section: Newsreader ~32–40px desktop, ~28px phone, tracking −0.02em
- Product name: Manrope 600, 14–16px, 2-line clamp
- Price: Manrope 700, tabular-nums, 18–20px
- Button: Manrope 700, 14px
- Caption: Manrope 500, 11–12px, taupe

**Spacing:** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64. Section gap ~48–64 desktop, 32 phone.

**Radius / borders / shadows**

- Stage 16px, button/input 12px, badge 6px, never 9999 on primary ATC
- Border 1px `line`
- Rest: no drop shadow
- Hover card: `0 8px 24px rgba(31,54,38,0.06)`

**Breakpoints:** 390 phone, 768, 1024, 1440. Grid 2 / 2 / 3 / 4.

**Motion:** 180ms, ease `cubic-bezier(0.22, 1, 0.36, 1)`. Transform + opacity only. Reduced-motion: no lift, no delay popup animation.

## 12. Layout system

- Page cream. Content max ~72rem. Gutter 16px phone, 32px desktop.
- Nav sticky cream/90 + blur. Footer forest rounded band on cream (keep).
- Grids align to the same content width as hero.
- Mobile: 2-col cards, ATC on card (no hover-only actions).

## 13. Component inventory

### BntWordmark
- Purpose: logo when no uploaded image
- States: default, hover (sage underline grows)
- Content: “Buy n Try” Newsreader; optional BNT square seal on phone
- New

### BntSeal
- Purpose: 3-letter stamp
- States: default only
- Forest fill or forest outline on cream
- New

### ProductStageCard (replaces both old cards on shopper)
- Purpose: sell one product
- States: default, hover, sold out, on sale, loading skeleton, no image
- Content: stage, optional badge, −%, heart, name, price, ATC, optional trust
- New vs reuse: replace `GadgetArrivalCard` + shopper `ProductCard`

### Button
- Purpose: actions
- States: default, hover, focus, disabled, loading, added
- Forest fill / cream outline
- Reuse `components/ui/button.tsx` restyled

### Input / Label
- Hairline, 12px radius, 16px font on iOS
- Error: danger border + text
- Reuse

### Badge
- Small, 6px radius, not uppercase carnival
- Reuse restyled

### CategoryTile
- Product photo or refined glyph on cream-deep well + Manrope label
- Reuse `GadgetShopCategories` restyled

### TrustStrip
- Four items max, custom SVG, no Lucide pile
- Reuse restyled

### PromoPopup
- See screen spec
- Reuse `promo-popup-modal.tsx` rewritten

### ReviewStars
- Five SVG stars, only if real reviews
- New small component; kill emoji

### Nav / Footer
- Reuse gadget nav/footer; fallback name Buy n Try

### SkeletonStage
- Cream-deep pulse, same aspect as card
- New

## 14. Screen-by-screen spec

### Home
- Purpose: find a type, trust COD, pick a bestseller
- Who: first-time and returning shoppers
- Layout: Hero → Shop by type → Trust → Best sellers → Featured → Offers → Reviews → Blog
- Controls: category tiles, card ATC, view all, hero CTA
- Copy: section titles “Shop by type”, “Best sellers”, “Best offers” — no AI lifestyle prose
- Empty: hide a section if it has no items (same as today)
- Loading: section skeletons
- Mobile: 2-col rails; featured stacks
- Mockup: UI-04

### Category / search
- Sticky sort/filter
- Hardware grid
- Empty: “Nothing here yet” + Shop all
- No extra promo banners

### Product
- Gallery = large cream stage
- Product name is always Manrope semibold (including the PDP heading). Newsreader is for brand and section titles only.
- Price + forest Buy now / Add to cart
- Trust under buttons from settings only
- Related = ProductStageCard
- Who: ready-to-buy shopper

### Cart drawer / cart page
- Line image in a small stage
- Qty, remove, forest checkout
- Empty: “Your bag is empty” + Shop

### Checkout
- Title Newsreader “Checkout”
- Manrope fields
- COD only, banknote icon allowed (same stroke)
- Place order forest
- Errors under fields
- No Gift icon

### Success
- Cream page
- Forest check in a quiet circle (no ping, no gold, no +)
- “Order confirmed” Newsreader
- Order id, Track order, Continue shopping
- Mockup: UI-05

### Invoice
- Buy n Try wordmark, not VoltGear

### Blog list / post
- Cream page, Newsreader title
- Hairline tiles (image + title + date)
- No dark gold hero
- Meta: Buy n Try, not VoltGear

### Write review
- Cream, Newsreader “Write a review”
- Form Manrope
- No dark gold header

### Care pages (contact, track, FAQ, warranty, shipping, about, legal, bulk)
- Same nav/footer
- Newsreader H1, Manrope body
- Forms match checkout inputs

### 404
- Cream, short Newsreader line, forest button home

### Welcome popup
- Overlay black/50
- Cream panel max-w-md, 16px radius, hairline
- BNT seal
- Title: Buy it. Try it.
- Body: 10% off first order over Rs. 3,000
- Code BNT10 (or live welcome code) + Copy
- Continue shopping
- Once / 7 days / ~5s
- If coupon inactive: do not show
- Mockup: UI-03

## 15. User flows (UI steps)

**Find and buy**
1. Home → tap a type tile  
2. Grid → tap card or Add to cart  
3. Bag → Checkout → place COD  
4. Success → Track  

**First visit coupon**
1. Wait ~5s  
2. Copy BNT10  
3. Continue shopping  
4. Apply at checkout (real coupon)  
5. Not shown again for 7 days  

**Review**
1. Write review → pick product → submit  
2. Stars on PDP only after a real published review  

## 16. Accessibility

- All actions are buttons/links, not clickable divs
- Focus ring forest 2px
- Popup: role=dialog, labelled title, focus in, Esc closes, return focus
- ATC has accessible name with product name
- Stars decorative if count is in text
- Contrast: charcoal on cream, white on forest, sale terracotta on cream (not neon gold)
- Errors announced (`aria-live` polite on checkout submit)
- Reduced motion honored
- 16px inputs on iOS to avoid zoom

## 17. Content & microcopy

- Brand: Buy n Try  
- Bag empty: Your bag is empty  
- ATC: Add to cart → Added  
- Sold out: View product  
- Popup title: Buy it. Try it.  
- Popup dismiss: Continue shopping  
- Trust: Cash on delivery / Free shipping over {threshold} / {n}-day returns / {n}-month warranty — only real settings  
- No: Exclusive Welcome Offer, I’ll pay full price, VoltGear VIP, Sparkles copy  

## 18. Build order (UI only)

1. Tokens + Newsreader/Manrope on `.gadget-theme` — check any shopper page  
2. Button, input, badge — check checkout + card  
3. ProductStageCard + stars + icons — check home + catalog  
4. Nav/footer wordmark — check mobile  
5. Popup — check first load + 7-day hide  
6. Home default order — check empty settings  
7. PDP, cart, checkout, success  
8. Blog, review, care, 404, invoice  
9. Copy sweep VoltGear / Accessories Hub / VOLT10  

## 19. Impact on existing screens

- Live `/` already uses `GadgetHomePage` — restyle in place  
- Old `ProductCard` boxed style leaves the shopper path  
- Blog/success lose gold heroes  
- Admin Home layout still controls section on/off and custom order  
- T-19 craft tokens stay where they match; type and card chrome change  

## 20. Open questions

None.

## 21. Approval

- [x] User approved this UI plan  
- Date / note: approved in chat 2026-09-05; implementation started the same day
