# Release Readiness

## Phase 1 acceptance gates

| Gate | Status |
| --- | --- |
| Isolated branch/worktree | Pass |
| Base equals current `origin/main` | Pass at Phase 1 start |
| Node 20 failure reproduced | Pass |
| Node 24 clean install | Pass |
| Unit tests | Pass locally: 705/705 |
| Storefront lint | Pass; no warnings or errors |
| Admin lint | Pass; no warnings or errors |
| Storefront TypeScript | Pass |
| Admin TypeScript | Pass |
| Storefront production build | Pass; 54 pages generated |
| Admin production build | Pass; 37 pages generated |
| Lockfile consistency | Pass; clean install and final offline dry-run both succeeded |
| Dependency report | Pass; unresolved findings documented |
| Full diff and secret review | Pass; 13 scoped files and no secret pattern detected |
| Draft pull request CI | Pass; `Monorepo CI` run 38896519413, `verify` job 116958181777 |

## Historical Phase 1 blockers and current risks

- The Phase 1 baseline's Next.js 14.2.35 production advisories are resolved in the current stacked source by Next.js 15.5.28 and the nested PostCSS override; fresh production audit output contains zero findings.
- Nine development-tool vulnerability nodes remain (seven high, two moderate). They require separate Tailwind/ESLint toolchain work and are not reachable from shopper request handlers.
- PR #2 will require manual workflow reconciliation to retain Node 24 and its database test job.
- Repository rulesets are not currently visible on the public endpoint; the confirmed required check name is `verify` from `Monorepo CI`.

## Recommended `main` protection settings

The public repository ruleset list is currently empty. The branch-protection endpoint requires authenticated administration access, so no protection change was attempted.

After the draft PR check name is confirmed, configure `main` with:

- Require a pull request before merging.
- Require at least one approving review and dismiss stale approvals.
- Require conversation resolution.
- Require the `verify` status check from `Monorepo CI` to pass and require branches to be up to date.
- Block force pushes and branch deletion.
- Do not allow bypass for routine changes.

When PR #2 is reconciled, also require its isolated Supabase database regression job before merging database-dependent code.

## Production readiness statement

Phase 1 acceptance gates passed locally and on the GitHub-hosted runner. The current stacked source also clears the production dependency audit and passes its later refactoring gates, but it is still not authorized for production or merge. Review, merge ordering, environment checks, and an explicit production promotion remain release requirements.

## Phase 2 architecture gates

| Gate | Status |
| --- | --- |
| Isolated Phase 2 branch based on verified Phase 1 commit | Pass |
| Current source/graph coverage reconciled | Pass; 1,102 files |
| Graph identity and integrity recorded | Pass; zero integrity failures or cycles |
| Client/server boundary regression | Pass targeted and in full suite |
| Settings mapper type-safety cleanup | Pass; both TypeScript projects and production builds |
| Existing public-read mutation fix cross-verified | Pass; draft PR #3 commit `e42c87f` |
| Full tests, lint, type checks, and production builds | Pass; 706 tests, clean lint/types, 54/37 pages |
| Hosted draft-PR CI | Pass; run 38942612045, job 117113753313 |

### Phase 2 dependency and release order

Phase 2 is intentionally stacked on the Phase 1 CI branch so it does not duplicate or obscure that review. Before any release candidate:

1. Land or otherwise reconcile the Phase 1 Node 24 CI baseline.
2. Land or reapply PR #3's read-only storefront settings fix.
3. Rebase Phase 2 after those decisions and rerun all gates.
4. Preserve the verified Next.js 15.5.28 remediation and keep any later Next 16/Tailwind 4 migration separate and fully regression-tested.

Large Client Components remain a maintainability risk, not a release blocker by themselves. Refactor them through small reviewed changes with characterization tests rather than delaying all delivery for a broad rewrite.

## Phase 3 Vercel reliability gates

| Gate | Status |
| --- | --- |
| Production inspection remained read-only | Pass |
| Route collision reproduced from runtime/build evidence | Pass |
| Explicit route ownership regression | Pass; 3/3 |
| Application tests included in root unit runner | Pass |
| Full unit suite | Pass; 712/712 |
| Both linters and TypeScript projects | Pass |
| Storefront and admin production builds | Pass; 54/37 pages |
| Storefront-only Vercel build scope | Pass; storefront ready, admin canceled |
| Explicit page module packaging in preview | Pass; six of six explicit chunks, zero `[slug]` chunks |
| Preview runtime error review | Pass; no missing-module/error/fatal logs in deployment-scoped 24-hour query |
| Hosted draft-PR CI | Pending |

The Phase 3 source is not authorized for production. Preview acceptance gates
pass; it becomes review-ready after hosted CI passes on the exact reviewed
commit.

## Current stacked-branch gates (Phases 4–12)

| Gate | Status |
| --- | --- |
| Production-only npm audit | Pass; 0 findings across 113 production dependencies on 2026-10-19 |
| Full npm audit | Documented risk; 9 development-only nodes (7 high, 2 moderate) |
| Unit tests | Pass; 745/745 after the architecture slices |
| Storefront and admin TypeScript | Pass |
| Storefront and admin lint | Pass; no warnings or errors |
| Latest storefront preview | Ready; deployment `dpl_CmEaAKXzX6gRoRuXhLrHnzMVBqqg` |
| Latest admin preview | Ready; deployment `dpl_7qkQdhGKNjv8V7wQQw91cYVqo2qy` |
| Production mutation | None; previews and repository draft PRs only |

The stack remains intentionally unmerged and undeployed. Merge the draft pull requests in dependency order, rerun the exact final CI revision, validate environment variables without printing secrets, and perform a separately approved production promotion with rollback monitoring.
