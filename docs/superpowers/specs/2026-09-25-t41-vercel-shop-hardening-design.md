# Spec: T-41 — Vercel usage & storefront hardening (voltgear / buyntryy.com)

## Objective

Prevent repeat **Fluid Active CPU / invocation** blowups on the **shop** Vercel project while improving cache hit rate, payload discipline, and operability. Scope: **`apps/storefront`** only; project **`voltgear`**; domain **`buyntryy.com`**.

## Success

- Admin-only HTTP handlers are **not** deployed on the shop (404 on shop; live on admin app).
- Catalog pages stay **ISR**; sitemap and other read-heavy metadata **cached**.
- Analytics ingest stays accurate but **does not** run DB cleanup on the hot path.
- Vercel **usage alerts** enabled (manual dashboard step); baseline Usage captured after deploy.
- `npm test` green; shop build green.

## Phase breakdown

| Phase | Work |
|-------|------|
| 0 | Usage notifications in Vercel dashboard (CPU, Edge, Image, transfer) |
| 1 | Remove admin APIs from shop; add to admin app |
| 2 | Sitemap ISR; analytics cleanup via daily cron only |
| 3 | Images/bandwidth (T-39 perf pass — follow-up) |
| 4 | Observability compare vs baseline |

## Shop API allowlist (v1)

Shopper + ops-on-shop only: checkout, orders lookup/cancel, contact, reviews, promo, newsletter, abandoned-cart, analytics event, settings, store/products, upload (review photos), revalidate, flows cron, feeds, demo (if enabled).

**Not on shop:** `/api/orders/.../status`, `DELETE /api/orders/...`, `POST /api/indexnow` (admin host).

## Impact analysis

| Surface | Change |
|---------|--------|
| Admin order UI | Calls `/api/orders/...` on **admin** deployment |
| Shop Fluid CPU | Fewer admin routes in serverless graph; less work per analytics hit |
| SEO | IndexNow manual POST moves to admin; publish revalidate on shop unchanged |
| Cron | `/api/flows` adds optional analytics cleanup once per day |
