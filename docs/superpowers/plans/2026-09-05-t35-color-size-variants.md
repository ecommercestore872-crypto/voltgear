# Color and Size Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the owner turn Color and/or Size on a product, toggle each value, optionally attach a color photo that swaps the gallery, and record the choice on the order — without per-variant units.

**Architecture:** Pure rules in `lib/variant-options-rules.ts` generate sellable `product_variants` rows from enabled options. Product columns store the axes. Checkout still requires a real `variantKey` but decrements **product** units only. Gadget buy box (and legacy purchase section) render two pickers and pass the color photo into `ProductGallery.variantImage`.

**Tech Stack:** Next.js 14, TypeScript, Supabase SQL, node:test via `tsx --test`, existing admin form + Gadget chrome.

## Global Constraints

- Color and Size are the only axes.
- No units on color, size, or combos. Product `quantity` only (`NULL` = unlimited, `0` = sold out).
- Price is always the product price for generated rows.
- Optional color photo swaps the gallery; size never changes the image.
- Off values are hidden and have no variant row.
- Pre-select an axis only when it has exactly one enabled value.
- Do not commit unless the user asks.
- Existing flat “Choose option” list stays until Color or Size is turned on.

---

### Task 1: Variant option rules (TDD)

**Files:**
- Create: `lib/variant-options-rules.ts`
- Test: `lib/variant-options-rules.test.ts`
- Modify: `package.json` (`test` script)

**Interfaces:**
- Consumes: none
- Produces: `VariantOption`, `VariantAxes`, `optionKey`, `validateVariantAxes`, `generateSellableVariants`, `comboVariantKey`, `canSubmitVariantSelection`, `initialAxisSelection`, `colorImageForKey`, `parseVariantOptions`, `axesEnabled`

- [x] Write failing tests then implement rules
- [x] Wire `lib/variant-options-rules.test.ts` into `npm test`

### Task 2: Persist axes and generate rows on publish

**Files:**
- Modify: `lib/types.ts`, `lib/db/publish.ts`, `lib/db/admin-store.ts`, `lib/db/map.ts`, `lib/db/map.test.ts`, `lib/db/publish.test.ts`
- Create: `supabase/migrations/20260905030000_product_color_size_options.sql`

**Interfaces:**
- Consumes: Task 1 functions
- Produces: `Product.colorEnabled`, `colorOptions`, `sizeEnabled`, `sizeOptions`; live columns `color_enabled`, `color_options`, `size_enabled`, `size_options`; `withGeneratedVariants(doc)`

- [x] Migration + map/publish/admin write path

### Task 3: Checkout uses product stock

**Files:**
- Modify: `lib/stock.ts`, `lib/checkout-server.ts`, same SQL migration (replace `checkout_place_order`)
- Test: extend `lib/variant-options-rules.test.ts` or `lib/stock` coverage

**Interfaces:**
- Consumes: `Product.colorEnabled` / `sizeEnabled`
- Produces: `getVariantStockState` uses product stock when axes are on; RPC verifies variant exists then decrements product `quantity` only (uuid ids)

- [x] Product-level stock with a present variantKey

### Task 4: Admin Color / Size fields

**Files:**
- Create: `components/admin/variant-axes-fields.tsx`
- Modify: `components/admin/product-form.tsx`

- [x] Color/Size checkboxes, name, on/off, optional color photo, no units fields

### Task 5: Shop pickers + gallery swap

**Files:**
- Create: `components/product/variant-axis-pickers.tsx`
- Modify: `components/gadget/gadget-buy-box.tsx`, `components/product/purchase-section.tsx`, `components/product/product-gallery.tsx`

- [x] Two pickers when both on; color photo becomes `variantImage`; remount/reset gallery on color change; cart line uses generated key/name

---

## Spec coverage

| Spec requirement | Task |
|---|---|
| Color/Size/both/neither | 1, 4, 5 |
| Per-value on/off hidden | 1, 5 |
| No variant units | 1, 3 |
| Product units only | 3 |
| Color photo swaps image | 5 |
| Same product price | 1, 5 |
| Legacy flat list until axes on | 1, 5 |
| Publish validation | 1, 2 |
| Checkout rejects missing/off key | 3 |
| Order line `Black / M` | 1, 5 |

## Placeholder scan

None. Commit steps omitted (user must ask).
