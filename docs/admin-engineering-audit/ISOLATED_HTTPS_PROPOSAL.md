# Isolated HTTPS browser acceptance — approval proposal

## Review update — local solution takes priority

The user's2026-10-26 review request supersedes hosted staging as the recommended
next step. See `LOCAL_HTTPS_FREE_REVIEW.md` for verified local capabilities, native
single-file selection, supported MCP root authorization, temporary Current User
certificate trust, manual steps and actual versus published quota information.
Use the existing local Docker/Supabase/browser first, subject to explicit temporary
trust/harness approval. No hosted resource is necessary for that acceptance path.
The original hosted proposal below remains an unapproved fallback if the local
path proves unavailable; do not execute it based on this document or local approval.

Prepared 2026-10-26 at the user's request. **Proposal only.** No resource, remote
database, deployment, credential, permission or trust setting has been changed.

## Purpose and recommended route

Finish native product-image selection, upload, preview, save, reload, publishing
and storefront image rendering with browser-trusted HTTPS and synthetic data.
Use a separate Supabase staging project and two staging-only Vercel projects with
provider-issued HTTPS, subject to the access, cost and exact-target gates below.
This is additional scope requiring approval; the existing authorization covers
only planning and local work, not creation of these resources.

Separate staging resources follow the providers' environment model. An ordinary
preview is not proof of database isolation; configuration must point only at the
new staging backend. See [Supabase environments](https://supabase.com/docs/guides/deployment/managing-environments)
and [Vercel environments](https://vercel.com/docs/deployments/environments).

## Current blockers and verified boundaries

- Chrome rejected the local media certificate with `ERR_CERT_AUTHORITY_INVALID`.
  Explicit Node CA trust made HTTP media tests possible but does not establish
  browser trust. No certificate-warning click-through or validation bypass is allowed.
- Native upload denied the fixture paths outside its permitted workspace roots.
  Attaching the existing checkout through Codex returned “not a managed worktree.”
  Opening the correct project/browser workspace or operator-granted exact fixture
  access is required; copying into guessed roots is not a solution.
- Scoped Vercel inventory reads returned403. Current project settings, effective
  protection, deployment aliases, quotas and billing capacity remain unknown.
  No hosted staging origin has been verified available.
- Current application builds passed local checks; native media acceptance and
  exact final-head remote CI remain incomplete. No production migration is approved.

## Proposed resource manifest — not yet created

| Resource | Proposed identity | Gate |
| --- | --- | --- |
| Supabase staging |`buyntry-acceptance-isolated`|Owner must confirm organization, region, plan/quota and new ref; never production ref `zeuhfqevqjkbzwdaxjuv`|
| Vercel staging admin |`buyntry-acceptance-admin`|Confirm new project ID in team `hassaans-projects-e3451522` (`team_fcsXz74VGCxgnrYKGnOsSfLG`)|
| Vercel staging storefront |`buyntry-acceptance-storefront`|Confirm new project ID in the same approved team|
| HTTPS endpoints |Provider-generated domains for these new projects and the new Supabase ref|Record exact URLs, certificate validity and redirect destinations before use|
| Source |`codex/isolated-staging-certification`, pinned reviewed commit|Draft only; CI and dependency chain recorded before testing|

Names are proposed, not proof of availability or ownership. No production domain,
DNS, alias, current `voltgear`/`voltgear-admin` setting or unrelated project is to
be altered. Reusing an existing verified isolated environment may replace this
manifest only after the owner confirms its exact IDs and configuration.

**First-deployment exception:** Vercel's current documentation states a new
project's first deployment uses its Production environment even with a preview
target. Approval must explicitly permit that first deployment **only inside the
new staging-only projects**, with staging credentials in every applicable scope.
It must never promote or alias the existing live projects. Without this exception,
do not create/deploy the proposed new projects. See
[Vercel first deployment](https://vercel.com/docs/deployments/environments#first-deployment).

## Isolation and configuration review before execution

1. Restore read-only access to the two permitted existing Vercel projects or obtain
   owner-provided settings evidence. Verify team identity and preview triggers;
   pushing/creating a draft PR can trigger existing Git-connected deployments.
   A draft label is not a deployment safeguard. Do not push until that behavior and
   its allowed effects are explicitly settled without changing live settings.
2. Verify available staging quota and a written incremental-cost estimate. Proposed
   spending limit is **USD0 additional charges**. This is a requested limit, not a
   guaranteed provider-enforced cap. If available quotas/protection/usage controls
   cannot support it, stop before provisioning and present a specific quote for
   separate approval. Do not upgrade plans or enable paid add-ons.
3. After a name/organization/region/cost-scoped creation approval, create only the
   proposed empty resources. New Vercel projects must initially be disconnected
   from Git, without import/build hooks or automatic deployments. Record their
   generated IDs and obtain the second exact-ID execution approval before schema
   application or any deployment. If the creation interface cannot create a project
   without a deployment, stop and revise the proposal before using it. Generate new staging credentials,
   service keys, machine/revalidation tokens and a synthetic admin identity. Do not
   copy live `.env`, database snapshots, accounts, orders, Storage or provider keys.
   Store secrets only in approved provider scopes/private transient inputs; report
   variable names and target identifiers, never secret values.
4. Review all64 repository migration files for hosted compatibility, outbound
   effects and grants; record their ordered names/hashes in a new-project action
   manifest. Explicit remote approval must identify that new ref and full manifest.
   Apply only there. Do not link the production project or repoint the existing
   loopback harness: its local-only guards remain intact. Use a separately reviewed
   staging runner if remote synthetic writes are needed. No automatic retry/reset
   after unexpected schema drift.
5. Configure only new-stage URLs for Supabase, admin, storefront, proxy/revalidation,
   Auth redirects and image origins. Inspect application outbound paths and fail
   closed on missing staging configuration. Disable live email, Sheets, courier,
   messaging, analytics/ads and scheduled effects in the new resources; copy no
   production integration credentials. Review cron/build hooks before first build.
6. Before the first deployment, configure staging-only environment values, disable
   outgoing effects/build hooks/cron and protect both new app projects with approved
   team access and authentication. Do not connect Git or launch a deployment until
   these settings are verified against the recorded new IDs. Immediately after the
   first approved deployment,
   verify unauthenticated access is denied on every generated/branch/domain URL.
   Do not add anonymous share links or broad protection exceptions. Confirm
   server-to-server revalidation/proxy paths still work with the approved protection
   method before acceptance. If they do not, stop for a narrow reviewed approach.
   Do not enable paid Password Protection or change team defaults. Provider
   protection choices and coverage must be verified, not inferred from a badge.
   See [Vercel protection scopes](https://vercel.com/docs/deployment-protection).
7. Permit only these native browser fixture reads in the correct workspace:
   `D:\e commerce store (1)\.worktrees\admin-efficiency\tmp\isolated-staging\synthetic-https-0.png`
   and `synthetic-https-1.png` in the same directory. Alternatively the operator may
   select those files manually in the authorized native picker while the flow is
   observed. Do not change OS/browser trust stores, TLS options or permission checks.

## Acceptance and stop conditions

Pin source SHA, actual deployed IDs, staging ref, schema manifest and browser
version. Verify trusted TLS without warnings on apps and media, reject unexpected
redirects, and verify no app points at production before any sign-in/write.

Use the existing sequence in `LOCAL_BROWSER_ACCEPTANCE.md` with approved staging
origins substituted deliberately: two fixture selections → actual uploads → decoded
previews/reorder → save → reopen/hard reload → publish → both storefront images
decode at390px and1440px → stale-editor409 → invalid/oversized/interrupted upload
handling → shared-media deletion409 → logout/Back/protected-request denial.
Record network statuses, hashes, persisted fields and console findings without
credentials. Chrome mobile emulation does not certify physical Safari.

Measure session overhead on these same pinned staging builds separately from UI
timing; record regions, sample method and resource limits. Stop on unknown target,
production URL/key, unexpected external effect, protection failure, TLS/file denial,
cost uncertainty, schema drift or data-integrity regression. Never weaken validation
to turn a failed gate green.

Retain test evidence and fixtures; revoke staging browser sessions at the end and
leave new staging access restricted. Any resource deletion needs an exact cleanup
manifest and separate approval. Do not promise that an idle hosted database is free.

## Exact approvals still required

1. **Browser access:** operator authorizes the exact two fixture reads or performs
   the native selections, using the actual checkout as the browser workspace.
2. **Staging creation:** after access/quota review, approve only the proposed names,
   organization/region, cost bound and empty/disconnected project creation. Generated
   IDs cannot be approved before they exist. Once recorded, obtain a second approval
   for those exact IDs, ordered migration hashes, staging-only credentials,
   protection/configuration actions and the first-deployment exception above.
   No schema application or deployment is included in creation-only approval.
   This proposal's preparation is not approval to execute either phase.
3. **Git publication:** approve the exact final local commit's push and a focused
   **draft** PR targeting `codex/collection-integrity-acceptance`, including only
   explicitly approved automatic preview effects. No merge or live deployment.

Production database migrations, old-admin protection, rollout and rollback traffic
changes remain separate later approvals under `SESSION_V2_RELEASE_RECOVERY.md`.
