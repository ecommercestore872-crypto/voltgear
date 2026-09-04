# T-35 — Color and Size variants

Date: 2026-09-05  
Status: approved 2026-09-05  
Scope: Product Color/Size pickers only. No per-color or per-size units.

## Objective

The owner can turn **Color**, **Size**, both, or neither on each product, add named values, and turn any value on or off. Shoppers pick the live axes. Choosing a color that has its own photo shows that photo as the product image. Orders store the chosen label (`Black`, `M`, or `Black / M`).

Stock stays on the product **Units on hand** field from T-34. Color and size never have their own counts.

## Assumptions (correct these if wrong)

1. Color and Size are the only axes. No material, voltage, or custom third axis.
2. The owner types names on the product (Black, Navy, S, M, L). No store-wide size chart.
3. Price is always the product price.
4. A color photo is optional. If set, picking that color puts that image first in the gallery. If not set, the product photos stay as they are.
5. Existing products with a flat “Choose option” list keep that list until Color or Size is turned on.
6. Empty product units still mean unlimited. Product `0` still means sold out for every choice.

## Approach

Reuse `product_variants` as the sellable choice rows (cart and checkout already require a `variantKey` when variants exist). Store Color/Size configuration on the product. On publish, generate one variant row per live choice (or per live color × size combo). Do **not** write variant `quantity`. Checkout must decrement **product** units only, even when a `variantKey` is present.

Rejected: new Shopify-style option tables (too much). Rejected: combo inventory (owner said ignore units on color/size).

## Product configuration

| Color | Size | Shop | Generated rows |
|---|---|---|---|
| Off | Off | No picker (or legacy flat list if it already exists) | None from this feature |
| On | Off | Color only | One row per enabled color |
| Off | On | Size only | One row per enabled size |
| On | On | Color, then Size | One row per enabled color × enabled size |

- **Value off:** hidden on the shop. No row generated. Not for sale.
- **Value on, product in stock:** visible and purchasable.
- **Product sold out / units `0`:** every choice is sold out.
- Names are required and unique per axis on that product (case-insensitive).

Keys: slug of the color and/or size (`black`, `m`). Combo key: `black__m`. Display name: `Black / M`.

## Admin

On the product form (below Units on hand):

- Checkbox **Color variants**
- When on: list of colors — name, on/off, optional photo, add/remove
- Checkbox **Size variants**
- When on: list of sizes — name, on/off, add/remove
- No units fields on color or size rows
- Publish writes options + generated variant rows. Draft save keeps the same document shape.

## Shop

Live chrome is Gadget (`gadget-buy-box`). Legacy purchase section gets the same rules so both paths stay consistent.

- Color on → “Color” picker (swatch if a photo exists, otherwise a labeled button)
- Size on → “Size” picker (labeled buttons)
- Both → two pickers. Add to cart is disabled until both are chosen
- One axis → disabled until that axis is chosen
- Off values are not rendered
- Cart line identity: `slug::variantKey` (already). Two colors are two lines.
- Order / email / admin order detail already show `variantName`

### Color photo → product image

`ProductGallery` already accepts `variantImage`. The buy box must pass the selected color’s photo there.

- Color with photo: that image becomes the first / active gallery image
- Changing color updates the image immediately
- Color without photo: gallery stays on the product photos
- Size never changes the image
- Cart thumbnail uses the color photo when present, otherwise the product image

## Stock and checkout

Color/size are **labels**, not inventory.

- `resolveCheckout` still requires the chosen `variantKey` to exist (so a hidden/off value cannot be bought).
- Purchasability and sold-out follow the **product** `stockStatus` / units, not the variant row.
- `checkout_place_order` decrements **product** `quantity` when it is set. It must not decrement `product_variants.quantity` for this feature (those stay `NULL` / unused).
- If the RPC is missing, the T-34 insert fallback still saves `variant_key` / `variant_name` on the line.

## Data

On `products` (draft JSON and live columns):

- `color_enabled` boolean, default false
- `size_enabled` boolean, default false
- `color_options` jsonb: `[{ key, name, enabled, image? }]`
- `size_options` jsonb: `[{ key, name, enabled }]`

On publish, replace `product_variants` with the generated live set. Variant `quantity` is always `NULL`. Variant `image_url` is the color photo when Color is on.

Map those columns onto `Product` so the shop can render two pickers without parsing names.

## Error handling

- Publish with Color on and zero enabled colors → validation error (“Add at least one color, or turn Color off”).
- Same for Size.
- Duplicate names on one axis → validation error.
- Checkout with a missing/off key → existing “no longer available” error.
- Add to cart without required picks → button stays disabled.
- Pre-select an axis only when it has exactly one enabled value. Do not auto-pick the first of many.

## Testing

Node test files (same pattern as T-34):

- `lib/variant-options-rules.test.ts` — enable axes, hide off values, generate keys/names, require both picks, reject empty enabled lists
- Checkout/stock: product units still decrement when a color/size key is present; variant quantity is ignored
- Gallery helper: selected color with image → `variantImage`; without → null

Commands:

- `npm test -- lib/variant-options-rules.test.ts`
- `npm test -- lib/db/stock-rules.test.ts` (must stay green)
- `npm run lint`

Browser (after implementation): product with Color+Size, color photo swap, off value hidden, product units `0` blocks every combo, order line shows `Black / M`.

## Boundaries

**Always do:** product-level units only; hide off values; swap gallery on color photo.

**Ask first:** a third axis, per-combo stock, per-combo price, global size chart.

**Never do:** fake success if persist fails; default-select a color/size the owner did not mark default; decrement variant units.

## Out of scope

Per-combo / per-color / per-size units. Variant prices. Extra axes. Autopilot. Navbar/footer CMS. Email template CMS. Playwright catalog (until the user replies **approved** on the QA doc).

## Risks

| Risk | Mitigation |
|------|------------|
| Checkout RPC decrements variant qty when `variantKey` is set | Change RPC: always decrement product qty; leave variant qty unused |
| Old flat variants mixed with new axes | Axes off → keep legacy list. Axes on → replace with generated rows |
| Color photo not wired on Gadget | Buy box must pass `variantImage`; gallery already supports it |
| T-34 SQL not applied on live | Same fallback as T-34; variant labels still save on the order line |
