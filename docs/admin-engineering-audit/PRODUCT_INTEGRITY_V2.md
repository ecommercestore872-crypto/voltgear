# Product integrity v2 — draft implementation, not approved for production

Base: PR #28, `3866d0ecc3556a7e40c3eef00ab379333ab7d647`.
Scope: product input, draft/live boundaries and atomic publication. No repeat of
PRs #23–#28; their responsive and shared-media deletion safeguards are retained.

## Implemented boundaries

- Validate original request values before normalization or merge: supported actions,
  finite nonnegative two-decimal amounts, integer quantities, explicit optional clears,
  variant/axis types and keys, numeric consistency, collections and editor revisions.
- Existing saves, publication, discard and unpublish use only `admin_write_product_v2`.
  A missing/unapproved RPC fails closed (503); no legacy or direct-write fallback.
- Product-row locks and admin revision compare-and-swap reject stale editor commands.
  Inventory revisions change on actual quantity/status changes from any writer,
  including checkout and cancellation. A checkout/cancel ABA cannot revive stale intent.
- Ordinary publication preserves current stock. Deliberate inventory adjustment keeps
  its original inventory revision through save/reload and conflicts after a sale.
  Initial stock on creation is retained as draft adjustment intent, not dropped.
- Catalog publication never replaces review rows or writes rating/count aggregates.
  Matching variant IDs remain stable for waiting checkouts. Ordered slugs cannot rename.
- Cost, demo flag and manual membership stay draft-only until publication. Unchanged
  memberships are omitted from content-only editor requests. Reserved membership input
  cannot impersonate the locked stored draft intent.
- Unknown write outcomes (transport loss, 408/5xx, malformed success) require reload;
  the editor does not blindly retry or claim a clean saved baseline.

## Independent read-only review findings

Security and database reviewers identified raw-value coercion, legacy review replacement,
stale quantity restocking, inventory ABA, live draft-field leakage, unstable variant IDs,
reserved membership authority and unsafe fallback/rollout risks. Their initial feedback
informed the implementation. Subsequent coordinator fixes cover initial create stock,
unknown response locking, unsafe JS revision rounding and unnecessary membership writes.
This is not a claim of independent final-commit sign-off.

Review also caught and corrected a duplicate migration version, PostgreSQL test-version
mismatch and whole-row monetary constraints that could disrupt checkout/cancel on legacy
rows. The new migration has unique version `20261028000000`, tests PostgreSQL 17, and
validates money at the command boundary rather than adding those constraints.

## Isolated database evidence

See `tests/product-integrity/README.md`. The Node runner owns one disposable networkless
PostgreSQL container, no host mounts/ports, no Supabase URLs/credentials or customer data.
It invokes the actual checked-in checkout, cancellation, moderation and product RPCs.
Independent connections establish observed lock waits for both orderings of checkout /
publication, cancellation / publication and approval / publication, plus stale admin CAS,
inventory ABA/conflicts, intentional null stock, role grants and transaction rollback.

Local Docker is stopped: local integration execution is blocked, not passed. A dedicated
GitHub CI job runs the same harness. Runtime results must be recorded after completion.
The minimal synthetic schema is not a complete historical migration replay or PostgREST
HTTP/schema-cache acceptance test.

Initial draft head `67823ecea2c96c8bb55ddfc3e9e3ff194a0e74cd`: GitHub run
`40071607953` completed successfully (both verify and product-integrity jobs).
The PostgreSQL job passed 22 behavioral scenarios plus migration-version uniqueness;
this establishes real isolated database execution, not local Docker success.
Later final-head verification must supersede this checkpoint before acceptance.

## Local quality and browser evidence (2026-10-24)

- Complete local `npm run ci` exited 0: 1003/1003 tests at that checkpoint,
  both app linters (no ESLint warnings/errors), both typechecks and both builds.
  Next 15 prints its existing `next lint` deprecation notice; no claim of zero
  CLI informational/deprecation messages. All ten storefront bundle budgets passed.
- After the final inline-collection and strict-decimal fixes, the focused product /
  editor suite passed 114/114 tests. Exact final-head GitHub CI must include these
  later tests as well as the full gate and unchanged PostgreSQL suite.
- Actual Chromium in a dedicated isolated browser context rendered the real product
  form with synthetic local data at 390px and 1440px. No horizontal page overflow.
  Native form typing preserved `oops` price / `1.5` quantity and blocked Save with
  zero mutation events. Fixing quantity still rejected the invalid price.
- Simulated HTTP 502 set the reload-required state and disabled editing/writes.
  Confirmed synthetic saves advanced expected admin revisions `0` then `1`, kept
  inventory intent `preserve`, omitted unchanged membership (`null`) and reset dirtiness.
  Console error/warning checks were empty. Fetch/XHR network checks were empty because
  the fixture intercepted synthetic product responses; these are not backend HTTP tests.
- Native upload was attempted through the actual Photos Upload File control with the
  existing local `public/favicon-512.png` fixture. The browser tool rejected its canonical
  workspace path as outside configured roots. No file was selected/uploaded. No bypass
  was attempted; real picker-to-provider acceptance remains BLOCKED, not passed.
- Temporary fixture routes, local server and their exact generated cache were removed;
  Next-generated config/type changes were restored. No fixture is committed or deployed.

## Remaining release blockers and next approval

1. Do not run this migration in production or merge/deploy this draft stack yet.
   Source-only application rollout without v2 intentionally blocks catalog writes.
2. Drain/disable **all old admin writers**, including old previews sharing production,
   before any coordinated migration/app rollout. Revoking old RPCs alone does not stop
   old direct save/discard/unpublish implementations using service-role table writes.
3. The separate collection-management writer does not join product admin CAS. Unchanged
   content publishes no longer overwrite its changes, but explicit simultaneous collection
   edits still need a shared transaction/version protocol and isolated acceptance before
   claiming lossless catalog editing across both editors.
4. Confirm exact-head CI, both builds, lint/types, budgets and browser regressions.
   Native file-picker acceptance remains incomplete unless the permitted local fixture
   can be selected successfully. Synthetic client responses are not provider acceptance.
5. Full isolated staging acceptance (including HTTP RPC/cache behavior and coordinated
   writer shutdown/recovery) is required before requesting separate approval for the exact
   production target and migration. No production SQL is authorized by this document.

Rollout proposal: read-only schema/legacy-data inspection; approved maintenance window;
stop old writers; back up and verify recovery; apply the exact reviewed migration in one
transaction using the approved tool; deploy only matching reviewed source; reload schema
cache as appropriate; synthetic isolated staging acceptance first, then separately approved
production smoke checks. On failure, keep writes closed—never re-enable unsafe legacy RPCs.
