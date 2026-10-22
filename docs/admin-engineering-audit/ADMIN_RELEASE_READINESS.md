# Release readiness

**Entire overhaul: NOT COMPLETE. Production release: NOT APPROVED.**

Initial source improvements are isolated, reversible and intended for draft review only.
Final local gate passed: 801 tests, both linters/typechecks and both production builds.
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
4. Resolve or explicitly disposition session expiry/revocation, courier/cancellation
   reservation, truncated operational lists and incorrect combined catalog search.
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
