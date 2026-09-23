# T-40 Storefront / Admin Vercel Split — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split VoltGear into two Next.js apps (`apps/storefront`, `apps/admin`) sharing `packages/shared`, deployed as two Vercel projects so buyntryy.com is shopper-only and admin runs on voltgear-admin.vercel.app.

**Architecture:** npm workspaces; shared lib/components in `packages/shared`; storefront redirects `/admin/*`; admin POSTs to shop `/api/revalidate`; cron `/api/flows` on storefront only.

**Tech Stack:** Next.js 14, npm workspaces, Vercel, Supabase, tsx --test.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-23-t40-storefront-admin-split-design.md`
- Shop: `https://buyntryy.com`; admin v1: `https://voltgear-admin.vercel.app`
- No `/admin` or `/api/admin` in storefront build; previews on every branch for both projects
- Same Supabase/Cloudinary/Resend; no key rotation in v1

---

### Task 1: Workspace bootstrap
- [ ] Root workspaces `["apps/*", "packages/*"]`; packages `@voltgear/storefront`, `@voltgear/admin`, `@voltgear/shared`
- [ ] tsconfig `@/*` -> `../../packages/shared/*` then `./*`
- [ ] `npm install`; commit `chore: add npm workspaces for T-40`

### Task 2: Move shared code
- [ ] `git mv lib packages/shared/lib`; `git mv components packages/shared/components`
- [ ] Tailwind globs per app; migrate test paths in root package.json
- [ ] `npm test`; commit `refactor: move lib and components to packages/shared`

### Task 3: Storefront app
- [ ] Move shop `app/**` excluding admin routes to `apps/storefront/app/`
- [ ] Shop middleware only; redirects via `ADMIN_PUBLIC_URL`; cron in storefront vercel.json
- [ ] `npm run build -w @voltgear/storefront`; verify no admin routes in output
- [ ] Commit `feat(storefront): extract shop app without admin routes`

### Task 4: Admin app
- [ ] Move `app/admin` and `app/api/admin` to `apps/admin/app/`
- [ ] Admin middleware + layout; no shop cron
- [ ] Build admin; remove legacy root app/middleware/next.config/vercel.json
- [ ] Commit `feat(admin): extract admin app`

### Task 5: Cross-app revalidation
- [ ] Add `revalidateStorefront(paths)` + test (mock fetch to STOREFRONT_URL/api/revalidate)
- [ ] Replace shop `revalidatePath` in admin-store, collection-store, deal-store, promo-store, homepage-sections-store
- [ ] `npm test`; commit `feat: revalidate storefront from admin via HTTP`

### Task 6: Ignored Build Step scripts
- [ ] `scripts/vercel-should-build-storefront.sh` and `vercel-should-build-admin.sh`
- [ ] Commit `chore: add Vercel ignored build step scripts`

### Task 7: Local dev
- [ ] `dev:storefront` :3000, `dev:admin` :3001; commit chore

### Task 8: Vercel wiring (manual)
- [ ] New project voltgear-admin root `apps/admin`; existing voltgear root `apps/storefront`
- [ ] Env: NEXT_PUBLIC_SITE_URL, ADMIN_PUBLIC_URL, STOREFRONT_URL on admin
- [ ] Ignored build scripts; deploy; update deploy docs + RELEASE_NOTES

### Task 9: Smoke acceptance
- [ ] Shop /admin redirects; shop /api/admin 404; admin login + publish refreshes shop; cron on shop only; tests + builds green

## Checkpoints
- After Tasks 1-4: dual local build, no admin on shop
- After 5-7: tests + dev scripts
- After 8-9: production smoke, T-40 closeout-ready

`tasks/plan.md` remains SEO-only — do not overwrite.