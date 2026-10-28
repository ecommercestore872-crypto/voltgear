# Compatible admin rollback plan — prepared, not executed

Later same-day [local follow-up](LOCAL_RELEASE_PREPARATION_2026-10-28.md) records
an executed distinct local A→B drill. The earlier plan/status below is retained;
hosted deployment/environment/traffic rollback remains unverified and approval-gated.

2026-10-28. **Rollback readiness: NO-GO.** No distinct known-good secure
application target has been selected and exercised. The recorded local drills
revoke/restore writers while retaining the same binaries. They validate
fail-closed recovery, not a different-build or hosted traffic rollback.

This document is a validation plan, not permission to change deployments,
credentials, access protection, database schema/data or production traffic.
See [the release review](PRODUCTION_RELEASE_READINESS_2026-10-28.md).

## Compatibility matrix

| Target | Schema/session/writer requirements | Release use |
| --- | --- | --- |
| Legacy permanent-cookie binary, including `b107690` | Does not consult new session RPC; may use legacy RPCs/direct table writes. | Forbidden rollback target. New SQL/main alias changes do not fix its cookie path. |
| Original local admin `1-LdQDvIe901cfKWAaelX` | Historical Auth/media evidence; reproduced rendering errors. | Preserve evidence; not a certified rollback. |
| Intermediate DCL-only admin `41I41VZIDZWdtmkVBu7BO` | Hydration regression failed. | Forbidden normal recovery target. |
| Current admin `FEF0cc4t51VthUMaOCSpQ`, shop `ODfejI3iW0q0o3XVK7zj1` | Complete reviewed migrations through30; v2 sessions/product writers and compatible collection snapshots; final source commit/authenticated acceptance pending. | Current candidate; rolling back to itself is not distinct rollback validation. |
| Future distinct target B | Independently verified v2 sessions, writer/collection revision semantics, media safeguards and retained additive schema; matching environment/cron/aliases/integrations. | Eligible only after the drill below passes and exact IDs are approved. |
| Restricted-admin fix-forward | Retain safe schema and data; close unsafe admin entry points; verify shopper compatibility separately. | Conservative recovery if B is unavailable. Restriction and fix-forward deployment still need approval. |

Keep additive migrations and all newer orders, inventory, review moderation,
collection membership and media references during application rollback. Never
drop the session schema, disable revocation, accept legacy cookies, restore unsafe
writer grants or restore an old database backup as the undo for an app release.

## Required immutable recovery record

Record A (candidate) and B (distinct recovery target) separately:

- Source commit and source/dependency/SQL hashes; matching BUILD_IDs and test runs.
- Exact allowed Vercel team/project/deployment IDs, generated/branch/custom URLs,
  alias bindings, protection exceptions and retired entry points.
- Environment **names, presence, source scope and compatibility only**. Never put
  secret values, cookies, bypass URLs or keys in evidence.
- Cron definitions and machine integrations: checkout, cancellation, tracking,
  courier/revalidation, `/api/cron/postex-sync`, `/api/messaging/*`,
  `/api/webhooks/resend`, `/api/indexnow` and relevant storefront admin proxies.
- Migration history, RPC signatures/grants, schema-cache behavior, selected runner
  identity/version, transactional/history semantics and measured timeout budgets.
- Scoped maintenance/drain criteria, recovery decision owner, measurable reopen
  criteria and fixture/account cleanup procedure.

[Vercel Instant Rollback](https://vercel.com/docs/instant-rollback) restores the
target's original configuration, including environment and cron definitions.
[Environment edits](https://vercel.com/docs/environment-variables/managing-environment-variables)
apply to new deployments, not previously created deployments. Changing today's
settings therefore does not establish compatibility or retire older binaries.

## Isolated validation required before approval

Use a disposable synthetic local Supabase database/Auth/Storage and the authorized
Windows browser environment. No production URL, credential, customer data or
production-connected preview is a test target. Keep TLS validation and file-picker
permissions intact. Any temporary Current User trust needs a separately recorded
exact certificate/fingerprint and exact-certificate removal, preserving prior evidence.

1. Build immutable A and a genuinely distinct B. Assert v2 session/product/
   collection contracts on both, and ensure their artifacts match recorded source.
2. Apply the actual reviewed migration history through the chosen runner. Inject
   controlled failure into disposable executions of the actual files at multiple
   stages; verify catalog/schema/grants/history rollback and bounded lock behavior.
   Migration30 is self-wrapped;28/29 need explicit verified runner treatment.
   Do not mutate reviewed source files or count a synthetic table probe as this gate.
3. On A, create synthetic content/media, sell stock, cancel an order, moderate a
   review and change manual collection membership. Capture identities, revisions,
   stock, ratings/aggregates and media references without real customer material.
4. Restrict/drain only the synthetic admin surface, then switch to B. Verify all
   recorded data/revisions remain intact. Exercise stale drafts, inventory conflicts,
   review approval, coherent collection membership, save/publish and media deletion
   safeguards. Confirm shopper checkout/cancellation/tracking remain compatible.
5. Confirm legacy cookie denial; fresh v2 login success; logout/revoked-cookie replay
   denial; identity/Auth-session revocation; expected machine integrations. Only
   synthetic accounts may be changed in this drill.
6. Simulate missing/unavailable safe RPCs. Both applications must fail closed,
   without legacy writer or cookie fallback. Restore only expected safe availability.
7. Run final-build trusted native image selection/upload/preview/save/reload/
   publish/storefront acceptance and hydration checks. Measure cookie/API latency
   on the actual recovery candidate; preserve all errors and clean owned resources.

Record distinct-build IDs and actual switch evidence. Repeating the same build
under a different process name does not establish a compatible application rollback.
Hosted URL/protection/cron behavior requires separate approved hosted verification.

## Proposed production recovery sequence — approval required

1. Trigger recovery on verified auth/integrity failure or an agreed availability/
   latency threshold; preserve sanitized diagnostics and current migration history.
2. Apply the preapproved exact admin restrictions and drain in-flight admin writes.
   Do not blindly stop shopper services or introduce a broad integration bypass.
3. If verified B exists, activate only its approved deployment/environment/alias
   tuple while retaining schema and business data. Otherwise remain admin-restricted
   and fix forward. An unverified older deployment is not a fallback.
4. Perform separately approved scoped smoke tests and check every retired URL,
   session denial, safe writer, commerce/integration path and media reference.
5. Reopen only on recorded pass criteria; keep insecure old binaries inaccessible.

**Unresolved fields:** distinct B/source/deployment IDs, accessible deployment
inventory, isolated switch/migration-failure evidence, effective protections,
compatible environment/cron mapping, measured lock/latency budgets and available
backup/restore safeguards. Until filled, this is a prepared strategy, not a
validated operational rollback capability.
