# Buy n Tryy order-sheet receiver

This file extends the existing private Google Apps Script Order Manager. It
accepts signed website order projections and upserts them into `Orders`. It does
not read or write the Ads sheet.

## Deployment

1. Add `WebsiteSync.gs` to the existing Apps Script project.
2. In the existing `Code.gs`, route four operations through the integration
   helpers:
   - `getOrders(...)` → `websiteGetOrders_(readRows_(ordersSheet_()), query, status)`
   - `getOrderById(...)` → `websiteGetOrderById_(readRows_(ordersSheet_()), id)`
   - `dashboard_(entries)` → `websiteDashboard_(entries)`
   - inside `updateOrder`, call `websiteUpdateOrder_` before the manual-order
     `clean_` path and return its result when non-null.
3. Create a 32+ character random secret. Store it as the Script Property
   `BNT_WEBSITE_SYNC_SECRET`.
4. For the first verification, set `BNT_WEBSITE_SYNC_SHEET_ID` to the dedicated
   integration-test spreadsheet ID. After all tests pass, change it to the live
   spreadsheet ID `1je1kATo7AHmmir6B6B2TGgXiygZrixm6V2RTmdscvHs`.
5. Run `setupWebsiteSync` while signed in as the owner. This also changes the
   Dashboard order/status formulas to count unique Order IDs, so multi-item
   website orders are not counted more than once.
6. Create a **second web-app deployment**, executing as the owner, with access
   set to **Anyone** so Vercel can POST signed requests. Keep the existing
   owner-only deployment and URL for the management UI. The public deployment's
   `doGet` still calls `authorize_`; only signed `doPost` requests can write.
7. Set the same secret in Vercel as `GOOGLE_ORDER_SYNC_SECRET` and set
   `GOOGLE_ORDER_SYNC_URL` to the deployment `/exec` URL. Never prefix either
   variable with `NEXT_PUBLIC_`.

## Data ownership

The integration makes no database schema or data changes. It reads saved orders
and sends signed copies after checkout and lifecycle responses. There are no SQL
migrations, triggers, queue tables, or database write calls in the sync sender.
Delivery is best effort; Google outages do not change checkout success.

Recovery uses authenticated `POST /api/admin/order-sheet-sync` with either
`{"orderId":"..."}` or `{"from":"2026-10-01T00:00:00Z","to":"2026-10-21T23:59:59Z","offset":0}`.
Date ranges are limited to 31 days; repeat with `nextOffset` until it is null.
Inspect each result and retry failed IDs. No database state is modified.

- Supabase is authoritative for website order identity, customer details,
  items, totals, status, and tracking.
- The receiver preserves manually maintained Product Cost, Courier Cost,
  Amount Received, and non-empty Notes on subsequent synchronizations.
- Manual sheet orders are untouched because website rows use stable `WEB-...`
  Submission IDs.
- Each website line item uses one row. Shipping and discount are written only
  on the first line, so summing the line totals produces the order total.
