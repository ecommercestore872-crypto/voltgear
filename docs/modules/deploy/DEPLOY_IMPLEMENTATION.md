# Vercel production implementation

The repo is an npm monorepo: **shop** (`apps/storefront`) and **admin** (`apps/admin`) are separate Vercel projects. Database and images stay on the same Supabase and Cloudinary projects as local.

## Live URLs

| App | Host (target) | Vercel root directory |
|---|---|---|
| Shop | https://buyntryy.com (custom) / production storefront project | `apps/storefront` |
| Admin | https://voltgear-admin.vercel.app (interim) | `apps/admin` |

## Two-project setup (T-40)

1. **Shop project** — Settings → General → **Root Directory** = `apps/storefront`. Production env must include `ADMIN_PUBLIC_URL` (admin origin, no trailing slash) so `/admin/*` and `/studio` redirect to the admin app.
2. **Admin project** — New project, same Git repo, **Root Directory** = `apps/admin`. Copy Supabase, Cloudinary, Resend, `ADMIN_TOKEN`, etc. Add **`STOREFRONT_URL`** = shop origin (for publish → `POST /api/revalidate`).
3. **Ignored Build Step** (each project, repo root as context for the script path):
   - Shop: `bash scripts/vercel-should-build-storefront.sh`
   - Admin: `bash scripts/vercel-should-build-admin.sh`
4. **Local dev:** `npm run dev:storefront` (3000) and `npm run dev:admin` (3001).

Build/install commands live in each app’s `vercel.json` (`cd ../.. && npm ci` + workspace build).

Legacy single-app deploy from repo root is **deprecated** after T-40.

## What was wired

- Production env copied from `.env.local` (Supabase, Cloudinary, Resend, admin token, cron secret). Sanity keys were skipped. Do not commit `.env.local`.
- `NEXT_PUBLIC_SITE_URL` falls back to Vercel’s production host when unset (`lib/deploy-rules.ts` `publicSiteUrl()`).
- Production admin requires `ADMIN_TOKEN` (no demo fallback).
- `GET /api/flows` returns 401 unless `Authorization: Bearer <CRON_SECRET>`. Vercel Cron sends that header. Schedule is daily (`0 9 * * *` in `vercel.json`) so it fits the Hobby plan.
- `/studio` still redirects to `/admin/login`.

## Env

Placeholders live in `.env.example`. Real values stay in `.env.local` and the Vercel dashboard. To copy keys again without printing values: `node scripts/push-vercel-env.mjs`.

After a custom domain, set `NEXT_PUBLIC_SITE_URL` to that origin (no trailing slash) and redeploy.

## Out of this module

Custom domain, GitHub integration, Clarity (T-05), switching `/` to gadget chrome, card payments.
