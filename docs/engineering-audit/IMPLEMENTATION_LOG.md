# Implementation Log

## 2026-10-16 — Phase 1 CI and runtime baseline

### Problem

The main-branch CI job selected Node 20 but the repository test runner used `--test-isolation=none`, which Node 20 rejects. As a result, the workflow never reached lint or build verification.

### Alternatives considered

1. Keep Node 20 and replace the stable flag with older experimental behavior. Rejected because current direct dependencies require Node 22+, GitHub has retired Node 20 on hosted runners, and Vercel already uses Node 24.
2. Standardize on Node 24. Selected because it matches production, local development, dependency engines, and the stable Node test-runner interface.

### Changes

- Added `.nvmrc` with Node major 24.
- Declared `node >=24 <25` in `package.json` and lockfile workspace metadata.
- Updated CI to Node-24-compatible first-party Actions and read-only repository permissions.
- Added explicit storefront and admin TypeScript scripts and workflow steps.
- Updated the root `ci` script to run tests, both linters, both type checks, and both builds.
- Added Phase 1 audit, security, readiness, and rollback documentation.

### Verification evidence

| Command or check | Result |
| --- | --- |
| `git fetch --prune origin` | Pass; base matched `origin/main` at `a4eccf2` |
| `npx --yes node@20 --test --test-isolation=none` | Expected reproduction: exit 1, bad option |
| `npm ci` on Node 24 | Pass; 515 packages installed from lockfile |
| `npm run typecheck:all` | Pass for storefront and admin |
| `npm run test` in restricted sandbox | Blocked by Windows `spawn EPERM`; not counted as a code failure |
| `npm run test` outside restricted sandbox | Pass; 705 tests, 339 suites, 0 failures |
| `npm audit --json` | Completed with nonzero status because 12 findings remain |
| `npm audit --omit=dev --json` | Completed with nonzero status; 2 production vulnerability nodes remain |
| `npm audit fix --dry-run --json` | Zero compatible changes available |
| `npm run lint:all` | Pass; storefront and admin, no warnings or errors |
| `npm run build` | Pass; storefront 54 pages, admin 37 pages |
| JSON parse and `git diff --check` | Pass |
| `npm ci --dry-run --ignore-scripts --offline` | Pass; package and lockfile are consistent |
| Staged diff secret-pattern scan | Pass; no credential or private-key pattern found |
| GitHub Actions `Monorepo CI` run 38896519413, job `verify` | Pass on implementation commit `cb0d8b6`; install, unit tests, both linters, both type checks, and both builds succeeded |

The independent GitHub-hosted run completed successfully in 2 minutes 33 seconds. It confirms that the Node 24 workflow repair works outside the local Windows environment.

### Side effects

- No application business rules changed.
- No database schema or data changed.
- No deployment configuration or production environment changed.
- PR #2's database workflow additions are not copied; it will need a future conflict resolution that retains this Node 24 baseline.

## 2026-10-16 — Phase 2 architecture and boundary review

### Problem

The repository had a large pre-existing code-knowledge graph, but its current integrity, architectural direction, and client/server boundary had not been cross-verified against the Phase 1 commit. Several large Client Components and one public-read/admin-write coupling needed evidence-based triage before further optimization.

### Method

- Scanned 1,102 current in-scope files with the Understand workflow.
- Attempted a full graph rebuild. When the account's subagent allowance was exhausted, used the skill's deterministic fallback: retain the verified unaffected graph, prune changed/deleted paths, recompute imports, re-analyze all 19 changed files, merge, and validate.
- Generated a focused architecture evidence artifact and separately inspected request boundaries, caching, data stores, integrations, large Client Components, and unsafe assertions.
- Classified findings as confirmed static facts, strongly supported risks, or unmeasured runtime concerns.

### Changes

- Added `ARCHITECTURE_REVIEW.md` with a plain-language system map, logical layers, request/data flows, dependency concentrations, failure boundaries, confidence, and a safe improvement order.
- Expanded `SYSTEM_INVENTORY.md` with verified route, migration, graph, integration, and boundary facts.
- Added an AST regression test that prevents Client Components from runtime-importing server Supabase and database-store modules while allowing type-only imports.
- Removed six unnecessary `any` assertions from settings mapping without changing behavior.
- Recorded the public-read mutation as already remediated by draft PR #3 rather than creating a conflicting duplicate patch.

### Architecture evidence

| Check | Result |
| --- | --- |
| Graph scope | 1,102 files; 2,762 nodes; 5,135 edges |
| Import topology | 2,056 import edges; no import or self-import cycles |
| Graph integrity | Zero duplicate IDs, dangling/incomplete nodes, missing/out-of-scan files, or unassigned file nodes |
| Client/server targeted regression | Pass; 1 test in about 3 seconds after excluding generated output |
| Public-read mutation | Confirmed in base; exact fix verified in draft PR #3 commit `e42c87f` |
| Domain-to-UI imports | One placement smell; no cycle or runtime defect |
| Full unit suite | Pass; 706 tests, 340 suites, 0 failures |
| Storefront and admin lint | Pass; no warnings or errors |
| Storefront and admin TypeScript | Pass |
| Storefront and admin production builds | Pass; 54 and 37 generated pages |
| GitHub Actions `Monorepo CI` run 38942612045, job `verify` | Pass on implementation commit `570447a`; install, tests, lint, type checks, and both builds succeeded |

### Side effects and limits

- No production service, database, deployment, secret, DNS, billing, or customer data was accessed or changed.
- No component rewrite or folder move was attempted.
- The graph is static evidence; it does not measure production latency, cache hit ratio, SQL query count, or external-provider reliability.
- Phase 2 remains a stacked draft on the verified Phase 1 branch. GitHub-hosted CI passed on the implementation commit; the final documentation-only evidence commit is verified separately before handoff.
