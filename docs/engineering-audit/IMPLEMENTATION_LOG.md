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
