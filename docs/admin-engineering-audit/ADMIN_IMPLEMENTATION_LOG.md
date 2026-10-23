# Implementation log

## 2026-10-22 — Initial isolated batches

This log describes the combined review worktree. Correctness/security/navigation
and data/client-dependency efficiency are separate draft review batches; an
individual PR need not contain every change described here. No batch is approved
for production merely by appearing in this inventory.

- Verified repo `ecommercestore872-crypto/voltgear`, fetched latest main `2188a0b`;
  main CI run `39635665835` succeeded. Local primary main is stale and was not reset.
- Created clean worktree/branch `codex/admin-efficiency-overhaul`.
- Used intelligent skill routing, token efficiency, adaptive planning/coordination,
  admin-commerce, security-gate and existing project safety/browser/performance guidance.
  Three independent bounded read-only audits preceded implementation; two workers owned
  nonoverlapping search-data and order-list files. Coordinator reviewed integration.
- Existing PRs #18–22 are merged; older draft chains remain untouched. #7 is explicitly
  labelled superseded. Do not infer every historical draft is covered solely from titles.
- PostEx eligibility: live new/processing only; repeat predicates at claim/completion,
  verify timestamp ownership and actual matched row; preserve reconciliation lock on conflict.
  Added malformed-ID validation and mirrored UI eligibility. No migration/schema change.
- Cookie mutations: exact trusted Origin required; bearer automation preserved. Explicit
  public-admin configuration supports storefront proxy; forwarded host cannot expand trust.
- Order list: URL is source of truth, stale debounce cancelled; labels/filter state improved.
- Synthetic browser inspection reproduced a date-locale hydration mismatch. Order list/detail
  now share explicit Pakistan timestamps; timezone and invalid-input regression tests added.
- Command product search: narrow projection removes image/draft work; category cache now
  registers its product dependency. Existing grid search behavior deliberately unchanged.
- Build inspection traced the order-detail client graph through an email-history constant
  into email rendering/signing. Extracted a client-safe constant with compatible re-export;
  no email content/signing behavior changed. Final build comparison is reported separately.
- Independent review found an older search response could cancel a newer pending edit.
  Added bounded navigation revision tracking and controlled sequence regressions before release.
- Dependencies installed from lockfile with lifecycle scripts disabled. Initial sandbox npm
  failed on Windows workspace links; approved elevated retry succeeded. No version upgrade.

Regression evidence and limitations live in ADMIN_TEST_MATRIX.md. These batches are
incremental, not a claim the entire overhaul is complete. Production infrastructure,
orders, inventory, credentials, customer communications and other projects were untouched.

## 2026-10-22 — Complete operational lists and safer editing

- Products now apply combined query/category/stock filters before range, use exact
  matching totals and deterministic ordering, and hydrate draft flags only for the page.
  URL-backed state replaces client filtering and session restoration. Controlled tests
  cover newer typing surviving older navigation responses and debounce cancellation.
- Inbox/newsletter now use counted, no-store server pages instead of capped browser
  filtering. API error states are explicit; failed loads are not displayed as empty business.
- Newsletter CSV streams all subscribed records in bounded keyset batches, with an
  initial creation-time high water. It is explicitly not a transactionally frozen snapshot.
  Synthetic fixtures cover more than 500 records, cancellation and stream failures.
- New product, page/blog and testimonial editors now enable dirty tracking. Inbox
  notes warn before selection/filter changes, and status-only saves do not mark notes saved.
- Command search gains visible mobile/desktop controls and the existing Radix dialog,
  keyboard containment/return focus, real guarded anchor navigation, and latest-request
  protection. It loads only after first use, then stays mounted for reliable close focus.
  Browser verification caught a conditional-unmount focus defect; it was corrected and
  Escape, settled return focus and Ctrl-K reopening were rechecked.
- Customer directory failures now reach the route error boundary; table overflow scrolls.
  Inbox/newsletter dates use the same explicit Pakistan-time formatting policy as orders.
- Synthetic product/inbox/newsletter views and dialog checked at CSS widths
  360/390/768/1024/1440: no document horizontal overflow; dialog within viewport.
  Inbox selection emitted the discard-note confirmation. The browser tool consumed that
  dialog before cancellation could be checked, so note retention on Cancel is not claimed.
- Removed the temporary public local fixture route and its generated dev cache/config
  changes before the production-build gate. These synthetic test artifacts are recoverable
  from task history and are not shipped. No real customer mutations or exports executed.
- Bounded workers supplied list changes and targeted tests; their final independent
  review was interrupted by usage limits. Coordinator source/browser/full-gate verification
  is reported separately; unfinished independent review is not represented as complete.
- Saved source commits `05b1ff2` (lists/export) and `d8c7cbf` (editor/search/customer).
  Combined final local `npm run ci` exit 0: 836/836 tests, both lint/typechecks and
  both builds; all ten storefront performance-budget checks passed. No runtime speed,
  Lighthouse score, deployed CRUD acceptance or production readiness is inferred.
- Opened draft PR25 stacked on PR24. Direct deployment inspection found initial
  green Vercel checks were canceled builds: ignored-build logs explicitly reported skip.
  Found unsafe missing-baseline HEAD^ fallback, which ignores earlier commits when
  a push ends in docs. Missing/zero baseline now builds conservatively; known baseline
  retains normal app scoping. No dashboard setting, environment or production change.
- After this build-script-only correction, full `npm test` passed **840/840**; focused
  build-scope/script tests 8/8, admin typecheck and Node syntax check passed. App bundles
  are unchanged from the 836-test full CI gate. Final remote deployment status must be
  read independently; canceled/skipped deployments are not successful preview builds.

## 2026-10-23 — Product/media safety batch

- Reconciled PR23/24/25 open/draft heads; isolated branch starts at PR25 `48a96ce`.
- Official Shopify comparison, field-level gap matrix and editor blueprint appended to
  ADMIN_FEATURE_INVENTORY.md. Existing model reused; no new dependency/schema/provider.
- Media removal unlinks only; upload DELETE fails closed until reference-safe cleanup.
  Product-deletion byte cleanup remains a separate open risk.
- Added shared 4 MB policy, signature checks and bounded real Sharp decoding. HEIC/HEIF
  requires confirmed WebP conversion; ambiguous failures/malformed success do not create
  fallback copies. A bounded client timeout reports uncertainty without auto-retry.
- All product media locations register pending work. Controls lock, save acquires a
  synchronous ref, and captured document/collections define saved baselines. Unpublish
  preserves unsaved edits; same-session discard restores latest publish/saved membership.
- Existing badge/social links now hydrate correctly; new Save is sticky; PKR/stock labels
  clarify the actual product-level inventory model.
- CI PR branch filters now include stacked admin/product bases; read-only permissions,
  placeholder build credentials and absence of deployment steps are unchanged.
- Independent initial audits completed; worker follow-up review hit usage limits.
  Coordinator completed remaining integration/tests; independent final sign-off unclaimed.
- Browser tool became unavailable before fixture launch verification. Temporary fixture
  source removed; no new rendered UI/viewport acceptance or substituted old screenshot.
- Final combined local `npm run ci` exited 0: 874/874 tests, both lint/typecheck runs
  and both production builds. All ten storefront bundle-budget checks and whitespace
  verification passed. No storefront page, dependency, schema or live-data changes.
  Remote GitHub CI and actual Ready states remain separate exact-commit gates.

### Product deletion follow-up

- PR26 commit `02c17dca65df3ccbc70f6a3c61deedab3173c4fe` passed remote
  [Monorepo CI](https://github.com/ecommercestore872-crypto/voltgear/actions/runs/39936750608).
  Vercel API confirmed exact-commit storefront `dpl_2RFvDGhXxEm66Mfnkut4Sccduu47`
  and admin `dpl_6RgpDRtF6Wd2CRQjoCFL7JaXwk8v` READY; no production target.
- Isolated next branch `codex/product-delete-media-safety` preserves that tested head.
  Product deletion no longer accesses Storage or deletes potentially shared image
  files. Existing product-row deletion, cache invalidation and revalidation retained.
  Unreferenced files may remain until separately approved reference-aware cleanup.
- Five controlled actual-adapter tests cover success, shared live/draft images,
  not-found, database failure and deferred completion. No real product was deleted.
- Growing Windows test arguments exposed a cmd.exe command-length failure before any
  tests ran. The existing runner now invokes current Node with `--import tsx` directly,
  without a shell. Five runner regressions cover spaces/metacharacters, >8 KB arguments,
  empty discovery, failing exit and launch failure. No dependency was added.
- Final combined local gate log confirms 884/884 tests, both lint/typecheck runs and
  both completed production builds. All ten storefront bundle-budget checks and
  whitespace verification passed. The process handle was lost across tool reconnection;
  no recovered exit-code claim. Exact remote CI remains the final independent gate.
