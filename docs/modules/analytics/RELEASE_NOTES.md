# Analytics — release notes

## 2026-09-25 — Weekly Purchase sanity (remediation step 7)

- Admin `GET /api/admin/analytics/purchase-sanity` compares placed orders to TikTok/Meta Purchase counts.
- CLI: `npm run sanity:purchases`; shop logs `[purchase-track]` for server CAPI attempts.
- Runbook: `docs/modules/analytics/PURCHASE_SANITY_WEEKLY.md`.

## 2026-08-27 — Commerce intelligence (T-14)

- Admin **Analytics** (`/admin/analytics`) reports **delivered revenue** as the primary number. Placed revenue is shown separately and is not treated as cash received.
- Products, cities, customers, the order funnel, a whitelist query builder, saved reports, and click-through to the real orders behind a total.
- Optional product **Your cost** is admin-only. Shoppers never see it. Missing costs show profit as **Not available**.
