# Session v2 rollout and recovery — approval procedure

Prepared on 2026-10-26. **This is a procedure, not production authorization.**
Only local synthetic acceptance has been executed. Keep every PR draft. No remote
push, hosted configuration change, migration, merge or deployment is authorized.

## Latest independent release review — 2026-10-26

**NO-GO for production.** Read-only GitHub review found PRs28–30 still draft,
open and unmerged; PR30 head is `9d0692ace7fbc7b8af52c8a21704374611061036`.
The local candidate descends from it. A focused follow-up targets
`codex/collection-integrity-acceptance`; dependency PRs remain draft. No workflow
runs or commit statuses were returned for local HEAD
`d998d3426a3451c08d95e85de350c5336fe24b1d`. This is not remote CI success.

The workflow triggers non-main work through pull requests, not branch push alone.
Its PostgreSQL job exercises migrations28/29, not the real Auth/session migration30.
Future green CI must be paired with preserved full-schema local Auth evidence;
it does not certify hosted Auth schema compatibility. Bind the final candidate SHA
to actual compiled artifacts/CI before release; stable BUILD_IDs alone do not prove
which source commit compiled the existing local artifacts.

All scoped deployment/alias/domain and project reads for both permitted Vercel
projects returned403. A scoped CLI fallback also failed. Current deployment IDs,
old URLs, protection exceptions, effective plan and a distinct compatible recovery
deployment are **unverified**, not absent or protected. Do not switch accounts,
alter permissions or probe unrelated projects to bypass this access boundary.

The two saved five-group local recovery reports pass on the same BUILD_IDs. They
verify restoring writer availability with the same binary and retained schema;
they do not select or test a different application rollback candidate. The earlier
transient503 remains undiagnosed. Independent read-only review also recomputed
the local session benchmark and confirmed its arithmetic; see
`SESSION_PERFORMANCE.md` for contention, artifact-provenance and cleanup limits.

### Hosted approval manifest — required fields, currently incomplete

| Item | Required evidence before execution |
| --- | --- |
| Allowed team |`team_fcsXz74VGCxgnrYKGnOsSfLG`, `hassaans-projects-e3451522`|
| Existing storefront |`voltgear`, `prj_gHAuBl5SMG1FnJ45GeinQN2gNGnB`; current deployed IDs/aliases unknown|
| Existing admin |`voltgear-admin`, `prj_LgVWqruDirgQKMPgDgH0zpHtrC6K`; current deployed IDs/aliases unknown|
| Database |`zeuhfqevqjkbzwdaxjuv`; fresh read-only history/schema/grants/Auth compatibility check pending|
| Candidate |Final source SHA, exact CI run/jobs, both immutable deployment IDs, roots/environment mappings|
| Retired entry points |Every immutable/branch URL, alias, storefront proxy, protection exception and share path; record identifiers, never tokens|
| Restriction/drain |Exact host/path/project actions, maintenance interval, in-flight-write criterion and before/after access results|
| Integration preservation |Checkout/tracking/cancellation, `/api/cron/postex-sync`, `/api/messaging/*`, `/api/webhooks/resend`, `/api/indexnow`, revalidation and courier paths|
| Schema |Ordered reviewed missing migration names/hashes, lock/statement timeouts, transactional failures, grants and schema-cache refresh procedure|
| Recovery |Distinct tested v2 deployment and environment/cron/alias compatibility, or explicit restricted-admin fix-forward procedure|
| Reopening |Native browser media, hosted session latency and approved commerce/auth/integration smoke evidence|

Current [Vercel protection documentation](https://vercel.com/docs/deployment-protection)
distinguishes Standard (excludes production domains), All Deployments (includes
them) and legacy preview-only coverage (leaves past production deployments).
Do not infer old URL closure from preview protection. Project-wide admin protection
may also block machine integrations before app middleware; inventory first and
approve precise treatment. No team-wide or whole-storefront restriction is proposed.

[Instant Rollback](https://vercel.com/docs/instant-rollback) restores the target's
original environment and cron definitions. Verify both plus domain/alias bindings
when selecting a recovery target. No such hosted target has been verified here.

Preparing isolated HTTPS resources is separately proposed in
`ISOLATED_HTTPS_PROPOSAL.md`. It is not permission for this production manifest.

## Compatibility and dependencies

The candidate requires the complete repository migration history, including:

1. `20261028000000_product_integrity_v2.sql` — authoritative product editor writers.
2. `20261029000000_collection_integrity.sql` — coherent collection writes/snapshots.
3. `20261030000000_admin_browser_sessions.sql` — new session table, three service-only
   RPCs and an identity-change trigger on `auth.users`.

Session migration SHA256:
`51B5B287ECA1B5112611CF03D0D9E3A7CDAA91D27D505A8E8519C60173288748`.
The first two migration bytes remain unchanged. The new migration adds no commerce
column and updates no existing catalog/order row. Its Auth trigger updates only new
browser session rows on security-relevant identity changes. Normal sign-in timestamp
updates do not revoke sessions. Actual local password, ban, email and sign-out tests
verify behavior against the installed Auth version; future Auth schema changes need
compatibility review because this implementation references `auth.users/sessions`.

The v2 application rejects legacy cookies and refuses browser access if the session
RPC is missing/unavailable. It does not fall back to static cookies or legacy product
writers. Existing correctly prefixed machine bearer credentials keep their behavior.
Shared production secrets must not be rotated as an incidental release step.

Browser credentials are random per login, hashed at rest, server-expiring after at
most eight hours, and individually revoked on logout. Password/email/ban changes
permanently revoke existing rows; deleting Auth sessions invalidates their linked
browser sessions. Browser password self-service targets the authenticated user.
Password-only shared-secret browser login is deliberately removed; existing
allowlisted, confirmed Supabase identities must be verified before rollout.

## Required evidence before asking for production approval

- Record the exact candidate commit and migration hashes. Obtain separate approval
  to push a focused **draft** branch; wait for CI on that exact head.
- Complete permitted native image selection, preview/reorder, save/reopen/publish,
  storefront rendering and Browser Back/stale-editor acceptance. HTTP media tests
  do not substitute for browser acceptance or cross-device Safari testing.
- Re-read the intended production migration history and schema read-only; the
  earlier observation ending at migration27 is historical, not a current assertion.
- Inventory existing admin identities and allowlist by identifiers only, with no
  secret/password exposure. Validate SMTP/reset redirects separately if needed.
- Prepare an exact hosted action manifest limited to Supabase
  `zeuhfqevqjkbzwdaxjuv`, Vercel `voltgear-admin` and `voltgear` under
  `hassaans-projects-e3451522`. Do not change team-wide settings or other projects.
- Identify every reachable old admin deployment, preview, generated URL and alias
  that has production-backed secrets, plus storefront rewrites reaching it.

## Important: retired admin binaries remain unsafe

An old permanent-cookie binary never calls the new session RPC. Applying SQL or
changing the main alias cannot revoke its static cookie. Existing deployment URLs
can remain reachable, and environment changes do not update previous deployments.
See [generated URLs](https://vercel.com/docs/deployments/generated-urls),
[environment variables](https://vercel.com/docs/environment-variables) and
[deployment protection](https://vercel.com/docs/deployment-protection).

Propose and obtain approval for project-scoped protection/retirement of old admin
entry points before exposing v2. Check plan availability, all aliases, protection
exceptions and machine integrations first. Never enable team-wide protection that
could affect unrelated sites. Keep public storefront checkout/tracking available.
The exact hosted protection/drain approach is pending inventory and approval;
no local test certifies that old hosted URLs have been closed.

## Approval-controlled execution order

1. Approve the exact target, migration list/hashes, candidate build, old-deployment
   protection/drain actions, bounded admin maintenance period and recovery target.
2. Restrict/drain only old admin entry points and their storefront proxies. Allow
   in-flight admin writes to finish. Do not stop shopper checkout, cancellation,
   tracking or courier work. Confirm no old writer remains externally reachable.
3. Apply only reviewed missing migrations in order, each transactionally; inspect
   outcomes and grants. On failure keep admin restricted and investigate. Do not
   mark a failed migration applied or restore unsafe writer privileges.
4. Activate the approved matching app builds and aliases. Force fresh admin login;
   legacy browser cookies should receive401/redirect. Verify copied-cookie denial
   after logout, account change invalidation and bearer integrations.
5. Verify catalog read/write isolation, stale409 behavior, media, shopper checkout,
   cancellation, review moderation, courier/tracking and cross-app invalidation.
   Production synthetic writes need separate scope approval; use authorized
   fixtures/account procedures, never real customer data as test material.
6. Remove temporary admin restrictions only after required smoke checks pass.
   Keep retired insecure binaries inaccessible. Capture exact deployed IDs and
   outcome without exporting secrets or raw customer data.

## Recovery

Do not roll back to `b107690` or another static-cookie binary. Vercel Instant
Rollback restores a previous deployment and its original environment; inspect the
[rollback behavior](https://vercel.com/docs/instant-rollback) before selecting one.
Recovery must use a separately verified v2-capable build compatible with the
retained additive schema, or keep admin access restricted while fixing forward.
Do not drop session tables, disable identity revocation, regrant unsafe product
writers or undo inventory/order state. Shopper services should continue on their
compatible schema while only admin access is restricted.

`scripts/local-staging/release-acceptance.mjs` exercises local production builds,
transactional failure rollback, safe-writer unavailability/restore, session replay
denial and warmed PDP publication visibility. It records BUILD_ID values unchanged
through the drill. It does **not** perform hosted traffic shifts or certify Vercel
protection. Consult its observed results before claiming these gates passed.

## Operational limits

Session validation makes uncached authoritative checks (middleware and route), up
to two extra database roundtrips per API. No positive cache masks revocation. This
tradeoff prioritizes correctness; hosted latency has not been measured. Session
retention/cleanup is not automated by this change.

The local paired benchmark now measures a21.669ms median increase for cookie over
bearer requests in this build, with43.900ms sample p95 increase. These figures are
local diagnostic observations under heavy host contention, not hosted latency or
an old-vs-new browser-auth comparison. See `SESSION_PERFORMANCE.md`.

Environment allowlist removal denies requests in the new configuration. Re-adding
an identity can allow an otherwise unrevoked session before expiry; permanent
removal must include an approved session revocation/account-disable operation.
Old deployments carrying an old allowlist require the protection/drain step above.

The local HTTPS test certificate is trusted only by explicit test clients/child
Node processes, expires after one day and never enters Windows/Chrome trust stores.
Browser acceptance needs an approved trusted browser origin and permitted file
path. Do not disable TLS checks, bypass file-picker access controls or relax the
production HTTPS URL validator to complete testing.
