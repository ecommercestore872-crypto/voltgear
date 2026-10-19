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

- Current stacked source framework: Next.js `15.5.28`, React 18.
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
- The standalone `gh` CLI is authenticated as `aly-abbas11`; Git remote operations and draft-PR creation are working. No credential value is stored in this inventory.

## Vercel runtime facts added in Phase 3

- The Phase 3 production snapshot executed in Sydney (`syd1`) on Node 24 and built from the monorepo with Next.js 14.2.35. Current stacked previews through Phase 13 build with Next.js 15.5.28; production is not assumed upgraded until an approved promotion occurs.
- The inspected production build restored a previous cache, installed 518 packages, generated 148 pages with production CMS data, and wrote an approximately 242 MB build cache.
- The same source produces 54 storefront pages without production CMS rows in the local environment; route-count differences must therefore be interpreted with data-dependent static generation in mind.
- The admin project recorded no comparable missing-module runtime cluster during the inspected seven-day window.
- Storefront and admin both use the repository's conservative ignore-build command. Shared application/dependency changes rebuild both; application-local changes build one; documentation and database-only changes skip both.
- Vercel preview creation remains an external side effect of pushing a branch through the connected Git integration. Phase 3 uses preview only and never promotes it to production.

## Existing draft pull requests

- PR #2, `ai/full-store-overhaul`: security and storefront hardening. It adds a separate Supabase database CI job and will require workflow conflict reconciliation after this Phase 1 PR.
- PR #3, `audit/storefront-settings-read-only-20261016`: original one-file storefront settings read-path fix. Its change is now integrated with regression coverage in the current stack, so the standalone draft is superseded.
- PR #8, `codex/phase-4-dependency-security`: Next.js 15 dependency remediation.
- PR #9, `codex/phase-5-architecture-boundaries`: shared domain/UI dependency direction.
- PR #10, `codex/phase-6-checkout-boundaries`: checkout client requests and idempotency storage.
- PR #11, `codex/phase-7-product-form-boundaries`: product form document rules.
- PR #12, `codex/phase-8-settings-form-boundaries`: settings form mapping rules.
- PR #13, `codex/phase-9-product-request-boundaries`: product admin request rules.
- PR #14, `codex/phase-10-settings-request-boundaries`: settings admin request rules.
- PR #15, `codex/phase-11-checkout-presentation-boundary`: stateless desktop checkout presentation.
- PR #16, `codex/phase-12-audit-documentation-alignment`: evidence and audit-document alignment.
- PR #17, `codex/phase-13-public-settings-read-boundary`: side-effect-free public settings reads with regression coverage.

PRs #8–#17 are intentionally stacked and must be reviewed and merged in order; none is a production deployment.

## Failure boundaries in Phase 1

- CI runtime selection can prevent every verification step after dependency installation.
- The 2026-10-19 production-only npm audit is clean after the Next.js 15.5.28 remediation; nine development-tool vulnerability nodes remain documented separately.
- Local Windows sandboxing can block `tsx`/esbuild worker creation with `spawn EPERM`; CI runs on Linux and the local suite must be rerun outside that restricted sandbox.

## Architecture failure boundaries added in Phase 2

- Client Components must use HTTP/client adapters and type-only contracts rather than importing server Supabase or database-store modules at runtime.
- Public storefront reads must not normalize or mutate administrative settings.
- Admin writes must invalidate the matching storefront cache tags after persistence succeeds.
- PostEx, Resend, Cloudinary, and Supabase failures must terminate at server adapters with safe application errors; credentials must never cross into client bundles.
- The high-import shared type, utility, authorization, observability, cache, and data-facade modules have a larger regression radius and require both application builds after changes.
