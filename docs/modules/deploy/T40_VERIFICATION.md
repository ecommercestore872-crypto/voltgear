# T-40 verification — shop/admin split

Scope: **voltgear** (buyntryy.com) + admin app. **Staff URL:** **https://buyntryy.com/admin** (same-origin proxy). Upstream admin project: `voltgear-admin-pi.vercel.app` via `ADMIN_PROXY_UPSTREAM`.

## Required env (dashboard)

| Project | Variable | Example |
|---------|----------|---------|
| Shop | `ADMIN_PUBLIC_URL` | `https://voltgear-admin-dashboard.vercel.app` |
| Admin | `STOREFRONT_URL` | `https://buyntryy.com` |
| Both | `ADMIN_TOKEN` | Same secret (revalidate + admin auth) |

## Automated smoke (no token)

From repo root:

```bash
node scripts/smoke-t40-production.mjs
```

Optional overrides: `SHOP_URL`, `ADMIN_PUBLIC_URL`.

Checks:

- `/admin`, `/admin/login`, `/studio` redirect to admin host
- `POST /api/revalidate` without `Authorization` → **401**
- `GET /api/admin/...` on shop → **404**

## Publish → shop revalidate (manual)

1. Open admin → change something visible on shop (e.g. hero or product title) → **Publish**.
2. Hard-refresh shop home or PDP (or wait one ISR TTL — publish should be immediate via HTTP revalidate).
3. In **admin** Vercel logs, confirm no failed fetch to `https://buyntryy.com/api/revalidate` (401/5xx).

Optional curl (replace token):

```bash
curl -sS -X POST "https://buyntryy.com/api/revalidate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paths":["/","/products"]}'
```

Expect JSON with `"revalidated": true`.

## CI coverage

- `packages/shared/lib/storefront-admin-redirects.test.mjs` — redirect rules
- `packages/shared/lib/revalidate-storefront-http.test.ts` — admin → shop POST contract

## Cron

Daily `/api/flows` runs on **shop** only (`apps/storefront/vercel.json`). Admin project must not define the same cron.
