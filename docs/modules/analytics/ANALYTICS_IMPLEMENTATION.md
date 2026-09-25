# Analytics implementation

Admin-only commerce intelligence for COD. The success event is a **delivered order**, not an order placed.

## Who uses it

You, at `/admin/analytics`, with the same admin cookie as the rest of admin. Shoppers never see this. Public product APIs do not include `cost_price`.

## What it answers

- Which product made the most delivered profit (when costs are filled in)
- Which city has the highest cancellation rate among orders placed in the range
- What share of placed orders are currently delivered
- 30 / 60 / 90 day reorder rates (email identity only)
- Where the operational funnel drops: Placed → Processing → Shipped → Delivered

## Data sources

Consumes existing tables. Does not rebuild checkout, orders, products, or tracking.

| Source | Use |
|---|---|
| `orders` + `order_items` + `order_status_history` | Counts, revenue, funnel, drilldown |
| `products.cost_price` | Internal cost for delivered gross profit |
| `analytics_saved_reports` | Named whitelist queries |

Practice / `is_demo` orders are excluded.

## Rules (Asia/Karachi days)

- **Placed** = `created_at` in range.
- **Processing / shipped / delivered / cancelled in range** = first time that status appears in history (else `status_updated_at` if that is the current status).
- **Delivered revenue** = sum of totals for orders first marked delivered in range. Cancelled money is never delivered revenue.
- **Delivery rate** = of orders placed in range, share **currently** delivered.
- **Cancel rate** = of orders placed in range, share currently cancelled.
- **Delivered gross profit** = delivered revenue − (cost × qty). If any delivered line has no cost, profit is **Not available**.
- Customer key = trimmed lowercase email. No phone merge.
- Confirmed, out for delivery, returned, visitors, ads, ROAS, contribution profit = **Not available** (no stored source).

## APIs (admin cookie / Bearer)

| Method | Path | Role |
|---|---|---|
| GET | `/api/admin/analytics?preset=&from=&to=` | Executive + products + cities + customers + funnel |
| POST | `/api/admin/analytics/query` | Whitelist metric / dimension / range. No SQL. |
| GET | `/api/admin/analytics/orders?ids=` | Drilldown: order number, date, status, city, total. No email or phone. Max 100 ids. |
| GET | `/api/admin/analytics/purchase-sanity?preset=&tiktok=&meta=` | Weekly: placed orders vs TikTok/Meta Purchase counts + attribution proxies |
| GET/POST | `/api/admin/analytics/reports` | List / save named queries |
| DELETE | `/api/admin/analytics/reports/[id]` | Delete a saved report |

Presets: `today`, `yesterday`, `last7`, `last30`, `thisMonth`, `custom`.

Unauthorized requests return 401. Query builder rejects unknown metrics and dimensions with 422.

## UI

`/admin/analytics` uses the same admin cards, `h-11` controls, and tables as Home/Orders. Delivered revenue is the lead tile. Click a total to list the orders. Product form has **Your cost (hidden from shop)**.

## Performance

Server-side aggregation over `getAllOrders()` (already used by admin Home). No materialized tables. Indexes on `orders(created_at)`, `orders(status)`, and `order_status_history(order_id, at)`.

## Schema

Migration `supabase/migrations/20260827230000_commerce_intelligence.sql`: `products.cost_price`, indexes, `analytics_saved_reports`.

## Key files

| Path | Role |
|---|---|
| `lib/db/analytics-rules.ts` | Counting and query engine (unit-tested) |
| `lib/db/analytics.ts` | Loads orders + costs, sanitizes drilldown |
| `components/admin/analytics-console.tsx` | Admin UI |
| `app/admin/analytics/page.tsx` | Page |
| `app/api/admin/analytics/**` | Admin APIs |

## First-party ingest retention (shop)

Tables: `analytics_visitors`, `analytics_sessions`, `analytics_events` (RLS on; service role only).

| Data | Retention |
|------|-----------|
| Sessions + events | 90 days (`last_activity_at` / `occurred_at`) |
| Visitors | 365 days (`last_seen_at`), orphans removed after session probe |

Purge runs on shop cron **`GET /api/flows`** (daily, `CRON_SECRET`) — not on each `/api/analytics/event` hit. Batch limits per run: up to 5k old events, 2k stale sessions (see `lib/db/analytics-cleanup.ts`). Indexes: migration `20260925100000_analytics_retention_indexes.sql`.

Monitor row counts: `docs/modules/database/SUPABASE_HEALTH.md`.

## Out of this module

Rebuilding orders, checkout, products, customer management, or courier tracking. Microsoft Clarity / visitor funnel (T-05). Ad spend import and delivered ROAS (no spend source yet).
