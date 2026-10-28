# Buy N Try admin — independent release readiness review

Later same-day [local preparation follow-up](LOCAL_RELEASE_PREPARATION_2026-10-28.md)
records the new portable CI checks, actual migration matrix and distinct local
rollback proof. The original review below remains historical; production is still NO-GO.

Reviewed 2026-10-28 Asia/Karachi (2026-10-27 UTC). **NO-GO for production.**
The hydration mitigation passes the recorded local production-mode regression,
but that does not certify the complete release, old deployments or rollback.

This review made no application, SQL or workflow changes, Git/index writes,
pushes, merges, deployments, production writes, credential changes or live-setting
changes. New work consists of this dated documentation and ignored review evidence.
Previous failed runs, successful acceptance, archived builds and unfinished files
are retained. No local services or containers were started for this review.

## Candidate and scope

- Worktree: `D:\e commerce store (1)\.worktrees\admin-efficiency`.
- Branch: `codex/isolated-staging-certification`.
- HEAD: `c3304ccb6ab4c679aeedab0655769288f2f6236a`.
- Working hydration changes are not committed. Publishing HEAD alone would omit
  the fix. HEAD contains five commits and 124 changed paths relative to PR30 head
  `9d0692ace7fbc7b8af52c8a21704374611061036`; this is not a hydration-only candidate.
- Independently reviewed areas: hydration runtime/tests and browser evidence;
  product/collection/session migrations and writer adapters; acceptance evidence,
  CI coverage, deployment exposure and recovery procedures. Three read-only
  reviewers provided separate hydration-security, database-release and
  evidence-release assessments. This is not a fresh browser audit of every one
  of the 124 changed paths.

The `apps/admin/tsconfig.json` status entry has no substantive diff. Leave it and
all unfinished local tools alone; do not reset or stage the entire worktree.

## Verified local evidence

| Gate | Observed result and limit |
| --- | --- |
| Exact hydration source | All five source/test SHA256 values match the final gate record. Current admin BUILD_ID `FEF0cc4t51VthUMaOCSpQ`; storefront `ODfejI3iW0q0o3XVK7zj1`. |
| Full recorded gate | 1090 tests, 380 suites, zero failures; both apps lint, typecheck and production build passed. Logs/artifacts inspected; the broad gate was not unnecessarily rerun. |
| Independent focused rerun | Six hydration helper/SSR tests passed. |
| Fresh harness contracts | 19/19 tests passed across isolation, browser HTTPS, PKI, recovery and debug cleanup contracts. No browser or database service was needed. |
| Fresh performance budgets | All ten current storefront bundle/route budgets passed. These are build-size budgets, not new Lighthouse or hosted latency measurements. |
| Final local production browser | 30 list/editor cycles: ten desktop, ten mobile, ten throttled mobile; ten additional new-product editor visits. Zero runtime errors, including 418 and `$RS`; 26 pending-reveal samples; SSR input node retained in all 30 checks; input/menu worked; synthetic product digest unchanged. |
| Cleanup evidence | Final recorded verification passed: owned ports free, eight owned containers stopped, temporary certificate absent from both stores, private browser input absent. Nothing in this review restarted them or changed trust. |
| Whitespace | `git diff --check` passed; line-ending notices are not test failures. |
| Migration provenance | All 64 local migration files match the retained manifest/staged copies. The three prepared migration hashes also match their committed Git blobs; no SQL was edited. |

Evidence under ignored `tmp/isolated-staging/`:

- `hydration-gates-07b0f60d-37ac-4c4b-b1b4-0e4ab66d7795/results.json`
- `hydration-regression-e5d2bb1b-1c88-46c0-b51f-ea188a3f67ce.json`
- `hydration-final-verification-e5d2bb1b-1c88-46c0-b51f-ea188a3f67ce.json`
- `release-readiness-20261028/readonly-remote-evidence.json`
- `release-readiness-20261028/vercel-cli-projects.json`
- `release-readiness-20261028/unauthenticated-entrypoints.json`

The original baseline reproduced 418 on three of twelve cycles. The first
DOMContentLoaded-only mitigation failed a later production browser regression;
its artifacts remain failed evidence. See [the investigation](HYDRATION_RACE_FIX.md).

## Independent hydration review

The small mitigation retains server rendering and uses native Suspense with a
stable per-document promise. It waits for document parsing and observes the
pending React reveal queue, without modifying React's scheduler, queue or DOM.
The observed sequence was premature hydration recovery followed by a streamed
`$RS` segment targeting DOM removed by that recovery. The final test exercised
late reveals and eliminated both errors under the recorded conditions. Review
found no blocking authorization, data-integrity or injection defect in this patch.

**Release-control finding (P2):** `window.$RB` is undocumented React Fizz behavior.
The application regards an absent or differently shaped queue as empty. The
installed dependency is Next15.5.28, with App Router vendored React
`19.2.0-canary-0bdb9206-20250818` (different from root React18.3.1). Version and
stream-protocol checks exist in `scripts/local-staging/hydration-repro.mjs`, not
the standard GitHub CI gate. Green unit tests alone cannot detect an incompatible
future streaming protocol.

Before release, enforce a portable dependency/protocol contract in CI, or a
mandatory immutable-candidate release gate that checks installed server/client
protocol semantics and reruns production browser regression. A string assertion
alone does not establish ordering semantics. Do not copy the Windows-specific lab
runner unchanged into Linux CI. Any dependency change invalidates this evidence
until reviewed and retested.

**Availability qualification:** a permanently nonempty queue defers hydration;
background animation-frame throttling can delay interactivity. No inherent
circular wait was found. Controlled freeze/resume passed, but indefinitely stuck
reveals, delayed stylesheet reveals and real background/foreground behavior need
explicit coverage. Do not introduce a timer that resumes known-unsafe hydration.
One click before React installed a root listener was not replayed; the subsequent
hydrated click worked. This is not a promise of pre-JavaScript interactivity.

## Database and publishing assessment

The database reviewer found no new blocking logic defect in the scoped SQL review.
Product writers lock rows and compare admin/inventory revisions, preserve stock
unless an explicit adjustment is requested, and avoid overwriting moderated
reviews and their aggregates. Collection operations use coherent snapshots,
ordered locks and conflict detection. Session RPCs are service-only, store hashed
tokens and validate expiry, identity and Auth-session revocation. New application
adapters fail closed when safe RPCs are missing; no unsafe fallback is acceptable.

Prepared files, unchanged SHA256:

| Migration | SHA256 |
| --- | --- |
| `20261028000000_product_integrity_v2.sql` | `3ED0B3A4CB7DB6C5ACCEF962A3696CA46A035DCAF528C699761F884D000E8577` |
| `20261029000000_collection_integrity.sql` | `C54B95DEEF2FA84E4B73A96E6243B7A638F8BC5EDD4921E742ABCE7F2406725A` |
| `20261030000000_admin_browser_sessions.sql` | `51B5B287ECA1B5112611CF03D0D9E3A7CDAA91D27D505A8E8519C60173288748` |

Fresh read-only production metadata for `zeuhfqevqjkbzwdaxjuv` returned 61
migrations, latest `20261027000000_storefront_read_indexes`. None of these three
prepared migrations is applied. The new session table and catalog revision columns
are absent. Legacy product RPCs remain executable by `service_role`, not `anon`
or `authenticated`. This is not evidence of anonymous direct RPC access.

Required Auth column names/types exist. The metadata connection is `postgres` and
has the inspected Auth schema/read/trigger privileges. Those are prerequisite
checks, not proof of the selected deployment runner's identity or hosted Auth
runtime/trigger behavior. No Auth identities, passwords or customer rows were read.

**Migration execution blocker (P2):** migrations28/29 have no top-level
BEGIN/COMMIT; migration30 explicitly wraps itself. Migration28 references helpers
and a column introduced by29, so no writer may run between them. The selected
runner must prove transaction boundaries, migration-history bookkeeping, bounded
lock/statement behavior, schema-cache refresh and failure handling. Do not assume
the CLI supplies a transaction. Installed CLI package metadata is2.116.0; upstream
[issue6347](https://github.com/supabase/cli/issues/6347) reports transaction changes
in this version range, and [PR6354](https://github.com/supabase/cli/pull/6354)
describes explanatory warnings rather than adding implicit wrapping. This is an
upstream report, not a reproduction against our actual migration files.

The existing rollback probe uses a synthetic table/exception and same-build
writer revoke/restore. It does not inject failures into the actual migrations or
prove partial-file/history recovery. Required isolated tests must use the selected
runner and actual migration bytes. Do not blindly nest transactions around30,
modify already-reviewed bytes or mark a failed migration applied.

## Older admin exposure — production blocker (P1)

Older source `b107690:packages/shared/lib/admin.ts` accepts the permanent derived
cookie without consulting the new session RPC. Applying migration30 or moving the
main alias does not revoke that binary's cookie path. Migration28 revokes two
legacy RPCs, but retains service-role table DML: old direct writers still require
entry-point closure. This establishes a code-level bypass risk if an old binary
with production credentials remains reachable; it does not prove a current attack.

Fresh project reads for both exact permitted Vercel project IDs returned403.
Scoped CLI GET fallbacks timed out after30 seconds each; they were not confirmed
CLI authorization denials. Current deployment/source/environment maps, immutable
URLs, branch URLs, aliases, protection exceptions and share/bypass paths remain
unverified. This is an access blocker for already-authorized read-only inspection.

Unauthenticated probes of the two known `/admin/login` URLs returned200, and both
known `/api/admin/products` endpoints returned401. Bodies were discarded, no
credentials/bypass supplied, TLS validation enabled. This proves basic anonymous
API denial only, not rejection of a valid old cookie or closure of every old URL.

Vercel's [September2026 announcement](https://vercel.com/changelog/protect-production-deployments-for-free-on-every-plan)
says Vercel Authentication for All Deployments is free on every plan. Effective
availability/coverage in this account remains unverified. Standard/legacy coverage
is not equivalent to All Deployments; see [protection documentation](https://vercel.com/docs/deployment-protection).
Do not enable protection blindly: it can block cron, webhooks and server calls.
Restrict only the two permitted projects/required admin paths after a precise
inventory and separate approval; no team-wide change or incidental rotation.

## Remaining acceptance and CI blockers

1. **No immutable final source candidate or final CI.** PRs28–30 remain draft,
   open and unmerged. Current-HEAD query returned no PR-event workflow runs or
   combined statuses; those wrappers are not a complete Check Runs inventory.
   More decisively, no final commit contains the working hydration patch yet.
2. **CI scope gap.** Current workflow pushes trigger only on main; PR base filters
   cover main and `codex/admin-*`, `codex/product-*`, `codex/collection-*`.
   PR30's base matches; `codex/isolated-staging-certification` does not. A focused
   child PR against this branch would not automatically run this workflow.
   `verify` and `product-integrity` must run on the actual final reviewed SHA.
3. **Coverage gap.** CI explicitly runs six isolation contracts, not the other13
   of the19 local harness contracts or the dependency/protocol/browser gate. The
   PostgreSQL job includes28/29 on a miniature schema, not30 with real local Auth.
   Retain the full-schema evidence and add a portable full-schema/session gate or
   an explicit release gate; green miniature-schema CI is insufficient.
4. **Final-build browser authentication/media acceptance.** Earlier native HTTPS
   upload acceptance used earlier build IDs (`1-LdQDvIe901cfKWAaelX` /
   `uUlRAKU1-Dmj0d1mhq514`). The final30-cycle rendering test used a temporary
   machine bearer. It does not substitute for cookie login, native selection of
   the two authorized images, upload/preview/save/reload/publish/storefront
   rendering on the final matching builds. Preserve the historical reports,
   including their failed overall status; do not relabel them as final acceptance.
5. **Session performance limit.** Existing local paired benchmark shows cookie
   requests +21.669ms median /+43.900ms sample p95 versus bearer, on earlier builds
   under host contention. No final hosted latency or release SLA is certified.
   Measure the final isolated candidate; do not cache successful checks in a way
   that weakens revocation just to improve timing.
6. **Distinct rollback missing (P1).** No independently verified secure rollback
   deployment/environment pair exists. Same-build recovery is useful evidence
   but not application rollback. Backup/restore-point availability is unverified.
   See [the compatible rollback plan](COMPATIBLE_ROLLBACK_PLAN_2026-10-28.md).

Shared package changes can automatically build both Vercel projects on push/PR.
PR30's historical previews were production-connected. Current preview isolation
is unknown; do not use those deployments for synthetic writes or assume a draft
PR cannot cause a deployment.

## Decision and next boundary

**Conditional local GO:** retain the tested hydration patch and its evidence for
this dependency version and observed scenarios. **Production NO-GO:** candidate,
CI, final authenticated media acceptance, old-deployment closure, actual migration
execution/failure plan, hosted session behavior/performance and distinct rollback
remain open. No reviewer certified these missing gates as passed.

The [action manifest](PRODUCTION_RELEASE_ACTION_MANIFEST_2026-10-28.md) separates
already-authorized read-only inspection from future publishing, hosted tests,
protection, migrations and cutover approvals. Production approval should not be
requested until its identifiers and blocking evidence are complete.
