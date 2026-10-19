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

### DEP-001 — Direct Next.js runtime dependency had unresolved advisories

- Severity: P1 — High
- Status: Resolved in the current stacked branch and verified against npm's 2026-10-19 advisory data
- Evidence: The dependency remediation upgraded `next` and `eslint-config-next` to `15.5.28` and overrides Next's nested PostCSS to `8.5.30`. A fresh `npm audit --omit=dev --json` reports zero production vulnerability nodes across 113 production dependencies.
- Validation: The upgraded stack passes 745 unit tests, both application type checks and linters, and the latest storefront/admin Vercel preview builds.
- Release boundary: This is source-branch evidence, not a claim that production already runs the upgraded dependency. Production changes only after the reviewed stack is merged and explicitly promoted.

### DEP-002 — Development toolchains contain unresolved transitive advisories

- Severity: P2 — Medium
- Status: Confirmed; compatible in-range remediation unavailable
- Evidence: A fresh full `npm audit --json` reports nine development-only vulnerability nodes: seven high and two moderate. The remaining chains are `eslint-config-next -> @next/eslint-plugin-next -> fast-glob/micromatch` and `tailwindcss -> braces/chokidar/fast-glob/micromatch/postcss-nested/postcss-selector-parser`.
- Reachability: These packages execute during local development or builds and are not imported into shopper request handlers. Pattern-expansion and selector-parser denial-of-service findings require hostile build input, not ordinary shopper data.
- Decision: Do not accept npm's suggested `eslint-config-next@14.2.35` downgrade or force the separate Tailwind 4/Next 16 toolchain migration into this stack. Keep CI inputs trusted and upgrade those toolchains in isolated, regression-tested work.

### OPS-001 — Standalone GitHub CLI authentication was invalid

- Severity: P3 — Low
- Status: Resolved outside the code branch and verified on 2026-10-19
- Evidence: `gh auth status` reports the `aly-abbas11` account as active, and the phase 4–12 draft pull requests were created successfully through the CLI.
- Security note: No token value is recorded in the repository or audit artifacts.

### ARCH-001 — A public settings read performed an administrative write

- Severity: P2 — Medium
- Status: Confirmed; remediated in draft PR #3, commit `e42c87f`; not duplicated in this branch
- Evidence: `fetchSiteSettings()` in `packages/shared/lib/db/store-chrome-store.ts` awaited `ensureShopperBrandSettings()` from the admin store before selecting the settings row.
- Root cause: One-time/default normalization was coupled to a frequently used public read path.
- Impact: A cold settings read could issue extra database work and mutate CMS state. That makes a read less predictable and increases function/database cost.
- Resolution: PR #3 removes the writer import and normalization call. Keep defaulting in migrations, explicit admin writes, or a dedicated maintenance operation.

### ARCH-002 — Critical user flows are concentrated in oversized Client Components

- Severity: P2 — Medium
- Status: Mitigated through tested incremental boundaries; no broad rewrite required
- Evidence: Before these slices, `checkout-page-client.tsx` was 1,210 physical lines, `product-form.tsx` 725, and `settings-form.tsx` 732. Checkout request construction, transport, response contracts, browser idempotency storage, and the stateless desktop summary now live behind focused boundaries; the checkout component is 977 lines. Product draft/live normalization, new-product defaults, and create/update/delete request construction are isolated behind unit tests, reducing the product form to 651 lines. Settings row/form normalization, API-document construction, and action-request serialization are now isolated and tested, reducing the settings form to 565 lines.
- Impact: UI state, validation, requests, and presentation evolve together, increasing review surface and regression risk. File size alone does not prove a runtime defect.
- Recommendation: Keep using one-responsibility slices when future checkout work touches another section. Do not schedule a broad component rewrite solely to reduce file size.

### ARCH-003 — Settings mapping used unnecessary `any` assertions

- Severity: P3 — Low
- Status: Resolved; type and full-suite verification tracked in the Phase 2 implementation log
- Evidence: Six settings fields accessed values through `(d as any)` and `(row as any)` even though both values already support string-keyed unknown properties.
- Impact: The assertions bypassed useful compiler checks and made the data contract look less reliable than it is.
- Resolution: Use direct typed property access without changing mapping behavior.

### ARCH-004 — Client/server module separation lacked an automated regression gate

- Severity: P2 — Medium
- Status: Resolved and verified locally and on GitHub Actions
- Evidence: Static review found 168 Client Components and no runtime import of `@/lib/supabase/server` or server database stores, but no test protected that boundary.
- Impact: A future import could move server-only dependencies or credential-bearing code toward the browser bundle.
- Resolution: Add a TypeScript-AST test that inspects source-only Client Components, ignores erased type imports, and rejects runtime imports of server Supabase and database-store modules.

### ARCH-005 — One commerce-domain helper imports from a component directory

- Severity: P3 — Low
- Status: Resolved and verified
- Evidence: `packages/shared/lib/gadget-pdp-lcp.ts` imports a pure image helper from `packages/shared/components/gadget/gadget-image.ts`. It is the graph's only domain-to-UI import.
- Impact: Folder placement obscures the intended dependency direction; no runtime failure or cycle exists.
- Resolution: Move `gadgetImageSrc()` to `packages/shared/lib/gadget-image.ts`, update all direct consumers, and add a TypeScript-AST regression test that forbids runtime imports from `packages/shared/lib` into `@/components`.

### ARCH-006 — Architecture graph integrity and import topology were not reproducibly recorded

- Severity: P3 — Low
- Status: Resolved and verified
- Evidence: The Phase 2 graph covers 1,102 files, 2,762 nodes, and 5,135 edges. Validation reports zero cycles, duplicate IDs, dangling edges, incomplete nodes, missing files, out-of-scan files, and unassigned file nodes.
- Resolution: Record the graph commit, SHA-256, fallback method, layer counts, dependency concentrations, and limitations in `ARCHITECTURE_REVIEW.md`.

### REL-001 — Explicit storefront pages collide with CMS root static parameters

- Severity: P1 — High
- Status: Resolved and verified locally and in an isolated Vercel preview
- Evidence: Production runtime logs repeatedly report `Cannot find module '/var/task/apps/storefront/.next/server/app/<route>/page.js'` for `/about`, `/contact`, `/faq`, `/privacy-policy`, `/shipping-returns`, and `/terms-of-service`. The same URLs can return `200` from stale CDN content, masking failed background regeneration. A Vercel preview built with production CMS access referenced the `[slug]` client chunk for `/about` and `/privacy-policy` rather than each explicit route's chunk.
- Root cause: `app/[slug]/page.tsx` returned every non-blog CMS page from `generateStaticParams()`, including paths already owned by explicit App Router pages. Production CMS data therefore made one URL eligible under two route definitions during static generation and packaging.
- Impact: ISR attempts can invoke a function whose explicit page module was not packaged, generating errors and extra compute while shoppers receive aging cached content.
- Resolution: Exclude every explicit top-level storefront page from CMS catch-all static parameters. A structural test scans the App Router so a future explicit page cannot be added without updating the exclusion set.
- Preview proof: Deployment `dpl_G74hyUr5gngFNsvm2sRF37JHuDf2` built 148 production-data-dependent pages. All six affected URLs returned `200`, matched their explicit paths, referenced their explicit `app/<route>/page` chunks, and did not reference `app/[slug]/page`. A 24-hour deployment-scoped log query found no missing-module, error, or fatal records after the checks.
- Rollback: Revert the Phase 3 route-filter commit. This restores the prior behavior and the known runtime error; it does not require a data rollback.

### COST-001 — Build CPU is the dominant variable Vercel charge

- Severity: P2 — Medium
- Status: Confirmed; existing build-scope optimization retained and verified in Vercel
- Evidence: The read-only FOCUS export for the partial 2026-09-30 to 2026-10-16 UTC window reports $4.1024 billed usage, of which $2.87 (70.0%) is Build CPU Minutes. Runtime Function Invocations account for about $0.025 (0.6%).
- Interpretation: Low visitor volume does not imply low deployment cost. Preview and production builds dominate variable usage in this measured window. The recurring Pro plan price is separate from usage and cannot be eliminated through code optimization.
- Control: `vercel-ignore-build.mjs` already skips unrelated application, documentation, and database-only changes. Phase 3 deliberately changes only storefront source plus a CI-only test runner, so the admin preview should be skipped.
- Preview proof: The source commit created a ready storefront preview while the corresponding `voltgear-admin` deployment was canceled by the ignore-build command.
- Recommendation: Keep small app-specific changes out of `packages/shared` when they are not truly shared; review preview deployment frequency; retain one tested production promotion rather than repeated manual deploys. Do not change billing or plan settings without owner approval.

### TEST-001 — Root unit-test discovery omitted application-level tests

- Severity: P2 — Medium
- Status: Resolved and locally verified
- Evidence: `scripts/run-unit-tests.mjs` recursively discovered only `packages/shared/lib`, while an existing TikTok catalog route test lived under `apps/storefront/app` and did not run in `npm test`.
- Impact: Route-level regressions could pass the advertised full unit suite.
- Resolution: Discover tests in shared library code and both applications. The full suite now includes the existing route test and the new route-ownership regression.

## Primary references

- Node.js 24 CLI documentation for `--test-isolation`: https://nodejs.org/download/release/v24.0.2/docs/api/cli.html
- Next.js 15 upgrade guide: https://nextjs.org/docs/app/guides/upgrading/version-15
- GitHub Actions Node 20 retirement notice: https://github.blog/changelog/2026-09-23-node-20-is-no-longer-available-in-github-actions/
- `actions/setup-node` Node 24 usage: https://github.com/actions/setup-node
- npm `engines` documentation: https://docs.npmjs.com/files/package.json/#engines
- Next.js `generateStaticParams` behavior: https://nextjs.org/docs/app/api-reference/functions/generate-static-params
- Next.js caching behavior: https://nextjs.org/docs/app/guides/caching
