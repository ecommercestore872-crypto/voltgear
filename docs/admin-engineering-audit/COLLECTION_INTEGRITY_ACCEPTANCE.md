# Final product/collection integrity and staging acceptance

Base: draft PR29, `4dc2913c9caf8fc7ba7c12af594fe23ab3703f11`.
Decision: **NOT READY — BLOCKERS REMAIN** until the staging and native-upload gates below pass.
This follow-up is draft source, prepared migrations and synthetic isolated tests only.
No production database, credentials, settings, traffic controls or deployments were changed.

## Confirmed problems and bounded changes

Collection metadata, home-slot clearing, membership deletion and replacement previously
committed independently. A failure could empty a collection or displace a home rail;
two legitimate editors could overwrite one another. Product revision and membership
were also read separately, and a membership read failure became an authoritative `[]`.

The collection adapter now uses one versioned `admin_write_collection_v1` command with
no table-write/legacy fallback. It returns its committed snapshot; it does not fetch a
potentially different editor's result after committing. Failed/conflicting/uncertain
commands do not invalidate caches or report confirmed success. Confirmed updates
invalidate old and new slug paths and the existing merchandising tags.

Read paths no longer auto-create generated collections or claim homepage slots.
The unused direct product-membership mutator is removed. Product editor data and
membership baselines come from one SQL-statement snapshot, not parallel independent reads.
Collection list/detail snapshots likewise pair ordered IDs and revisions atomically.

### Shared transaction contracts

| Conflict domain | Token | Behavior |
| --- | --- | --- |
| Product content | existing `admin_revision` | Preserves PR29 CAS and moderation/inventory safeguards |
| Product manual membership | `products.membership_revision` | Original intent survives save/reload; stale publish conflicts; content-only publish preserves live links |
| Collection document/order/membership | `collections.revision` | Stale metadata/reorder/replacement/delete conflicts instead of last-write-wins |
| Active homepage ownership | persistent `collection_home_slots.revision` per slot | Occupied slot is rejected, never silently evicted; vacancy ABA invalidates old tokens |

Collection membership changes lock discovered affected products before their collection.
Bulk product locks are deterministic UUID `NOWAIT`; a busy product aborts with a conflict
instead of waiting in an order inconsistent with checkout/cancellation's slug ordering.
Unrelated collections do not share a global catalog lock. Metadata-only operations do
not unnecessarily lock product stock rows. Product publish locks its one product, then
affected collections in UUID order. Product deletion prelocks linked collections in that
same order before FK cascades. Triggers bump revisions on actual set/order/mode changes;
collection reorder does not change product membership intent. Automatic collection pins
and their order remain supported.

Unversioned saved collection selections fail closed until deliberately reviewed or
discarded with Keep live collections. Confirmed product responses carry both the current
membership IDs and matching revision, so refreshing the live baseline does not pair a
new token with an old selection. Both editors preserve edits on conflicts, use synchronous
duplicate-submit locks and require reload after an unknown write outcome.

### Prepared database changes

- `20261028000000_product_integrity_v2.sql`: extend the still-unapplied product command
  with versioned collection intent and authoritative membership confirmations. Existing
  price/inventory/review protections remain in place.
- `20261029000000_collection_integrity.sql`: collection/product-membership/slot revisions,
  revision triggers, coherent read RPCs, sorted product-delete locking and atomic collection
  commands. Service-role-only execution; no public/authenticated write/snapshot access.
- Both migrations must be reviewed/applied together in order with the matching application.
  Applying only migration28 intentionally leaves safe product writes unavailable.
  No production migration has been applied. Full historical schema replay remains a
  separate staging prerequisite; the isolated suite uses the documented minimal schema.

## Independent review

The read-only transaction reviewer confirmed the original non-atomic and incoherent-read
risks. Review caught two implementation hazards: rejecting legitimate automatic pins and
unsorted product-delete cascade locks. Both were corrected before final verification.
The latest inspected core had no further source-level transaction blocker; runtime tests
and final-head CI remain essential evidence, not implied by that source review.

The independent release reviewer checked metadata without decrypting secrets:

- Exact repo/team/project/root/main bindings match the intended two Vercel applications.
- Both projects use shared production+preview environment entries for Supabase URL,
  anon/service-role, ADMIN_TOKEN, CRON_SECRET and Cloudinary credentials, with no verified
  isolated staging overrides/custom environment.
- Supabase has healthy production Final-store `zeuhfqevqjkbzwdaxjuv` and an inactive,
  unverified project; the production project's branch list is empty.
- Local checked credential names are missing; no `.env.staging` was found.

**Ordinary READY previews are production-connected, not acceptance sandboxes.** No
synthetic creation/upload/publication through those previews is authorized or performed.

## Staging: blocked and exact setup requirements

Provide a separately approved dedicated Supabase staging project or full local Supabase
stack with PostgreSQL, PostgREST, Auth and Storage—not only the networkless PostgreSQL unit
of integration. Use synthetic records and independent auth users/redirects. Confirm a
strict allowlisted non-production project reference; hard-deny production ref
`zeuhfqevqjkbzwdaxjuv` regardless of URL spelling. Never infer isolation from a branch name.

Provide separate staging server/anon credentials, ADMIN_TOKEN, CRON_SECRET and media
credentials. Both potential upload destinations must be isolated: Cloudinary and the
fallback Supabase product-images bucket. Staging storefront/admin/revalidation/proxy
origins must point only to staging. Omit live PostEx, Sheets, Resend, WhatsApp/Twilio and
advertising credentials; use explicit sandbox/test endpoints where required.

The existing `scripts/verify-inventory-rpc.ts` is a deferred stub, **not acceptance
evidence**. Its optional-file exact-URL comparison is insufficient to prove isolation.
Do not run it as a substitute for the allowlist/auth/provider checks above.

After approved staging setup and migration, test actual authenticated admin HTTP routes:
create/edit, upload association, save/reopen, publish, collection replacement/reorder,
variants, explicit/null inventory, stale revisions and rollback. Test direct PostgREST RPC
signature discovery and permissions (anon/authenticated denial, service-role success),
schema-cache refresh and missing-RPC fail-closed behavior. Correlate HTTP 409/503 responses
with unchanged database state. These HTTP/Auth/Storage acceptance tests remain blocked
until isolation is demonstrated; PostgreSQL tests do not certify them.

## Native upload: reproducible manual acceptance

Run only against the verified staging environment above. Prior browser-tool attempts
denied the canonical permitted-workspace fixture path; no bypass is allowed.

1. Place an approved synthetic PNG/JPEG within the browser tool's actual allowed root;
   record its path, size and hash. Do not use customer media.
2. Open staging product creation; choose Photos → Upload File using the native picker.
3. Observe pending/progress, disabled save/publish, real upload HTTP status and provider
   response. Confirm the resulting object belongs only to staging storage/provider.
4. Verify image preview and dimensions; save, reopen and confirm the association persists.
5. Add a second synthetic image, move up/down, save/reopen and verify stable order.
6. Publish and inspect only the staging storefront image/variant association.
7. Test invalid/oversized bytes, provider rejection, slow/aborted upload and uncertain
   response. No blind retry, duplicate publication or false saved baseline is acceptable.
8. Remove an association and confirm shared media bytes remain; use only reference-aware
   staging cleanup for the exact test objects after acceptance.

Record browser/device, fixture hash, request results and persisted state. A mock response,
URL paste or unit test is not native picker-to-provider acceptance.

## Coordinated rollout proposal — separate approval required

1. Finish all isolated staging and exact-final-commit gates. Record draft dependencies,
   migration checksums, reviewed source SHA and immutable matching deployment IDs.
2. Inventory **all** old catalog writers: production routes, immutable previews sharing
   production bindings, stale sessions and direct scripts. Browser refresh alone is not
   a cutoff. Obtain approval for deployment/route-specific catalog-write protection.
3. Preserve checkout, tracking, cancellation, fulfillment, courier sync, webhooks and
   in-flight orders. Do not stop the whole admin service, globally revoke service-role
   table privileges or rotate shared ADMIN_TOKEN/CRON_SECRET just to pause catalog edits.
   Those secrets also support cross-app revalidation and order/courier operations.
4. Back up and verify recovery. Under separate exact-target approval, apply the reviewed
   ordered migrations transactionally with bounded lock/statement timeouts. Allow existing
   order transactions to finish; do not kill them. On lock timeout abort/reassess safely.
5. Refresh PostgREST schema cache (`NOTIFY pgrst, 'reload schema'` in the approved migration
   workflow), inspect exact function signatures/grants and test fail-closed behavior.
6. Activate only matching reviewed source, keep old catalog writers inaccessible, verify
   DB/HTTP/auth/cache contracts and then explicitly approve reopening catalog edits.
   Existing cache invalidation is asynchronous; a commit alone does not prove fresh pages.

### Rollback/recovery

Before migration: abandon the rollout without changing production. A transactionally
failed migration must leave the prior schema intact; verify that fact before retrying.
If schema commits but application activation fails, keep catalog writes closed, retain
the additive schema and roll forward or use a separately verified compatible writer.
PR28/legacy publishing is **not** a safe writer rollback. Never restore unsafe RPC grants.

Keep checkout/courier/order services running. Do not restore an old whole-database backup
over newer customer orders. Such recovery requires a separate incident approval and
order reconciliation. No compatible rollback deployment has yet been certified.

## Evidence ledger

- Full local `npm run ci`: exit 0, **1056/1056** tests, both linters (no ESLint
  warnings/errors), both typechecks and both builds. All ten storefront JS/CSS budgets
  passed separately. Existing Next 15 CLI deprecation notices are not hidden.
- Source checkpoint `0c9612b6a888df6142eb8527b97b2be9d461d167`: [GitHub run
  40075325934](https://github.com/ecommercestore872-crypto/voltgear/actions/runs/40075325934)
  succeeded with the full application gate and **44 real PostgreSQL scenarios** plus
  migration-version uniqueness. The first disposable run caught a migration parser
  ambiguity; it was corrected before this successful run. Local Docker remains stopped,
  so no local PostgreSQL success is claimed.
- The 22 retained PR29 scenarios cover real checkout/cancel/review approval versus
  publication. The 22 added scenarios exercise real independent connections/observed
  lock waits or explicit NOWAIT conflicts, same-collection stale tabs, reordered member
  sets, concurrent deletion, inverse physical child order, slot ownership/vacancy ABA,
  auto pins, role grants, revision spoof prevention and injected INSERT/DELETE rollback.
  Transaction-returned ordered snapshots are checked against committed state.
- Actual Chromium in an isolated context at **390px mobile** rendered the real collection
  and product components with synthetic, intercepted transport. Collection reorder made
  the form dirty; Save retained order and advanced expected revisions `0` then `1`.
  Product membership removal sent `collectionIntent.adjust.expectedRevision=0` with the
  desired empty set. Both pages had scroll width 390px, no page overflow. Console
  error/warning checks were empty. These are client regressions, not HTTP/provider proof.
- Native Photos Upload File was attempted with existing `public/favicon-512.png`;
  canonical path access was denied by the browser tool. SHA256:
  `1DECBAC21D8C934CC3B7D4502D59CACCCB76399C5D95F823CA64E1DAD5E2ECDF`.
  No selection or upload occurred. Further browser checks were interrupted by the
  approval service's usage limit; after resumption, browser transport was closed.
  Current desktop, Keep live button, browser conflict/reload and provider acceptance
  are not claimed from this run (unit tests cover their client logic).
- The owned localhost fixture server was stopped, the fixture source/cache removed,
  and Next-generated config/type edits restored. No fixture was committed or deployed.
- Vercel's green GitHub checks were independently inspected: both SQL-only checkpoint
  previews were actually **CANCELED** by ignored-build scope. This is not READY evidence.
  Exact-final-commit preview-only rebuilds and actual readiness must be recorded on the
  draft PR; do not mistake a skipped/canceled check for acceptance.

### Approval manifest (not approval itself)

Read-only migration metadata on 2026-10-24 shows production history through
`20261027000000_storefront_read_indexes`; neither prepared migration28 nor29 is listed.
Only migration metadata was read; no production migration or data mutation ran.
Recheck immediately before any separately approved rollout; if migration28 has since
been applied, do not amend/reapply it—prepare a forward migration and repeat verification.

- Database: Supabase Final-store, `zeuhfqevqjkbzwdaxjuv`.
- Vercel team: `team_fcsXz74VGCxgnrYKGnOsSfLG` (`hassaans-projects-e3451522`).
- Storefront: `voltgear`, `prj_gHAuBl5SMG1FnJ45GeinQN2gNGnB`, root `apps/storefront`.
- Admin: `voltgear-admin`, `prj_LgVWqruDirgQKMPgDgH0zpHtrC6K`, root `apps/admin`.
- Ordered migration28 SHA256:
  `3ED0B3A4CB7DB6C5ACCEF962A3696CA46A035DCAF528C699761F884D000E8577`.
- Ordered migration29 SHA256:
  `C54B95DEEF2FA84E4B73A96E6243B7A638F8BC5EDD4921E742ABCE7F2406725A`.
- Draft dependency order: PR29 → PR30; all earlier draft dependencies must be reviewed.
  The final source SHA, exact-head CI run and immutable preview build IDs are recorded
  on PR30's final verification note. No production rollout approval is requested until
  isolated staging, upload and compatible recovery gates have passed.
