# Security Review

## Phase 1 dependency assessment

### Audit summary

- Tool: npm 11 audit service.
- Lockfile: npm lockfile v3.
- Full dependency graph: 12 vulnerability nodes — 1 critical, 9 high, 2 moderate.
- Production-only graph: 2 vulnerability nodes — direct `next` (critical aggregate) and its nested `postcss` (high aggregate).
- Automatic non-breaking remediation: none; dry run changed zero packages.

### Runtime chain

`voltgear-monorepo -> next@14.2.35 -> postcss@8.4.31`

The Next aggregate includes denial of service, cache behavior, rewrite/SSRF, Windows-hosted RCE, and image optimizer advisories. Applicability differs by deployment and code path. No exploitation was attempted. npm's available remediation is Next 16.4.2, a major framework migration already being evaluated on a separate branch.

### Development-only chains

- `eslint-config-next@14.2.35 -> @next/eslint-plugin-next -> glob@10.3.10`
- `tailwindcss@3.4.19 -> chokidar/fast-glob/micromatch/postcss-nested/postcss-selector-parser`

These execute in local development or build tooling. They are not imported into shopper request handlers, but a compromised build environment remains a supply-chain risk.

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

- Validate the Next 16 migration branch against official migration guidance and all application routes.
- Review whether Vercel's managed image pipeline changes exposure to the AVIF advisory.
- Add an intentional dependency policy only after an upgrade path exists; do not create a permanently failing audit gate.
- Perform license and broader supply-chain review during the full dependency phase.

### Sensitive-data statement

No secret values, tokens, customer records, order data, or environment variable contents were printed or added to these reports.
