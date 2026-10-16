# Engineering Audit Findings

## Finding register

### CI-001 — CI runtime cannot execute the configured unit-test command

- Severity: P1 — High
- Status: Resolved and verified locally and on GitHub Actions
- Evidence: GitHub Actions run `38888705567`, job `116932686103`, installed dependencies successfully and failed at `Unit tests`; later lint and build steps were skipped. Running Node `20.20.2 --test --test-isolation=none` locally exits with `bad option: --test-isolation=none`.
- Root cause: `.github/workflows/storefront-ci.yml` selected Node 20 while `scripts/run-unit-tests.mjs` uses the stable `--test-isolation` flag introduced in newer Node releases. Current Supabase and Selenium packages also declare Node 22+ requirements.
- Impact: CI could not validate any commit beyond installation, leaving lint, type safety, and builds unverified.
- Resolution: Standardize local, CI, and Vercel on Node 24; select Node from `.nvmrc`; declare the supported engine in `package.json`.
- Rollback: Revert the Phase 1 commit. Do not revert to Node 20 without also replacing the test isolation strategy and validating dependency engines.

### CI-002 — CI did not expose explicit per-application TypeScript gates

- Severity: P2 — Medium
- Status: Resolved and verified locally and on GitHub Actions
- Evidence: The workflow previously ran tests, lint, and builds only. Next builds type-checked, but a dedicated failure boundary did not exist for either application.
- Root cause: Type checking was implicit inside `next build`.
- Impact: Type failures were reported late and were harder to attribute.
- Resolution: Add `typecheck:storefront`, `typecheck:admin`, and `typecheck:all` scripts and explicit workflow steps.

### CI-003 — Workflow actions and token permissions were not aligned with the current runner baseline

- Severity: P2 — Medium
- Status: Resolved and verified on GitHub Actions
- Evidence: The workflow used `actions/checkout@v4` and `actions/setup-node@v4`, and had no explicit permissions block. GitHub retired Node 20 from hosted runners in September 2026 and recommends action releases using the Node 24 action runtime.
- Resolution: Use the current first-party v7 actions, set `permissions: contents: read`, and disable persisted checkout credentials because the job never pushes.

### DEP-001 — Direct Next.js runtime dependency has unresolved advisories

- Severity: P1 — High
- Status: Confirmed vulnerable version; exploitability varies by advisory and was not tested against production
- Evidence: `npm audit --omit=dev --json` reports `next@14.2.35` and its nested `postcss@8.4.31` as two production vulnerability nodes. The aggregate Next finding is critical. npm offers only the semver-major `next@16.4.2` remediation.
- Exposure: The Windows-hosted-server RCE does not match Linux Vercel production, but it matters if a local Windows development server is exposed to untrusted traffic. The AVIF Image Optimization advisory is potentially relevant to the admin app because its image configuration permits AVIF. Server Component, rewrite, cache, and denial-of-service advisories require separate reachability tests.
- Decision: Do not mix a major framework migration into the CI repair. Evaluate the existing Next 16 branch independently, then run route, image, build, and browser regression suites before proposing it for merge.
- Compensating controls: Keep local development servers private; retain managed Vercel deployment protections; do not broaden remote image hosts; monitor unexpected image optimizer and Server Component error rates.

### DEP-002 — Development toolchains contain unresolved transitive advisories

- Severity: P2 — Medium
- Status: Confirmed; compatible in-range remediation unavailable
- Evidence: Full `npm audit --json` reports 12 vulnerability nodes: 1 critical, 9 high, and 2 moderate. Development-only chains include `eslint-config-next -> @next/eslint-plugin-next -> glob` and `tailwindcss -> chokidar/fast-glob/micromatch/postcss-nested/postcss-selector-parser`.
- Reachability: These packages execute during development or builds. The reported glob command injection requires invoking its CLI command option with attacker-controlled matches; this repository's CI does not do that. Pattern-parser denial of service requires hostile patterns entering tooling, not ordinary shopper input.
- Decision: Do not force Next 16, Tailwind 4, or ESLint framework upgrades in Phase 1. `npm audit fix --dry-run --json` proposed zero in-range changes.

### OPS-001 — Standalone GitHub CLI authentication is invalid

- Severity: P3 — Low
- Status: Confirmed; compensating integration available
- Evidence: `gh auth status` reports an invalid keyring token for `aly-abbas11`.
- Impact: Local `gh` commands cannot create or inspect PRs. Git remote authentication and the connected GitHub integration remain available.
- Recommendation: Refresh the CLI token later with least privilege if local `gh` use is desired. Do not expose or replace credentials in this branch.

### ARCH-001 — A public settings read performed an administrative write

- Severity: P2 — Medium
- Status: Confirmed; remediated in draft PR #3, commit `e42c87f`; not duplicated in this branch
- Evidence: `fetchSiteSettings()` in `packages/shared/lib/db/store-chrome-store.ts` awaited `ensureShopperBrandSettings()` from the admin store before selecting the settings row.
- Root cause: One-time/default normalization was coupled to a frequently used public read path.
- Impact: A cold settings read could issue extra database work and mutate CMS state. That makes a read less predictable and increases function/database cost.
- Resolution: PR #3 removes the writer import and normalization call. Keep defaulting in migrations, explicit admin writes, or a dedicated maintenance operation.

### ARCH-002 — Critical user flows are concentrated in oversized Client Components

- Severity: P2 — Medium
- Status: Confirmed maintainability risk; no rewrite attempted
- Evidence: `checkout-page-client.tsx` is about 1,147 physical lines, `product-form.tsx` about 703, and `settings-form.tsx` about 704. The graph also identifies checkout and product editing among the highest-importing files.
- Impact: UI state, validation, requests, and presentation evolve together, increasing review surface and regression risk. File size alone does not prove a runtime defect.
- Recommendation: Add characterization tests, then extract pure rules/reducers and request adapters one responsibility at a time. Avoid a broad component rewrite.

### ARCH-003 — Settings mapping used unnecessary `any` assertions

- Severity: P3 — Low
- Status: Resolved; type and full-suite verification tracked in the Phase 2 implementation log
- Evidence: Six settings fields accessed values through `(d as any)` and `(row as any)` even though both values already support string-keyed unknown properties.
- Impact: The assertions bypassed useful compiler checks and made the data contract look less reliable than it is.
- Resolution: Use direct typed property access without changing mapping behavior.

### ARCH-004 — Client/server module separation lacked an automated regression gate

- Severity: P2 — Medium
- Status: Resolved and verified locally; hosted CI verification pending
- Evidence: Static review found 168 Client Components and no runtime import of `@/lib/supabase/server` or server database stores, but no test protected that boundary.
- Impact: A future import could move server-only dependencies or credential-bearing code toward the browser bundle.
- Resolution: Add a TypeScript-AST test that inspects source-only Client Components, ignores erased type imports, and rejects runtime imports of server Supabase and database-store modules.

### ARCH-005 — One commerce-domain helper imports from a component directory

- Severity: P3 — Low
- Status: Confirmed; deferred intentionally
- Evidence: `packages/shared/lib/gadget-pdp-lcp.ts` imports a pure image helper from `packages/shared/components/gadget/gadget-image.ts`. It is the graph's only domain-to-UI import.
- Impact: Folder placement obscures the intended dependency direction; no runtime failure or cycle exists.
- Recommendation: Move the pure helper to a neutral library path only when a nearby feature change already touches both consumers.

### ARCH-006 — Architecture graph integrity and import topology were not reproducibly recorded

- Severity: P3 — Low
- Status: Resolved and verified
- Evidence: The Phase 2 graph covers 1,102 files, 2,762 nodes, and 5,135 edges. Validation reports zero cycles, duplicate IDs, dangling edges, incomplete nodes, missing files, out-of-scan files, and unassigned file nodes.
- Resolution: Record the graph commit, SHA-256, fallback method, layer counts, dependency concentrations, and limitations in `ARCHITECTURE_REVIEW.md`.

## Primary references

- Node.js 24 CLI documentation for `--test-isolation`: https://nodejs.org/download/release/v24.0.2/docs/api/cli.html
- Next.js 14 system requirements: https://nextjs.org/docs/14/getting-started/installation
- GitHub Actions Node 20 retirement notice: https://github.blog/changelog/2026-09-23-node-20-is-no-longer-available-in-github-actions/
- `actions/setup-node` Node 24 usage: https://github.com/actions/setup-node
- npm `engines` documentation: https://docs.npmjs.com/files/package.json/#engines
