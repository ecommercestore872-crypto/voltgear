# Security Review

## Current dependency assessment

### Audit summary

- Tool: npm 11 audit service.
- Lockfile: npm lockfile v3.
- Snapshot date: 2026-10-19 on source commit `8a2dbad`.
- Full dependency graph: 9 development-only vulnerability nodes — 7 high and 2 moderate.
- Production-only graph: 0 vulnerability nodes across 113 production dependencies.
- Installed runtime chain: `next@15.5.28` with nested `postcss@8.5.30` enforced by the root override.
- `npm ls` confirms `nanoid@3.3.20` and the overridden PostCSS version are already installed and locked.

### Runtime remediation

The Phase 1 baseline used `next@14.2.35 -> postcss@8.4.31` and had two production audit nodes. The dependency remediation upgraded Next.js and its ESLint configuration to 15.5.28, updated the lockfile, and constrained Next's nested PostCSS to 8.5.30. Fresh production-only audit output is clean.

This result applies to the current stacked source and its previews. It does not claim that production already runs the upgraded framework; production remains unchanged until the reviewed stack is merged and promoted.

### Development-only chains

- `eslint-config-next@15.5.28 -> @next/eslint-plugin-next -> fast-glob/micromatch`
- `tailwindcss@3.4.19 -> braces/chokidar/fast-glob/micromatch/postcss-nested/postcss-selector-parser`

These execute in local development or build tooling. They are not imported into shopper request handlers, but a compromised build environment remains a supply-chain risk.

`npm audit fix --dry-run --json` simulates two package reconciliations (`nanoid` and Next's nested `postcss`), but the installed tree and lockfile already resolve to the proposed versions. Its remaining advisory suggestions require an unsuitable ESLint configuration downgrade or the separate Tailwind 4 migration; neither is applied automatically.

### Workflow hardening implemented

- Repository permission reduced to `contents: read`.
- Checkout credentials are not persisted after source retrieval.
- First-party actions use current Node-24-compatible major versions.
- Dependency installation remains lockfile-based with `npm ci`.

### Client/server boundary hardening

- Static review found no Client Component runtime-importing the server Supabase client or server database stores.
- Phase 2 adds a TypeScript-AST regression test for that boundary. It ignores type-only imports because TypeScript erases them, but rejects side-effect, value, namespace, mixed-value, and dynamic imports of the protected server modules.
- Generated output and dependency folders are excluded so the check evaluates authored source and remains fast enough for the normal unit-test suite.
- This protects module direction; it does not replace secret scanning, route authorization, Supabase row-level security, or browser bundle inspection.

### Deferred security work

- Evaluate Next 16 and Tailwind 4 as separate toolchain migrations with route, image, build, and browser regressions.
- Keep CI inputs trusted and lockfile installs deterministic while the development-only pattern-parser findings remain.
- Add an intentional dependency policy only when it can distinguish production from accepted development-only findings; do not create a permanently failing gate.
- Perform license and broader provenance review as a separate supply-chain task; this update validates vulnerabilities, not every transitive package license.

### Sensitive-data statement

No secret values, tokens, customer records, order data, or environment variable contents were printed or added to these reports.
