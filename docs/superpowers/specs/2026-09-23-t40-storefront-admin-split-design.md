# Spec: T-40 — Storefront / admin Vercel split (monorepo)

## Objective

Split the single Next.js deployment into **two Vercel projects** from **one GitHub repo** so **buyntryy.com** serves shoppers only and admin lives on a **separate Vercel URL** (`voltgear-admin.vercel.app` initially). Reduce **per-request** and **per-build** work on the shop project to improve Fluid CPU headroom on the account. Admin previews on **every branch** remain enabled (same as today).

**User:** store owner / ops.

**Why now:** Vercel account usage (Fluid Active CPU near the 4h cap) is tight; the monolith ships ~47 admin pages and ~52 `/api/admin/*` routes in the same deployment as the storefront.

**Success:**

- Shop project does **not** deploy or serve `/admin/*` or `/api/admin/*`.
- `https://buyntryy.com/admin` and `/admin/*` **redirect** to `https://voltgear-admin.vercel.app/admin/...` (path + query preserved).
- Admin login, CMS, analytics, and `/api/admin/*` work on the admin host.
- Publishing content still refreshes the **live shop** (ISR / on-demand revalidate).
- Cron **`GET /api/flows`** stays on the **storefront** project only.
- Both projects continue **preview deployments for all branches**.

**Out of scope (v1):** second Supabase project; custom domain `admin.buyntryy.com` (phase 3 later); admin UI rewrite; splitting checkout; disabling PR previews.

## Locked decisions

| Topic | Decision |
|---|---|
| Repo layout | **npm workspaces**: `apps/storefront`, `apps/admin`, `packages/shared` |
| Shop domain | `buyntryy.com` (existing Vercel project, root → `apps/storefront`) |
| Admin URL (v1) | `voltgear-admin.vercel.app` (new Vercel project, root → `apps/admin`) |
| Shop `/admin/*` | **Redirect** to admin public URL (308/307) |
| Shop `/api/admin/*` | **Not deployed** (404; no redirect for POST safety) |
| Database / images | Same Supabase + Cloudinary env on both projects |
| Admin auth | httpOnly cookie + `ADMIN_TOKEN`; scoped to **admin host** only |
| Storefront middleware | Checkout geo-block + www redirect; **no** admin cookie gate |
| Cron | `vercel.json` cron → `/api/flows` on **storefront only** |
| Previews | **Every branch** on **both** projects |
| Build optimization | Vercel **Ignored Build Step** per app when the other app alone changed |

## Approaches considered

1. **npm workspaces monorepo (chosen).** Clean route separation; smallest shop serverless graph; shared `lib` in `packages/shared`.
2. Thin wrapper / symlink apps. Faster start but easy to accidentally ship admin on shop again.
3. Build-time delete `app/admin` on shop. Fragile; rejected.

## Architecture

```
GitHub: ecommercestore872-crypto/voltgear (main + branches)
        |
        +-- Vercel: voltgear-store (Root: apps/storefront)
        |     Domain: buyntryy.com
        |     app/: shop routes, public API, /api/revalidate, /api/flows
        |     redirects: /admin/* -> ADMIN_PUBLIC_URL
        |
        +-- Vercel: voltgear-admin (Root: apps/admin)
              Domain: voltgear-admin.vercel.app
              app/admin/*, app/api/admin/*
              calls shop: POST {STOREFRONT_URL}/api/revalidate (Bearer ADMIN_TOKEN)

packages/shared: lib/db, types, email helpers, deploy-rules, admin auth helpers, etc.
```

### Environment variables

| Variable | Storefront | Admin | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://buyntryy.com` | `https://buyntryy.com` | Shop links in emails, SEO, IndexNow |
| `ADMIN_PUBLIC_URL` | `https://voltgear-admin.vercel.app` | same | Redirect target; future custom admin domain |
| `STOREFRONT_URL` | optional (default from site URL) | `https://buyntryy.com` | Server-side revalidate calls |
| `ADMIN_TOKEN` | yes | yes | Revalidate + admin API |
| `CRON_SECRET` | yes | no (unless admin crons added later) | Flows cron on shop |
| Supabase / Cloudinary / Resend | yes | yes | Unchanged |

## Cross-app cache revalidation

Today, admin mutations call `revalidatePath("/")` inside one Next app. After split, that only clears the **admin** deployment cache.

**Required behavior:**

- Keep **`POST /api/revalidate`** on the **storefront** (existing contract: Bearer `ADMIN_TOKEN`).
- Introduce a shared helper (e.g. `revalidateStorefront(paths)`) used from admin mutations: HTTP POST to `{STOREFRONT_URL}/api/revalidate` with path list.
- Admin-only paths may still use local `revalidatePath` on the admin app where needed.
- Audit `lib/db/*` and admin API routes for `revalidatePath` targeting shop paths (`/`, `/products`, `/product/...`, `/collections/...`, `/blog/...`).

## Error handling

| Case | Behavior |
|---|---|
| Admin host down | Shop still works; redirects to admin may fail (user sees admin error) |
| Revalidate POST fails | Admin mutation succeeds in DB; log error; optional retry or admin toast |
| Missing `ADMIN_PUBLIC_URL` on shop | Build fails or redirects fall back to env error (fail loud in CI) |
| Bookmark to `buyntryy.com/api/admin/...` | 404 on shop |
| Cron on wrong project | Must not duplicate `/api/flows` on admin (double emails) |

## Impact analysis

### Vercel / runtime

| Surface | Today | After T-40 |
|---|---|---|
| Shop Fluid CPU per visitor | Includes admin routes in same bundle/graph | Smaller shop deployment |
| Admin sessions | Same project as shop | Isolated project |
| Account Fluid quota | Shared across team projects | Still shared; savings from lean shop + selective builds |
| Preview deploys | One project x branches | Two projects x branches (user choice: keep both) |

### Codebase

| Area | Change |
|---|---|
| `app/admin/**` | Move to `apps/admin/app/admin` |
| `app/api/admin/**` | Move to `apps/admin/app/api/admin` |
| Shop `app/**` (non-admin) | Move to `apps/storefront/app` |
| `lib/**` | Move to `packages/shared` (adjust imports to package name) |
| `middleware.ts` | Split: shop vs admin |
| `vercel.json` | Shop: crons; Admin: no shop cron |
| `next.config` | Shop: redirects; each app own config |
| Components | Mostly shared; ensure admin-only heavy imports stay in admin app |

### Auth and security

| Surface | Today | After |
|---|---|---|
| Admin cookie | Set on shop domain | Set on admin Vercel host only |
| `isAdminRequest` on shop | Used for revalidate | Revalidate route only; no `/admin` on shop |
| CORS | Same origin | Admin UI to admin API same origin; revalidate server-to-server |

### Storefront behavior (must not regress)

- Checkout, cart, wishlist, PDP, homepage ISR, public `/api/store/products`, analytics event, demo mode, geo checkout block.
- Clarity / pixels: shop-only paths unchanged.

### Admin behavior (must not regress)

- Login, CMS, orders, analytics, uploads, messaging, autopilot admin surfaces.
- Cmd+K search, demo purge, settings.

### Spawned follow-ups (not blocking v1)

| Item | Notes |
|---|---|
| Custom admin domain | `admin.buyntryy.com` — DNS + env when stable |
| Deploy module doc | Update `docs/modules/deploy/` at closeout |

## Phase breakdown (implementation — detail in plan)

Phases and acceptance criteria will be expanded in `writing-plans` / `tasks/plan.md`. High level:

### P0 — Monorepo skeleton

- [ ] npm workspaces root; `packages/shared` builds/types resolve.
- [ ] `apps/storefront` and `apps/admin` each `next build` locally.

### P1 — Route split + redirects

- [ ] No admin routes in storefront build output.
- [ ] Redirects `/admin/*` to `ADMIN_PUBLIC_URL`.
- [ ] Admin app serves `/admin` and `/api/admin/*`.

### P2 — Vercel wiring

- [ ] Two projects linked to repo with correct root directories.
- [ ] Env vars copied to both; `ADMIN_PUBLIC_URL` set.
- [ ] Ignored Build Step scripts committed.

### P3 — Storefront revalidate wiring

- [ ] Admin publish paths trigger shop `POST /api/revalidate`.
- [ ] Manual test: product/home change visible on buyntryy.com without full redeploy.

### P4 — Verification and docs

- [ ] `npm test` and both builds green.
- [ ] Smoke: shop has no admin API; admin login; redirect from shop `/admin`.
- [ ] Update deploy module doc; release note under `docs/modules/deploy/`.

## Testing strategy

- Existing `tsx --test` suite: run from repo root after shared package paths updated.
- Manual: redirect URL, admin login cookie on admin host, revalidate after product edit.
- No new E2E required for v1 unless plan adds Playwright smoke.

## Rollback

- Revert to single-app layout on one Vercel project (keep monorepo on branch) or point both domains to combined app if rollback branch maintained.
- Do not rotate Supabase keys for rollback.

## References

- Prior deploy spec: `docs/superpowers/specs/2026-08-26-t08-vercel-deploy-design.md`
- Admin CMS: `docs/superpowers/specs/2026-08-26-t02-admin-cms-design.md`