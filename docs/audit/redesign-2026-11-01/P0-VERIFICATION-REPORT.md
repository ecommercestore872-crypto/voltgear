# P0 verification report — PR #34

**Status: NO-GO for paid traffic / merge** until TikTok dedup, CMS claims, Preview backend safety, and a green exit-`0` Preview COD run on a deployment that includes the cart hydration fix.

PR #34 remains **Draft**.

| Field | Value |
| --- | --- |
| Branch | `redesign/storefront-production-polish` |
| Cart race fix | `packages/shared/lib/cart-hydration-rules.ts` + `cart-provider.tsx` |
| Playwright harden | `scripts/playwright-mocked-cod-checkout.mjs` (storage + UI + checkout-link path) |
| Unit tests | **794 pass** |

---

## Root cause (cart empty at checkout)

`CartProvider` hydrated with:

```ts
if (raw) setItems(JSON.parse(raw));
```

When `localStorage["ecomm-cart"]` was `"[]"` (truthy), a hydrate that ran **after** a fast `addItem` could **replace** the in-memory cart with `[]`. Combined with Playwright’s weak cart check (`text=/stylus|Rs/i`), the script could report `cartHasItem: true` from PDP residue while checkout correctly showed **Your cart is empty**.

### Production fix

1. `mergeCartHydration(current, stored)` — if memory already has lines, keep them (do not let empty storage wipe a prior add).
2. Sync `localStorage` write inside `addItem` / qty / remove / clear when hydrated, so rapid navigation cannot skip the persist effect.
3. `data-cart-hydrated` / `data-cart-count` on `<html>` for deterministic waits.

### Playwright fix

- Wait for `dataset.cartHydrated === "true"` before add.
- Assert `localStorage["ecomm-cart"]` contains expected **slug**, **qty > 0**, **price > 0**.
- Assert cart UI product link for the slug (not generic `Rs`).
- Reload cart and re-assert persistence.
- Use **Proceed to Checkout** link; also re-check direct `/checkout`.
- Fail if checkout shows empty-cart heading.

Regression unit tests: `cart-hydration-rules.test.ts`.

---

## Gate table

| Check | Result | Evidence |
| --- | --- | --- |
| Root cause identified | **PASS** | hydrate wipe + weak assertion |
| Production cart fix | **PASS** (code) | cart-provider + hydration rules |
| Playwright assertions | **PASS** (code) | storage/UI/checkout-link |
| Unit tests | **PASS** | 794 |
| Storefront build | (run in CI / local this session) | |
| Preview deploy `8d972f7` (voltgear) | **Ready** | `43MaZiWj2SfFDG7wQ9S2hvB7q2ti` — includes cart fix |
| Preview COD exit 0 on fixed deploy | **PENDING** | Agent could not load a valid bypass secret (clipboard was not the 32-char token). Re-run in shell where `VERCEL_AUTOMATION_BYPASS_SECRET` is set. |
| TikTok / CMS / Preview courier env | **UNTESTED / UNVERIFIED** | Release still NO-GO |

---

## Safety

- No fake cart preload to pass tests.
- Checkout still intercepts `/api/checkout` (no real orders).
- Admin / production / Supabase untouched.
