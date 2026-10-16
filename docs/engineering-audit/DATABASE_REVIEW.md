# Database Review

## Phase 1 status

No production database query, migration, or mutation was performed in Phase 1.

The database claims and approximate table/index counts in the master audit request remain unverified. They must not be treated as current facts until Phase 4 performs read-only metadata inspection.

## Known integration dependency

Draft PR #2 adds checkout, cancellation, idempotency, RLS, and database regression work. It also adds a local Supabase CI job. That branch is currently divergent from `main` and its workflow change overlaps structurally with the Phase 1 CI file.

Before PR #2 can be considered for release:

1. Rebase or reconcile it with the Node 24 CI baseline.
2. Apply migrations only to an isolated database.
3. Run pgTAP and behavioral SQL tests.
4. Run parallel checkout and cancellation tests.
5. Compare migration files with actual isolated function definitions.
6. Keep production schema and customer/order/inventory data untouched until separate approval.

## Current blocker

An isolated Supabase database lifecycle has not yet been established in this Phase 1 branch, so no database correctness claim is made here.
