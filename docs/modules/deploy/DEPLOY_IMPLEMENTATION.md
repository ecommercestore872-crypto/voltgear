# Vercel production implementation

The repo is an npm monorepo: **shop** (`apps/storefront`) and **admin** (`apps/admin`) are separate Vercel projects. Database and images stay on the same Supabase and Cloudinary projects as local.

## Live URLs

| App | Host (target) | Vercel root directory |
|---|---|---|
| Shop | https://buyntryy.com | `apps/storefront` |
| Admin (staff URL) | **https://buyntryy.com/admin** (same-origin proxy) or redirect target below | `apps/admin` (separate Vercel project) |

## Two-project setup (T-40)

### Recommended: admin at **buyntryy.com/admin** (URL stays on shop domain)

Two Vercel projects still; the shop **proxies** `/admin` and `/api/admin/*` to the admin deployment.

| Project | Variables (production + preview) |
|---------|----------------------------------|
| **voltgear** (shop) | `NEXT_PUBLIC_SITE_URL=https://buyntryy.com`, `ADMIN_PUBLIC_URL=https://buyntryy.com`, `ADMIN_PROXY_UPSTREAM=https://<your-admin>.vercel.app` (no trailing slash) |
| **voltgear-admin** | `NEXT_PUBLIC_SITE_URL=https://buyntryy.com`, `STOREFRONT_URL=https://buyntryy.com`, `NEXT_PUBLIC_ADMIN_ASSET_ORIGIN=https://<your-admin>.vercel.app` (loads JS/CSS from admin host) |

Redeploy **both** after changing these. Smoke: `ADMIN_SAME_ORIGIN=1 npm run smoke:t40` (default `ADMIN_PUBLIC_URL` matches shop).

### Legacy: redirect to separate admin host

1. **Shop project** — Settings → General → **Root Directory** = `apps/storefront`. Set **`ADMIN_PUBLIC_URL=https://voltgear-admin-dashboard.vercel.app`** (no trailing slash) so `/admin/*` and `/studio` **redirect** off buyntryy.com. Do **not** set `ADMIN_PROXY_UPSTREAM`.
2. **Admin project** — On your personal Vercel account: project **`voltgear-admin-dashboard`** → **https://voltgear-admin-dashboard.vercel.app**, root **`apps/admin`**. Copy Supabase, Cloudinary, Resend, `ADMIN_TOKEN`, etc. Add **`STOREFRONT_URL=https://buyntryy.com`**.
3. **Ignored Build Step** (each project, repo root as context for the script path):
   - Shop: `bash scripts/vercel-should-build-storefront.sh`
   - Admin: `bash scripts/vercel-should-build-admin.sh`
4. **Local dev:** `npm run dev:storefront` (3000) and `npm run dev:admin` (3001).

Build/install commands live in each app’s `vercel.json` (`cd ../.. && npm ci` + workspace build).

Legacy single-app deploy from repo root is **deprecated** after T-40.

**Verify:** `npm run smoke:t40` and `docs/modules/deploy/T40_VERIFICATION.md`.

### Admin deploy (separate Vercel account OK)

Shop (**voltgear** / buyntryy.com) redirects `/admin` to **`ADMIN_PUBLIC_URL`**. Admin can live on **another Vercel account** (e.g. your personal login); it does not have to be **ecommercestore872-crypto**.

1. Log in to Vercel as the account that will host admin (`vercel login`).
2. From repo root: `.\scripts\deploy-admin-vercel.ps1`
3. On the **admin** project: env **`STOREFRONT_URL=https://buyntryy.com`**, same **`ADMIN_TOKEN`** and DB keys as shop.
4. On the **shop** project (other account’s dashboard): set **`ADMIN_PUBLIC_URL=https://voltgear-admin-dashboard.vercel.app`**, redeploy shop.

Create the admin Vercel project as **`voltgear-admin-dashboard`** on your account so the default alias matches.

## What was wired

- Production env copied from `.env.local` (Supabase, Cloudinary, Resend, admin token, cron secret). Sanity keys were skipped. Do not commit `.env.local`.
- `NEXT_PUBLIC_SITE_URL` falls back to Vercel’s production host when unset (`lib/deploy-rules.ts` `publicSiteUrl()`).
- Production admin requires `ADMIN_TOKEN` (no demo fallback).
- `GET /api/flows` returns 401 unless `Authorization: Bearer <CRON_SECRET>`. Vercel Cron sends that header. Schedule is daily (`0 9 * * *` in `vercel.json`) so it fits the Hobby plan.
- `/studio` still redirects to `/admin/login`.

## Env

Placeholders live in `.env.example`. Real values stay in `.env.local` and the Vercel dashboard. To copy keys again without printing values: `node scripts/push-vercel-env.mjs`.

After a custom domain, set `NEXT_PUBLIC_SITE_URL` to that origin (no trailing slash) and redeploy.

## Vercel usage alerts (T-41)

On the **voltgear** project (Hassaan Pro / buyntryy.com): enable **Usage** and **Spend Management** notifications (e.g. 50% / 75% / 100%). Review Observability route sort weekly after deploy.

Full thresholds and daily “10 numbers”: **`docs/INFRASTRUCTURE-HEALTH-CHECKLIST.md`**.

## Out of this module

Custom domain, GitHub integration, Clarity (T-05), switching `/` to gadget chrome, card payments.
