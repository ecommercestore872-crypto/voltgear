# Final local changes — organization only, no Git staging

2026-10-28, `codex/isolated-staging-certification`, HEAD
`c3304ccb6ab4c679aeedab0655769288f2f6236a`. Index remains unchanged; no commit/push.
This is a proposed publication grouping, not a claim that every group is ready.

## Dependency stack already in local HEAD

PR30 head `9d0692ace7fbc7b8af52c8a21704374611061036` is followed by five local
commits affecting124 paths:

1. `acc35d7` — guarded local staging preparation and runtime blockers.
2. `b107690` — isolated acceptance and blocker evidence; permanent-cookie runtime
   is unsafe as a rollback target.
3. `170b0f3` — hardened v2 admin sessions and local recovery tests.
4. `d998d34` — prepared session migration30.
5. `c3304cc` — local performance evidence and HTTPS proposal.

Preserve the dependency PRs as drafts. Do not cherry-pick a runtime consumer
without its safe writer/session schema contracts. A future PR must explain this
stack or use a separately reviewed focused extraction; no history rewrite now.

## Focused hydration and portable CI group

Explicit proposed file allowlist:

- `apps/admin/app/admin/layout.tsx`
- `apps/admin/app/admin/hydration-boundary.test.ts`
- `packages/shared/components/admin/admin-hydration-boundary.tsx`
- `packages/shared/lib/admin-document-ready.ts`
- `packages/shared/lib/admin-document-ready.test.ts`
- `scripts/check-admin-streaming-compatibility.mjs`
- `scripts/check-admin-streaming-compatibility.test.mjs`
- `.github/workflows/storefront-ci.yml`
- `docs/admin-engineering-audit/HYDRATION_RACE_FIX.md`

The workflow now explicitly includes PRs based on
`codex/isolated-staging-certification`, tests actual installed browser/edge Fizz
behavior, includes19 existing staging safety contracts and tests the migration
plan renderer. A future publication containing this workflow must include its
referenced test files/dependencies below. Changes remain local; no remote CI ran.
The queue-only stylesheet limitation still requires browser investigation.

## Local safety harness group — include together after review

The existing19 safety contracts require these untracked modules/tests; they are
not unrelated files to silently omit while publishing a workflow that imports them:

- `scripts/local-staging/browser-https.mjs` and `.test.mjs`
- `scripts/local-staging/browser-pki.mjs` and `.test.mjs`
- `scripts/local-staging/browser-https-recover.mjs` and `.test.mjs`
- `scripts/local-staging/browser-debug-cleanup.mjs` and `.test.mjs`

`scripts/local-staging/isolation.mjs` and `.test.mjs` already exist in HEAD.
Review transitive imports before selecting the final commit; never use `git add .`.

New preparation modules (execution status is in the follow-up report):

- `scripts/local-staging/release-migration-plan.mjs` and `.test.mjs`
- `scripts/local-staging/test-release-migrations.mjs`
- `scripts/local-staging/prepare-rollback-build.mjs`
- `scripts/local-staging/test-distinct-rollback.mjs`
- `scripts/local-staging/release-prep-gates.mjs`

`scripts/local-staging/local-app.mjs` has a small backward-compatible state
accessor for test process diagnostics. It changes no application behavior.

Keep their database/build execution status explicit. Actual migration/rollback
evidence is recorded in [the follow-up](LOCAL_RELEASE_PREPARATION_2026-10-28.md);
passing offline renderer tests alone is not database acceptance.

## Evidence and operator documents

Retain local changes to `DRAFT_PR_ISOLATED_CERTIFICATION.md`,
`ISOLATED_HTTPS_PROPOSAL.md`, `LOCAL_HTTPS_ACCEPTANCE.md`,
`LOCAL_HTTPS_FREE_REVIEW.md` and `scripts/local-staging/README.md` for a separate
evidence review. The dated production readiness/action/rollback documents and this
inventory should accompany the eventual release review. Do not overwrite historical
failed reports, earlier build IDs or the original acceptance claims.

## Leave untouched / not implicitly included

- `apps/admin/tsconfig.json`: status entry has no substantive diff; do not reset.
- `scripts/agent-browser-task.mjs`: prior unfinished tool, outside this release patch.
- Prior `browser-https-media.mjs`, `browser-https-session.mjs`,
  `browser-debug-recover.mjs`, `browser-hydration-debug.mjs`,
  `browser-ui-diagnose.mjs`, `hydration-gates.mjs`, `hydration-repro.mjs`: preserve;
  review as a separate harness group rather than silently publishing all tools.
- Ignored `tmp/isolated-staging/**`: retained local evidence, synthetic fixtures,
  original archived builds and recovery snapshots; never broad-stage it. Private
  credentials, keys, browser profiles, certificates and cookie material must not
  enter a future PR.

All three prepared SQL source files remain byte-for-byte unchanged. Production
application/migration approval is separate from source publication. Shared-source
pushes can trigger both allowed Vercel projects; preview isolation must be resolved
before asking to publish.
