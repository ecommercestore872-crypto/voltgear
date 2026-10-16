# Buy N Try System Inventory

## Scope and status

This inventory was started during Phase 1 and expanded during the Phase 2 architecture review on 2026-10-16. It records verified repository structure and separates static evidence from runtime assumptions.

## Repository

- Repository: `ecommercestore872-crypto/voltgear`
- Default branch: `main`
- Phase 1 base commit: `a4eccf204486eecdd542bf24d919d1188dd7522b`
- Package manager: npm with a v3 lockfile
- Monorepo workspaces: `apps/*` and `packages/*`

## Applications and shared code

| Area | Path | Responsibility |
| --- | --- | --- |
| Storefront | `apps/storefront` | Public Next.js App Router ecommerce site |
| Administration | `apps/admin` | Internal Next.js administration application |
| Shared package | `packages/shared` | Shared components, commerce rules, data access, tests, and utilities |
| Database | `supabase` | PostgreSQL migrations, functions, policies, and database tests |
| Automation | `.github/workflows/storefront-ci.yml` | Monorepo tests, lint, type checks, and production builds |

## Architecture at a glance

- The storefront and admin are separate Next.js App Router deployments.
- `packages/shared` is the shared UI, commerce-domain, integration, and persistence boundary used by both apps.
- Storefront request handling includes 19 explicit `route.ts` handlers; admin and operational handling includes 66 explicit `route.ts` handlers.
- Supabase persistence history contains 60 migration files.
- External server-side integrations include Supabase, PostEx, Resend, and Cloudinary.
- The repository uses Next.js cache primitives and explicit cache tags to separate shopper reads from administrative writes.
- A validated static graph contains 2,762 nodes, 5,135 edges, and 2,056 import relationships across 1,102 in-scope files, with no import cycles or graph-integrity failures.

The detailed layer map, request flows, dependency concentrations, confidence levels, and failure boundaries are in `ARCHITECTURE_REVIEW.md`.

## Verified runtime baseline

- Framework: Next.js `14.2.35`, React 18.
- Local runtime: Node.js `24.14.0`, npm `11.9.0`.
- Vercel storefront runtime: Node.js `24.x`.
- Vercel admin runtime: Node.js `24.x`.
- Phase 1 repository runtime declaration: Node.js `>=24 <25` with `.nvmrc` set to `24`.
- GitHub Actions runner: `ubuntu-latest` with Node selected from `.nvmrc`.

## Connected services verified read-only

- Vercel team: `hassaans-projects-e3451522`.
- Vercel projects: `voltgear` and `voltgear-admin`.
- Supabase production project reference is known, but Phase 1 did not query or mutate production data.
- Git fetch/push authentication works through the repository remote.
- The standalone `gh` CLI credential is invalid; the connected GitHub integration and public read-only API were used instead.

## Vercel runtime facts added in Phase 3

- Storefront production executes in Sydney (`syd1`) on Node 24 and currently builds from the monorepo with Next.js 14.2.35.
- The inspected production build restored a previous cache, installed 518 packages, generated 148 pages with production CMS data, and wrote an approximately 242 MB build cache.
- The same source produces 54 storefront pages without production CMS rows in the local environment; route-count differences must therefore be interpreted with data-dependent static generation in mind.
- The admin project recorded no comparable missing-module runtime cluster during the inspected seven-day window.
- Storefront and admin both use the repository's conservative ignore-build command. Shared application/dependency changes rebuild both; application-local changes build one; documentation and database-only changes skip both.
- Vercel preview creation remains an external side effect of pushing a branch through the connected Git integration. Phase 3 uses preview only and never promotes it to production.

## Existing draft pull requests

- PR #2, `ai/full-store-overhaul`: security and storefront hardening. It adds a separate Supabase database CI job and will require workflow conflict reconciliation after this Phase 1 PR.
- PR #3, `audit/storefront-settings-read-only-20261016`: one-file storefront settings read-path fix. It does not overlap the Phase 1 source changes.

## Failure boundaries in Phase 1

- CI runtime selection can prevent every verification step after dependency installation.
- The direct Next.js dependency is the only production dependency chain currently reported by `npm audit`; upgrading it is intentionally separated from this CI repair.
- Local Windows sandboxing can block `tsx`/esbuild worker creation with `spawn EPERM`; CI runs on Linux and the local suite must be rerun outside that restricted sandbox.

## Architecture failure boundaries added in Phase 2

- Client Components must use HTTP/client adapters and type-only contracts rather than importing server Supabase or database-store modules at runtime.
- Public storefront reads must not normalize or mutate administrative settings.
- Admin writes must invalidate the matching storefront cache tags after persistence succeeds.
- PostEx, Resend, Cloudinary, and Supabase failures must terminate at server adapters with safe application errors; credentials must never cross into client bundles.
- The high-import shared type, utility, authorization, observability, cache, and data-facade modules have a larger regression radius and require both application builds after changes.
