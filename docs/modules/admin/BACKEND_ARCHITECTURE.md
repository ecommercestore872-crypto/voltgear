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

Optional: `ADMIN_API_LOG_ALL=1` logs every wrapped route.

**Wrapped routes (extend over time):** `GET /api/admin/search`, `GET /api/admin/orders`, `GET|PATCH /api/admin/settings`.

## Security

- Admin auth: cookie + `ADMIN_TOKEN`; APIs use `isAdminRequest`.
- Service role **server-only** (`getServiceClient({ admin: true })`).
- RLS on anon; admin bypasses via service role, never exposed to browser.

## Migrations (admin performance)

- `20260926190000_admin_order_search_indexes.sql`
- `20260926210000_admin_customer_rollups.sql`
- `20260926220000_admin_dashboard_order_metrics.sql`

Apply: `npx supabase db push --include-all` on Final-store.

## Deploy checklist

1. Push `main` → Git builds **voltgear** + **voltgear-admin** (or CLI prod deploy both).
2. Env: shop `ADMIN_PROXY_UPSTREAM`, admin `NEXT_PUBLIC_ADMIN_ASSET_ORIGIN`, shared Supabase keys.
3. Smoke: `ADMIN_SAME_ORIGIN=1 npm run smoke:t40`
4. Watch Vercel for `admin_api` / `admin_supabase_slow` after traffic.

## Future improvements

- Wrap remaining `/api/admin/*` handlers with `withAdminApiObservability`.
- Split heavy admin routes (broadcast, email) via `next/dynamic`.
- Optional read replica / connection pooler tuning on Supabase dashboard.
