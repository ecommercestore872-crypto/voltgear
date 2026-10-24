# Product integrity database integration

Run from the repository root with `node scripts/test-product-integrity.mjs`.
Requires a running **local** Docker Linux engine and the locally available
`postgres:17-alpine` image (matching `supabase/config.toml`). The runner uses
`--pull=never`: if the image is missing, prepare it separately with
`docker pull postgres:17-alpine`.

The runner refuses nonlocal Docker endpoints, uses a UUID-named and labeled
container with `--network none`, no published ports, no host mounts, and tmpfs
database storage. It never reads `.env`, database URLs, Supabase credentials,
or production data. Independent `docker exec ... psql` processes connect only
through the owned container's Unix socket. Cleanup verifies the container ID
and ownership label before removing that exact container; no existing container
or database is reset. The trust authentication setting is confined to this
networkless disposable test instance.

`bootstrap.sql` supplies synthetic local Supabase roles/storage scaffolding.
The runner applies the exact checked-in initial schema, then `schema.sql` for
the minimum later columns, then these **unchanged actual migration files**:

- `20260901040000_collections.sql`
- `20261018000000_atomic_product_publish.sql` (legacy functions for revocation)
- `20261019000000_atomic_promo_redemption.sql` (actual live checkout RPC)
- `20261022000000_demo_sandbox_isolation.sql` (actual cancellation RPC)
- `20261023000000_atomic_review_moderation.sql` (actual review moderation RPC)
- `20261028000000_product_integrity_v2.sql` (the migration under test)

The runner first checks all checked-in migration version prefixes for uniqueness
(even if Docker is unavailable). The selected minimal migration chain verifies
the actual RPCs against synthetic required schema; it does not certify replay
of the complete Supabase migration history or all historical schema variants.

No checkout, cancellation, moderation, or product command is replaced by a
mock function. Direct SQL seeds synthetic fixtures, checks results, simulates
revision tampering, and installs a local failing child trigger to test rollback.
Concurrency tests hold a transaction open on one connection, start the other
actual RPC on a second connection, observe its database lock wait through a
third connection, then commit the first transaction. Both orderings cover
plain and legacy-variant checkouts. These are database integrations, not HTTP
or PostgREST schema-cache integrations; application unit tests cover missing-RPC
mapping separately. The harness checks missing-function SQLSTATE 42883 and
real role permissions directly.

The new command accepts the existing camelCase full ProductDocument. Legacy
documents without inventoryIntent mean preserve. Save stores adjustment intent
with its original string expectedRevision even if checkout has made it stale;
publish then rejects that adjustment with SQLSTATE 40001 / CONFLICT:. New rows
start admin_revision=0/inventory_revision=0. Draft-created live rows have null
quantity, in-stock status (required by the existing NOT NULL schema), null cost,
false demo, and no collection links. Publish is the only command that applies
the adjustment or collection intent. Numeric quantities normalize product
status at the existing 0/5 thresholds; null quantities use the explicit status.
Matching variant keys retain their IDs during publish so a waiting checkout
can resume against its existing variant row. Removed keys are deleted and new
keys are inserted in the same transaction.

The migration revokes both old product RPCs from service_role as well as
PUBLIC/anon/authenticated. The matching application and migration therefore
require a coordinated rollout, with no fallback to legacy RPCs. Existing
quantity checks from the numeric-inventory migration are retained. Money is
validated at the command boundary, avoiding new whole-row money constraints
that could block checkout/cancellation when legacy monetary fields remain
unchanged. No new catalog data constraints or historical cleanup are required.

Do not describe this suite as passing unless an actual run has completed. A
stopped engine or missing image is a prerequisite failure, not a passing test.
