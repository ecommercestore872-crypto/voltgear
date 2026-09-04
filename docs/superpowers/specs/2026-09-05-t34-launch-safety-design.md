# T-34 — Launch safety (first live-sales slice)

Date: 2026-09-05  
Status: approved by “just start from where its best”  
Scope: Project A only. Not chrome CMS, not Autopilot engines, not analytics restyle, not editable email templates.

## Problem

The store can take COD orders today, but four gaps can lose money or hide that something failed:

1. Courier book APIs under `/api/admin/postex/book` and `/api/admin/autopilot/dispatch` do not call `isAdminRequest`.
2. Footer newsletter returns success and does not store the email.
3. New-order mail to the owner is only a BCC of the customer template, still branded VoltGear by default.
4. `checkout_decrement_inventory` exists in SQL but `createOrderRow` never calls it. Checkout inserts the order and leaves stock unchanged. Products with `quantity IS NULL` must keep selling (unlimited) so we do not block launch.

## Approach

Minimal surgical fixes on existing patterns. No new providers. No Autopilot ACTIVE behavior.

### 1. Courier API auth

Both book routes return 401 unless `isAdminRequest` (cookie or Bearer), same as every other admin write. Auth runs before booking.

### 2. Newsletter

- Validate and normalize email in `lib/newsletter-rules.ts`.
- Persist to `newsletter_subscribers` (unique on normalized email). Duplicate signup is success, not a second row.
- Admin list at `/admin/newsletter` under Customers.
- Footer UI already talks to `/api/newsletter`; keep that contract. Failed persist = HTTP error (no fake success).

### 3. Order emails

- Customer still gets `buildOrderConfirmationEmail`. Brand fallback is `SHOPPER_BRAND.spokenName` (“Buy n Try”), not VoltGear.
- Owner gets a **separate** `buildAdminNewOrderEmail` (“A customer placed an order”) to `ORDER_NOTIFY_EMAIL`. No BCC of the customer letter.
- Missing notify address: skip admin send; checkout still succeeds.
- Status emails unchanged. Template CMS is a later project.

### 4. Stock

- Rule: `NULL` quantity = unlimited. Set integer = decrement atomically.
- New RPC `checkout_place_order` creates the order and decrements only configured rows. Insufficient stock = business error, no order.
- If the RPC is not on the database yet, fall back to today’s insert (same pattern as cancel).
- Product form gets an optional **Units on hand** field. Empty = unlimited. `0` forces out of stock.

### 5. Autopilot honesty

Defaults: master off, every mode `DISABLED`. Toggles still do not run engines. This stops the “ONLINE” lie at go-live.

## Out of scope

Navbar/footer CMS, compare page, Autopilot #2–#4 runtime, settlement upload, analytics layout, WhatsApp COD confirm, Playwright.

## Risks

| Risk | Mitigation |
|------|------------|
| Migration not pushed | RPC/newsletter fallback or admin banner; checkout still works |
| Products stay unlimited | Quantity field is optional; document that units must be set to stop oversell |
| Email env missing | Dev log; checkout does not fail |
| FROM_EMAIL still VoltGear domain | Do not change sending domain here; only visible brand copy |

## Tests

Unit tests for newsletter normalize, admin email copy, stock decision, product quantity merge, Autopilot defaults. No Playwright until the QA catalog is approved.
