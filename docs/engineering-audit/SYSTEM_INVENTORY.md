# Buy N Try System Inventory

## Scope and status

This inventory was started during Phase 1 on 2026-10-16. It records only verified facts needed for the CI and dependency-security baseline. Broader architecture mapping remains a Phase 2 deliverable.

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

## Existing draft pull requests

- PR #2, `ai/full-store-overhaul`: security and storefront hardening. It adds a separate Supabase database CI job and will require workflow conflict reconciliation after this Phase 1 PR.
- PR #3, `audit/storefront-settings-read-only-20261016`: one-file storefront settings read-path fix. It does not overlap the Phase 1 source changes.

## Failure boundaries in Phase 1

- CI runtime selection can prevent every verification step after dependency installation.
- The direct Next.js dependency is the only production dependency chain currently reported by `npm audit`; upgrading it is intentionally separated from this CI repair.
- Local Windows sandboxing can block `tsx`/esbuild worker creation with `spawn EPERM`; CI runs on Linux and the local suite must be rerun outside that restricted sandbox.
