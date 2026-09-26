# Admin & shop backend architecture (Buy n Try)

Production stack optimized for **low DB round-trips**, **co-located compute**, and **observable APIs**.

## Topology

```
Browser → buyntryy.com (/admin, /api/admin/*)
         → Vercel rewrite → voltgear-admin (syd1)
         → Supabase Final-store (Oceania)
         + static JS/CSS → NEXT_PUBLIC_ADMIN_ASSET_ORIGIN (admin host)

Shopper → buyntryy.com (storefront, checkout, /api/*)
         → voltgear (syd1)
         → Supabase + Resend + ad pixels (browser)
```

| Layer | Project | Region | Role |
|--------|---------|--------|------|
| Staff UI + admin APIs | `voltgear-admin` | **syd1** | CRUD, search, settings |
| Shop + checkout | `voltgear` | **syd1** | Catalog ISR, checkout RPC |
| Database | Supabase `zeuhfqevqjkbzwdaxjuv` | Oceania | Single source of truth |

## Data access patterns

| Feature | Pattern |
|---------|---------|
| Orders list | Paginated SQL + tab counts (`admin-orders-store`) |
| Admin home (orders) | Single RPC `admin_order_dashboard_metrics` |
| Customers | View `admin_customer_rollups` + pagination |
| Command search | Bounded `ilike` queries (no full table scan) |
| Settings / shop types | `unstable_cache` + tag invalidation on write |
| Storefront catalog | ISR + short revalidate on service client GETs |

## Caching & freshness

- **Admin reads:** tagged cache (`admin-settings`, `admin-shop-types`, `admin-products`) with explicit `revalidateTag` on mutations.
- **Admin writes:** always `getAdminSettingsForUpdate()` (no stale read cache).
- **Shop:** `revalidateAfterPublish` → shop `/api/revalidate` when `STOREFRONT_URL` is set.

## Observability

Structured JSON logs (Vercel Logs / drains):

| `kind` | When | Env |
|--------|------|-----|
| `admin_api` | Route handler ≥ `ADMIN_API_SLOW_MS` (default 800) | Wrap with `withAdminApiObservability` |
| `admin_supabase_slow` | Admin service client fetch ≥ `ADMIN_SUPABASE_SLOW_MS` (default 600) | Automatic on admin Supabase client |
| `shop_supabase_slow` | Storefront service client fetch ≥ `SHOP_SUPABASE_SLOW_MS` (default 700) | Automatic on shop Supabase client |
| `shop_api` | Shop route ≥ `SHOP_API_SLOW_MS` (default 1200) | `withShopApiObservability` (e.g. `/api/flows`) |

Optional: `ADMIN_API_LOG_ALL=1` logs every wrapped admin route.

**Admin API coverage:** all `apps/admin/app/api/**/route.ts` handlers wrapped via `withAdminApiObservability` (maintain with `node scripts/wrap-admin-api-observability.mjs` after adding new routes).

**Shop API coverage:** all `apps/storefront/app/api/**/route.ts` except **checkout** (uses `[checkout-slo]` on every request). Maintain with `node scripts/wrap-shop-api-observability.mjs` after adding routes.

**Checkout:** `checkoutSloLog` — primary SLO; not wrapped with `shop_api` to avoid duplicate logs.

## Security

- Admin auth: cookie + `ADMIN_TOKEN`; APIs use `isAdminRequest`.
- Service role **server-only** (`getServiceClient({ admin: true })`).
- RLS on anon; admin bypasses via service role, never exposed to browser.

## Migrations (admin performance)

- `20260926190000_admin_order_search_indexes.sql`
- `20260926210000_admin_customer_rollups.sql`
- `20260926220000_admin_dashboard_order_metrics.sql`

Apply: `npx supabase db push --include-all` on Final-store.

## Vercel usage discipline (avoid plan limits)

| Risk | Mitigation in repo |
|------|---------------------|
| Full catalog API on every cart/search open | `/api/store/products` is **ISR + CDN** (`s-maxage=300`); clients use **featured/slugs/recommend** only |
| Edge middleware on every page | Storefront middleware runs on **`/`, checkout, `/api/checkout` only**; www → apex via **next.config redirect** |
| Publish → many `/api/revalidate` POSTs | `revalidateAfterPublish("/", …)` passes **all paths in one HTTP call** |
| Daily cron loading full order bundles | `/api/flows` win-back uses **`getLightweightOrders()`** |
| Staff on same-origin proxy | Optional: unset `ADMIN_PROXY_UPSTREAM`, use admin host + `ADMIN_PUBLIC_URL` to avoid double serverless |

Do **not** set `ADMIN_API_LOG_ALL=1` in production unless debugging (extra log volume).

## Deploy checklist

1. Push `main` → Git builds **voltgear** + **voltgear-admin** (or CLI prod deploy both).
2. Env: shop `ADMIN_PROXY_UPSTREAM`, admin `NEXT_PUBLIC_ADMIN_ASSET_ORIGIN`, shared Supabase keys.
3. Smoke: `ADMIN_SAME_ORIGIN=1 npm run smoke:t40`
4. Watch Vercel for `admin_api` / `admin_supabase_slow` after traffic.

## Supabase connection discipline

- **One** cached `getServiceClient()` per serverless instance; admin uses `{ admin: true }` with `cache: no-store`.
- In Supabase dashboard: enable **Supavisor pooler** (transaction mode) for serverless if connection count climbs; point server env at pooler URL when documented for your plan.
- Weekly: check **Query performance** for repeated >500ms statements.

## UI bundle discipline

- Heavy admin surfaces (e.g. **Messaging / broadcast**) load via `next/dynamic` so initial `/admin` shell stays lean.
- `optimizePackageImports` for `lucide-react`, Radix, `@supabase/supabase-js` in `apps/admin/next.config.mjs`.

## Maintaining observability

After adding a new admin API route:

```bash
node scripts/wrap-admin-api-observability.mjs
npm run build:admin
```

After adding a new storefront API route (except checkout):

```bash
node scripts/wrap-shop-api-observability.mjs
npm run build:storefront
```
