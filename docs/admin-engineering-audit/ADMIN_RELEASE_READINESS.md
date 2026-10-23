# Release readiness

**Entire overhaul: NOT COMPLETE. Production release: NOT APPROVED.**

Initial source improvements are isolated, reversible and intended for draft review only.
Previous batch local gate passed: 801 tests, both linters/typechecks and both production builds.
Current follow-up gate passed: **836/836 tests**, both lint/typechecks, both production
builds, all ten storefront JS/CSS budget checks and whitespace diff verification.
Subsequent build-ignore-only correction passed all **840/840** unit tests, focused
script/scope regressions, admin typecheck and Node syntax check. App source unchanged.
Order list/detail synthetic responsive checks are documented, not blanket workflow approval.
No production merge/deployment, DB migration/write, order/inventory mutation, communication,
DNS/billing/credential/environment update or unrelated project change was performed.

## Before production approval

1. Complete final CI/build gates and changed-code independent review.
2. Verify proxy Origin configuration on the actual admin project; do not loosen the
   Origin policy based on an untrusted forwarding header to make tests pass.
   Read-only metadata found neither ADMIN_PUBLIC_URL nor ADMIN_SAME_ORIGIN on admin.
   A proxied release therefore needs an explicitly approved exact-origin setting.
3. Supply an isolated DB/provider/auth environment for actual workflow and responsive
   tests; preview alone is not isolation. No production secret values need be shared.
   Observed Supabase URL/service-role metadata targets production and preview together.
4. Resolve or explicitly disposition session expiry/revocation and courier/cancellation
   reservation. Operational-list truncation and combined catalog search now have source
   fixes and synthetic regressions; isolated business acceptance remains required.
5. Measure cold/warm business routes and complete feature-level acceptance matrix;
   then review safe focused follow-up PRs. No dependency migration is required here.

## Review/rollback

Split review into shipping/auth correctness, search-data efficiency, and order-list
navigation changes; preserve main's existing behavior outside those surfaces.
All PRs stay draft. Reverting the relevant source commit restores prior behavior;
no schema/data rollback is required for these changes. Do not revert during an active
courier incident without preserving outstanding reconciliation claims.

## Operational warnings

- Don't retry an ambiguous courier booking as if it never happened: reconcile first.
- Existing historical draft chains were not closed/merged/rebased by this audit.
- Local mock passes are useful regressions, not proof that the whole admin is perfect.
- Production merge/deployment and any DB-level coordination require separate approval.

## Current follow-up review scope

Counted products/inbox/newsletter lists, complete bounded CSV export, editor dirty
tracking, command-dialog accessibility/stale responses and honest customer error states.
No schema or production configuration change. Keep the source-only stack draft.
Browser Back guard behavior, session revocation, cancellation coordination and live
cache invalidation remain unverified/unresolved; no all-modules-perfect claim.

Draft PR25 is stacked on PR24. The GitHub workflow targets only main PRs/pushes, so
this feature-branch stack does not establish remote GitHub CI coverage. Initial Vercel
checks were green but deployments CANCELED by ignored-build logic; build-script fallback
corrected. Verify final commit's actual Ready deployments separately before acceptance.

## Product extension — NOT READY — BLOCKERS REMAIN

Media/editor safeguards do not certify the lifecycle. P06–P11 add review replacement,
raw numeric coercion, stale quantity overwrite, draft/live flags/membership and shared
image cleanup risks. Session/courier/proxy/isolation blockers also remain.

Before any production atomic publish/inventory change: exact project/migration, current
RPC contract, stock/review/version invariants, draft membership model, compatible app
rollout, isolated interleaving/rollback tests and recovery plan. No production SQL approved.

Browser tool became unavailable; new UI responsiveness is unverified. Final GitHub CI
and actual Ready previews must match the exact commit. No merge/production deployment.

Combined source passed the complete local gate: 874/874 tests, both app lint and
TypeScript checks, both production builds, all ten storefront bundle-budget checks
and whitespace verification. This improves source confidence but does not close the
publication/inventory, rendered UI or production isolation blockers above.

### Proposed atomic publication boundary (design only)

- Content publishing must not delete/reinsert moderation-owned reviews or write their
  rating/count aggregates. Preserving a freshly fetched array in application code alone
  still loses a concurrent approval and changes review identities.
- Unchanged inventory must be preserved by the transaction, not copied from a saved
  editor snapshot. Explicit quantity adjustments need an intent marker and original
  stock baseline retained through draft saves/reloads. Comparing a new live snapshot
  to an old draft quantity is not safe: it can silently restock sold units.
- A versioned publish RPC should lock the product, validate explicit stock adjustment
  baselines, apply content/media/variants/manual membership atomically, and return a
  conflict rather than overwrite changed stock. updated_at alone misses checkout changes.
- Keep is_demo/cost/manual membership in draft until publication. Define compatible
  treatment for legacy drafts without intent metadata; default to preserving live stock,
  with an explicit adjustment flow rather than silently interpreting stale quantities.
- Use the new RPC only after isolated transaction tests and migration approval; missing
  RPC must fail closed, never fall back to the known unsafe old publication path.
- Required interleavings: checkout during content-only publish; explicit stocktake vs
  checkout; saved draft reopened after a sale; cancellation restoration; concurrent
  review approval; membership failure rollback. No migration is applied by this design.
