# Final product/collection integrity and staging acceptance

Base: draft PR29, `4dc2913c9caf8fc7ba7c12af594fe23ab3703f11`.
Decision: **NOT READY — BLOCKERS REMAIN** until the staging and native-upload gates below pass.
This follow-up is draft source, prepared migrations and synthetic isolated tests only.
No production database, credentials, settings, traffic controls or deployments were changed.

## Remaining-blocker follow-up — 2026-10-26

**Still NOT READY for production; proposal and draft PR are prepared locally.**
No session/security integration work was restarted. The completed checks recorded
below are retained evidence, not newly rerun or exact final-head GitHub CI.

- Added a guarded synthetic session performance runner and recorded actual local
  measurements in `SESSION_PERFORMANCE.md`:60 paired protected GETs, cookie median
  52.646ms, bearer30.409ms, paired increase21.669ms/sample p9543.900ms. Independent
  read-only review recomputed all pairs/rounds/RPC/SQL summaries. Heavy local host
  contention and unknown compiled-artifact/source binding prevent hosted or
  before/after performance claims. No authorization cache was added.
- That review found the benchmark runner did not gate success on cleanup. Its
  prepared correction now records runner hash, retained fixtures, logout outcome
  and owned-port release; cleanup failure makes the run fail. Syntax passes;
  corrected runner runtime acceptance remains pending because Docker is unavailable.
  Original runner/result hashes and qualified measurements are preserved separately.
- User requested an **isolated HTTPS proposal**, not provisioning. Prepared
  `ISOLATED_HTTPS_PROPOSAL.md` with separate staging resources, exact browser fixture
  permission scope, target/cost/schema/protection gates and the first-deployment
  Production-label exception confined to the proposed new staging projects.
  Native uploads remain blocked by file permission and browser certificate trust;
  no bypass/trust-store/hosted change was attempted.
  Independent review tightened two proposal gates: initially empty/disconnected
  projects must be protected/configured before first deployment, and name-scoped
  creation approval is separate from exact-generated-ID execution approval. The
  reviewer rechecked both corrections and reported no remaining blocker within
  that narrow document review; execution itself is still unapproved.
- Independent release review verified the PR30 dependency base and migration hashes,
  but scoped Vercel inventory calls returned403. Old-admin URLs, protection and a
  distinct compatible rollback target remain unknown. The two passing local drills
  recover the same build; they do not certify a different rollback candidate.
  `SESSION_V2_RELEASE_RECOVERY.md` now lists the required hosted approval manifest.
- Prepared `DRAFT_PR_ISOLATED_CERTIFICATION.md` targeting draft PR30's
  `codex/collection-integrity-acceptance`. No push or PR creation occurred. The
  workflow needs a PR for non-main CI; verify auto-preview effects before asking
  for exact-commit publication approval. Draft status does not suppress deployments.
- Original benchmark logout returned200. Later observation found no listening test
  apps on3300/3301/55421 and no private browser login-input file. Guarded Docker
  stop failed because its engine pipe was unavailable; final container state is
  unverified. No engine restart/reset, broad process kill or data/volume deletion.

Next approvals: exact browser fixture access; final isolated staging resource,
cost/configuration/migration manifest and staging-only first deployment; exact
commit draft push/PR including settled preview effects. These do not authorize
production schema, settings, deployments, credential changes or PR merges.

## Final-blocker implementation and acceptance — 2026-10-26

**Decision: NOT READY FOR PRODUCTION APPROVAL — browser media and remote release
gates remain.** The new user authorization supersedes the earlier request to approve
session implementation. Work continues locally from preserved `b107690` on
`codex/isolated-staging-certification`. No push/merge/deployment is authorized.

### Session security fixed and exercised against real local Auth

Unique256-bit `v2` browser credentials replace the permanent derived HMAC. Only
SHA256 credential digests enter the new service-RPC-only session table. Database
expiry is at most8hours, logout revokes the specific row, and validation checks the
current Auth user/session and server allowlist on every request without a positive
session cache. Legacy cookies and shared-password-only browser login are rejected;
existing machine bearer secrets are preserved, with no production rotation.

Password/email/ban/deletion/confirmation changes revoke existing rows permanently,
including ban/unban and email-change/reversal. Creating a browser session compares
the verified login user's `updated_at` under locks to reject an identity change
between password verification and session creation. Auth global sign-out removes
the linked session and invalidates its application cookie. Browser password
self-service now targets its own identity instead of the first allowlisted user.

Independent review identified the account-change ABA and login-creation race above;
both were fixed before applying/testing the migration. All97 authorization call
sites were converted to await the asynchronous check, with an AST regression guard.
Middleware and routes both fail closed. This adds authoritative DB roundtrips;
hosted latency/performance has not been measured or claimed improved.

Migration `20261030000000_admin_browser_sessions.sql` was applied **only** to the
owned local acceptance database, atomically with migration history registration.
Its SHA256 is
`51B5B287ECA1B5112611CF03D0D9E3A7CDAA91D27D505A8E8519C60173288748`.
The existing63 migrations/data/volumes were preserved. Migrations28/29 retain their
previous hashes; production schema/history was not changed or freshly inspected.

Real HTTP session acceptance passes13 grouped scenarios: unique hashed sessions,
expiry, logout copied-cookie401 with another session200, origin rejection,
legacy/malformed401, password change, ban/unban, email reversal, global Auth logout,
login-creation CAS, browser password self-service, public-role ACLs, unavailable
validation denial, and failed revocation503/no cookie clearing followed by successful
retry. Machine bearer access remains200 during browser-validator unavailability.

Browser testing additionally found that the shell swallowed logout errors and
always navigated away; it also retained protected pages in the Next client router
cache. The shell now requires an explicit successful logout result, retains the
editor with accessible retry feedback on failure, prevents duplicate submissions,
and performs a full navigation after confirmation to discard client route cache.
Focused tests cover failed/uncertain results and side-effect ordering. Final browser
confirmation of this follow-up is recorded with the final gate below.

Final independent review caught an additional client401 side effect: the shared
`adminFetch` cleared local state/navigated before the logout confirmation helper.
Logout now opts out of that automatic401 redirect; ordinary API requests retain
their original behavior. A regression executes the actual transpiled API wrapper
through logout with401 and503, asserting no clearing/navigation. The reviewer
rechecked the fix and reported no remaining security blocker in the assigned diff;
this is scoped source review, not hosted release approval.

### Completed integration evidence

| Gate | Observed result | Limit |
| --- | --- | --- |
| Complete local schema |64 actual migrations, original history retained | No schema shim or production SQL |
| PostgreSQL transactions/concurrency |44/44 scenarios pass; zero remaining injection hooks | Real sessions/lock waits; original fixtures retained |
| Session/Auth HTTP |13 grouped scenarios pass | Synthetic local accounts only |
| Commerce HTTP |13 groups pass | Concurrent checkout/publish/cancel/reviews, idempotency, final-unit oversell prevention, stale409 and local warm catalog invalidation |
| Original admin HTTP/Storage |9 groups pass after session conversion | Actual login/cookies, save/reopen, draft/live, origin/no-change, conflicts and byte roundtrip |
| Auth/PostgREST |6 checks pass | Signup disabled, anon401/authenticated403/service200/missing RPC404 |
| Actual HTTPS media API |4 groups pass | Two uploads200, explicitly trusted TLS+identical bytes, order/save/reopen/publish, invalid400/oversized413, shared unlink/delete409 preserves bytes |

The first replay attempt hit a duplicate historical fixed test slug. Test fixtures
now use per-run slugs/default names and an unclaimed home slot; only that run's
winning claim is released while collection rows remain. No prior fixture/volume was
deleted. Repeated cancellation can validly return200 from its idempotent RPC after
cached preflight, or409 from fresh preflight; tests require cancelled persisted state
and stock restored once. An unreviewed product's review count may be null or0; no
published reviews/rating are fabricated to make that harness pass.

The local TLS proxy binds only127.0.0.1:55421 and forwards to the verified local
Supabase API. Its one-day certificate is trusted explicitly by test clients/child
Node processes, using certificate verification; Windows/Chrome trust stores were
not changed. The production HTTPS validator remains strict. See
[Node certificate behavior](https://nodejs.org/api/cli.html#node_extra_ca_certsfile).

The final browser follow-up observed accessible retry feedback with the editor
retained after an actual failed logout transport. The temporary local validator
permission was restored and verified enabled. That browser request failed with
connection-refused after its owned20-minute test session expired; it is **not**
claimed as a browser401 test. Actual HTTP401/503 behavior is covered by the local
session suite and real-client-wrapper regression respectively.

### Browser evidence and exact media blockers

Actual UI login, create/save/reopen, two-tab stale409 feedback, publication and
database persistence were verified with synthetic product
`5f6de0d6-de89-4150-bd03-5814f92ff6da`, slug `browser-isolated-final-20261026`.
Published price2099 (after editing1999), cost300, inventory5, admin revision3 were
read back. Stale tab2199 could not overwrite2099. Mobile width390/document390 and
desktop1440/document1430 have no horizontal overflow. No successful image selection
or visual image rendering is claimed for this fixture; it contains no images.

Native tool error for
`D:\e commerce store (1)\.worktrees\admin-efficiency\tmp\isolated-staging\synthetic-https-0.png`:
**Access denied — canonical path is not within configured workspace roots.**
The browser also returned **ERR_CERT_AUTHORITY_INVALID** at the local TLS origin.
No permission copying/bypass, certificate-warning click-through, global trust-store
change, HTTPS relaxation or hosted resource was used. The same root restriction also
prevented saving a browser snapshot file. A tool screenshot was viewed inline.

[LOCAL_BROWSER_ACCEPTANCE.md](LOCAL_BROWSER_ACCEPTANCE.md) gives the exact permitted
fixture, trusted-origin prerequisites and manual selection → previews/order → save/
reopen/publish → storefront decode, interruption, shared-image and Back checks.
Chrome mobile emulation is not physical Safari certification.

The observed Next smooth-scroll advisory was corrected with the documented
`data-scroll-behavior="smooth"` attribute on both root layouts; CSS/responsive values
are unchanged. See [Next guidance](https://nextjs.org/docs/messages/missing-data-scroll-behavior).

### Release boundaries and remaining gates

[SESSION_V2_RELEASE_RECOVERY.md](SESSION_V2_RELEASE_RECOVERY.md) defines dependencies,
target scope, old-deployment drain/protection and compatible recovery. An old static
cookie binary never consults the new table: old admin generated URLs/previews must
be restricted separately before rollout. Rolling back to `b107690` or regranting
unsafe product writers is forbidden. Production approval must include exact missing
migrations, matching builds, only the two allowed Vercel projects and the old-admin
entry-point inventory. No hosted protections/drain/cutover has been executed.

Final verification is recorded below. An initial host VirtualAlloc failure was resolved
for application tests by bounding Node heaps. A typecheck raced dev-generated
`.next/types`; it must be rerun after app shutdown/build, not waived as source success.
Remote CI requires separate draft-branch push approval. No current-head GitHub CI,
production smoke writes, live provider delivery or deployed-fix claim is made.

### Final source/build verification and handoff

- **1084/1084** application tests pass,380 suites,0 failures. Six additional
  isolation contract tests pass. Fourteen focused logout/API-client outcome tests
  pass; these are included in1084, not additional application totals.
- Both workspace linters pass without lint findings; Next15's `next lint`
  deprecation notice remains. Both explicit typechecks pass after builds, resolving
  the earlier dev-generated-file race. Both production builds exit0 with stripped
  provider/production credentials; no live data was supplied to them.
- All10 storefront bundle budgets pass: shared JS550/620KB, CSS153/180KB;
  home112/145 and661/720, products34/145 and583/720, PDP119/145 and668/720,
  checkout5/145 and554/720KB (route-only/initial respectively). These are size
  budgets, not a new Lighthouse90+ or hosted-latency certification.
- The **five-group immutable local recovery drill passes twice serially**:
  authenticate/legacy denial; failed migration transaction leaves no probe table
  or catalog change; writer503/no-change then compatible recovery with unsafe
  writers still revoked; warmed built PDP reflects publication; logout copied
  cookie401. BUILD_ID values remain unchanged through both drills:
  admin `1-LdQDvIe901cfKWAaelX`, storefront `uUlRAKU1-Dmj0d1mhq514`.
- An initial built-app attempt returned503 during its broad first group while other
  checks were running. Boolean diagnostics confirmed Auth and browser-session rows
  had been created, not the precise failed subrequest/cause. No configuration/source
  fix was inferred. Subsequent status-instrumented serial drills passed twice.
  The initial transient cause remains unproven; do not conceal it or claim a
  diagnosed production availability improvement.
- Final **production-built browser** login succeeded. With the local validator
  EXECUTE permission temporarily denied, the actual logout request returned401,
  displayed retry feedback and retained the editor URL. Permission restoration was
  verified; retry succeeded and a full navigation led to sign-in. Browser Back then
  remained at sign-in. This supersedes the earlier transport-only follow-up above.
  Expected outage401/local HTTP→HTTPS prefetch errors and a pre-existing missing
  favicon404 are not presented as a clean-console certificate. No new hydration
  failure was observed. Browser media remains blocked as documented.
- A second independent source review identified the shared-client401 side effect,
  verified its correction and reported no remaining security blocker in the
  assigned diff. No reviewer certified hosted deployment protection or native media.
- Script syntax and `git diff --check` pass. LF/CRLF normalization notices remain.
  No production migrations, secrets, account changes, provider delivery, hosted
  settings, remote push, PR merge or production deployment were performed.

Detailed evidence remains ignored under `tmp/isolated-staging`: final unit/lint/
typecheck/build/budget logs, PG log, session/commerce/admin/Auth/media reports,
`release-first-success.json`, `release-results.json`, `release-repeat.log` and
`browser-final-state.json`. Do not publish credentials or the transient browser
login-input file. Hosted rollout/old-deployment protection, permitted native media,
trusted browser origin, physical-device acceptance and exact-head GitHub CI remain
uncompleted approval/acceptance gates. The next authorization is **draft-only push**
for remote CI and a separately scoped browser-permission/trusted-staging procedure;
production migrations/deployment still require their own exact-target approval.

Cleanup confirmed no listeners on3300/3301/55421 and no private browser login-input
file. The eight exact owned acceptance containers were stopped; every container,
volume and synthetic fixture was retained. Docker Desktop and unrelated workloads
were left unchanged. Resume the existing64-migration stack rather than cold-resetting
or reapplying the already committed local migration.

## Resumed isolated certification — 2026-10-25

**Current decision: NOT READY — BLOCKERS REMAIN.** This section supersedes the older
local-Docker-blocked status below, not the production-approval boundary.
Starting branch/commit were reverified as `codex/isolated-staging-certification`,
`acc35d7db31e4aeec1e9922522ce7d114c64f35f`; that commit is preserved in ancestry.
PR30 was rechecked OPEN/DRAFT at `9d0692ace7fbc7b8af52c8a21704374611061036`, based
on `codex/product-integrity-boundaries`. No remote push, PR mutation, merge or hosted
deployment has been performed. Any final-head GitHub CI remains pending push approval.

### Confirmed Docker cause, health and isolation

Docker Desktop4.82.0 / Linux Engine29.6.1, context `desktop-linux`, became reachable
through the exact local `dockerDesktopLinuxEngine` named pipe. Desktop status,
`docker version` Server and `docker info` succeeded. WSL2.7.10 reported its
`docker-desktop` distribution running; the two Ubuntu distributions were stopped.
That is not evidence that Ubuntu integration caused the problem.

Independent read-only log review found backend initialization failing in Docker's
Inference manager while accessing/removing its `dockerInference` socket at17:25:32
and17:30:04 PKT on October24. The daemon became ready at20:30:47 PKT that day.
The underlying socket/filesystem cause and what cleared it remain unknown. No
factory reset, prune, reinstall, restart of Windows/WSL, or shared-workload restart
was performed. [Docker troubleshooting reference](https://docs.docker.com/desktop/troubleshoot-and-support/troubleshoot/).

The ECR image CDN subsequently failed during a cold Supabase startup. The native
CLI now runs directly (not through a timeout-prone PowerShell/npm wrapper), with a
bounded cold-start allowance and a process-scoped official Docker Hub registry
override. No daemon-wide registry setting was changed. Diagnostic summaries strip
credential-bearing lines and signed URL queries; never share raw status/inspect
output or diagnostic bundles containing secrets.

The documented bridge loopback default did **not** constrain this Desktop engine:
actual published bindings were0.0.0.0. The guard stopped the owned database.
All eight original acceptance containers were retained, stopped and renamed;
explicit127.0.0.1 replacements were created using the same immutable images and
verified identical volumes. No volume/container data was deleted. Three CLI-injected
gateway configuration/TLS files were copied in memory from the retained original;
no secret archive or key values were logged. Actual bindings were then rechecked
for all eight services before writes. Recovery ledgers are in ignored staging tmp.
Cold startup now has a no-service, tmpfs-only binding probe and refuses to start real
services when the engine ignores loopback defaults; that new pre-start probe is
source/syntax checked, not a second completed cold-stack replay.

Local API is exactly `http://127.0.0.1:55321`; DB55322, Studio55323, captured mail55324.
Each write harness checks project/workdir ownership, all eight containers, exact
configuration/migration hashes, actual loopback ports, full applied history and
Auth/Storage health. It rejects production ref `zeuhfqevqjkbzwdaxjuv`, inherited
provider credentials and application dotenv files. Local apps used3300/3301 only.
This network is **not an egress firewall**; absence of live provider credentials and
positive local targets are evidenced, not a blanket air-gap guarantee.

### Full migration replay and actual integration results

All **63 actual migrations** were replayed into the new local Supabase volume.
The database's ordered migration-version list matches the complete source/staged
manifest. No bootstrap or schema shim was used. Prepared migration28/29 bytes and
SHA256 hashes remain unchanged from the approval manifest; no SQL source repair or
production migration was required.

| Gate | Observed result | Scope/limit |
| --- | --- | --- |
| PostgreSQL transactions | All44 retained scenarios passed on the full63-migration schema | Real independent sessions/lock waits; checkout, cancel, reviews, inventory, membership, slots, rollback and permissions |
| Admin HTTP workflow |9 grouped workflows passed | Real login/cookie, create/reopen, validation/no-change, origin rejection, save/stale409, publish/unpublish, collection conflict and Storage roundtrip |
| Auth/PostgREST |6 checks passed | Password login; public signup disabled; anon401, authenticated403, service200; missing RPC404/PGRST202 |
| Safe-writer failure | HTTP503, all product-row digest unchanged | Temporarily revoked only the local v2 RPC permission; restored in finally |
| Compatible recovery | HTTP200 after restoring v2 permission; legacy create still revoked | Same current application/schema; not an immutable deployment cutover drill |
| Media API | Corrupt400, oversized413, permanent-delete409; bytes preserved | Actual Storage, not a mocked provider; native selection still blocked |
| Browser editor | Actual synthetic create, save, reload, publish and database persistence verified | Price1999, hidden cost300, inventory5; mobile390/390 and desktop1440/1430 widths; admin console error/warn list empty |
| Storefront runtime | PDP request200 after the Tailwind fix | Full shopper-browser hydration and warm-cache invalidation are not certified |

Synthetic local Auth users were generated with random credentials; no real customer
data or production credentials were copied. Initially `[auth.email].enable_signup=false`
disabled the entire email provider, causing422 `email_provider_disabled`. The local
provider was enabled while global signup stayed disabled; a real signup request
still returns422 `signup_disabled`. Production Auth configuration was not changed.

Evidence artifacts remain ignored under `tmp/isolated-staging`: `http-results.json`,
`http-recovery-results.json`, `session-results.json`, `media-api-results.json`,
`browser-persistence.json`, migration manifest and nonsecret container-recovery ledgers.
They contain synthetic identifiers/statuses, not production data. Never commit the
ephemeral browser login-input file; it is removed when its owned test session closes.
The retained PostgreSQL suite refuses contaminated reruns instead of deleting fixtures.

### Confirmed bounded source fixes

1. **Storage uncertainty:** an actual PNG was persisted, but strict HTTPS validation
   rejected the local HTTP public URL and the endpoint originally returned generic503.
   Persisted/ambiguous SDK/network/server-error/malformed-result outcomes now return502
   with an explicit check-before-retrying message. Known provider rejections remain
   distinct. No retry, secondary-provider duplication, URL-validator relaxation or
   permanent deletion was introduced. Tests exercise the actual handler with real
   raster decoding plus controlled provider failures; the local HTTP test confirms502
   with one stored object. A successful local-HTTP upload is deliberately not claimed.
2. **Node24 Tailwind crash:** native config import reproduced `require is not defined`
   at the CommonJS plugin call in an ES module. Storefront/admin/root configs now use
   the equivalent ESM plugin import; styling, content scans and responsive values are
   unchanged. All three native Node config-import tests pass, and the previously
   failing local PDP request now returns200.

Independent source review confirmed these bounded fixes and caught a defensive
null/undefined Storage-result gap, which was corrected with handler regression tests.
No sweeping security or release signoff is inferred from that review.

### High/P1 blocker — admin session lifecycle

**Actual local HTTP evidence:** login200, logout200 with client cookie clearing,
then replaying the copied cookie to `/api/admin/products` still returns200.
The cookie advertises Max-Age604800, but `admin-session.ts` derives the same permanent
HMAC from the shared secret; `admin.ts` and middleware do not enforce server expiry,
per-login identity or revocation. Logout clears only the caller's cookie.

This is not a demonstrated unauthenticated login bypass: exploitation requires an
already obtained valid cookie. It is nevertheless release-blocking. Independent
security review corroborated it. From source, password resets, allowlist changes or
Supabase user disabling likewise do not revoke the application cookie; those account
changes were **not** tested against production or performed here.

Required next design/approval: bounded session-lifecycle hardening with unique,
expiring, server-revocable sessions; reject legacy cookies; test expiry, copied-cookie
replay, logout and account/password lifecycle; preserve machine-bearer integrations.
Expiry alone does not solve logout revocation. Do **not** rotate shared ADMIN_TOKEN /
REVALIDATION_TOKEN / CRON_SECRET ad hoc. If persistence requires a new table/RPC,
prepare/test it locally on a draft branch; production SQL still needs separate approval.

### Native/media and remaining release gates

Native Photos Upload File was attempted through the actual browser tool against:
`D:\e commerce store (1)\.worktrees\admin-efficiency\tmp\isolated-staging\synthetic-fixture.png`.
The tool denied that canonical path as outside its configured roots. No file was
selected, no native upload occurred, and no permission bypass was attempted.
Fixture SHA256: `24B5B1181FF1F06CD4AC0CB5E090CACAB95D67F70C12262AB50CF34AA6C7C42E`.

The separate actual admin-upload HTTP test stores one synthetic PNG but returns502
because the public URL is HTTP and the application correctly requires HTTPS. Do not
weaken that rule to make local acceptance green. A browser-permitted fixture and
trusted HTTPS isolated Storage/staging origin are still needed for selection → upload
→ preview → save → reload → publish → actual storefront-image rendering, multiple
images/order, interruptions and uncertain-outcome UI acceptance. Existing manual steps
below remain applicable only to a positively verified isolated environment.

Also outstanding: session hardening; full public-checkout/cancel/review HTTP journeys
(their real SQL concurrency is covered); warm-cache storefront invalidation; complete
browser conflict/reload/media matrix; matching immutable application/schema cutover and
recovery drill; any separately approved hosted staging; final-head remote CI.

The local CI workflow now includes collection-stack PR bases and the six staging
isolation contract tests so a future focused draft PR can run the intended checks.
Proposed base is PR30's `codex/collection-integrity-acceptance` branch. Remote push
still requires explicit authorization; automatic Vercel previews may build on a future
push and are **not** isolated acceptance environments. No remote CI pass is claimed.

### Fresh source verification

The full local gate passed both linters, both typechecks, both production builds and
all10 storefront budgets after the source fixes. Final application test discovery
passed **1063/1063** tests,0 failed, after the final malformed-result regression.
The focused upload run passes22 tests. Six pure isolation tests and three native
Tailwind-import tests also pass; the latter are included in application discovery,
not additional independent totals. Workflow YAML parsed and script syntax/diff
checks passed. These are local results, not final-commit GitHub CI.
The additional root-scoped ESLint follow-up exited0 with the monorepo pages-directory
advisory; the two workspace lint pipelines were clean. Existing Next15 CLI
deprecation notices and Git's LF/CRLF normalization notices are not hidden.

### Handoff and next authorization

Owned browser/diagnostic application processes were stopped and their temporary
login-input file removed. All eight exact acceptance containers were then stopped
with `stop.mjs`; original snapshots, synthetic fixtures and every volume were retained.
Docker Desktop, unrelated development containers and production remain untouched.
Resume only through the ownership/loopback checks; do not reset or prune the stack.

Priority approval request is a separate bounded **draft-only session-lifecycle
hardening** design and implementation. Reuse the existing backend where suitable,
store only hashed unique session credentials, enforce server expiry/revocation and
identity/allowlist checks, revoke the specific session on logout, and cover account /
password lifecycle. Preserve machine-bearer integrations and do not rotate their
shared secrets. Any schema implementation stays prepared/tested locally; production
Auth/DB changes need separate exact-target approval. Review security and latency
tradeoffs before implementing a persistence/session architecture.

Native upload also requires correcting the browser tool's workspace-file permission
and approving a trusted HTTPS isolated media origin. Hosted resources, paid services,
trust-store changes and production settings are not authorized by this report.
Finally, authorize a focused draft-branch push before remote CI can run; do not
force-push existing PR history or merge/deploy from this checkpoint.

No live account/password, hosted settings, production data, integration secret,
production migration or deployment was changed. Production readiness is not implied
by this substantial local progress.

## Local staging certification follow-up — 2026-10-24

Starting SHA reverified: `9d0692ace7fbc7b8af52c8a21704374611061036`.
PRs23–30 remain OPEN/DRAFT; the dependency chain is unchanged. Exact starting-SHA
CI run40091998133 remains completed/success. This evidence does not certify new files.
Staging preparation is isolated on `codex/isolated-staging-certification`.
Migration28/29 hashes still match the approval manifest below; neither file was edited.

### What was actually attempted

- Installed Supabase CLI reports2.116.0. Docker CLI reports29.6.1, desktop-linux context.
  [Official local-development documentation](https://supabase.com/docs/guides/local-development)
  and CLI help were checked before startup commands.
- Docker Desktop startup was attempted, including launching the installed application.
  Backend processes appeared, but the local engine pipe remained unavailable or timed out.
  Two guarded startup attempts stopped at Docker preflight with ETIMEDOUT, before network
  creation or Supabase startup. No database or Storage stack was initialized by this harness.
- No Docker reset, WSL shutdown/reset, volume deletion, reinstall or account/settings change
  was performed. A running Desktop process is not evidence of a healthy Docker engine.
- Prepared an ignored `tmp/isolated-staging` folder from all63 committed migration files,
  with a per-file SHA256 manifest, separate project ID `buyntry-isolated-acceptance`,
  API55321, PostgreSQL55322, Studio55323, local mail55324 and admin callback3301.
  No `.temp` production link, environment file, production credential or customer record
  was copied. Automatic seeding is disabled; synthetic users/fixtures remain to be created.

### Startup safeguards (preparation, not full application acceptance)

`scripts/local-staging/prepare.mjs` prepares files only. `start.mjs` requires an owned
directory, exact generated config, complete matching source/staged/manifest migration
inventories and hashes, exact local Desktop engine pipe, a separately labelled network
with127.0.0.1 default host binding, and actual loopback container-port checks after start.
It strips inherited provider/application/CLI credentials and remote Docker overrides,
binds the CLI to the inspected engine, and suppresses CLI startup/status secret output.
The installed Windows CLI shim is explicit; portability to other installations is not
certified. No app process is launched by these scripts.

Independent read-only review identified and prompted fixes for a too-permissive named
pipe check, incomplete migration inventories, configuration drift and CLI/engine binding.
Four focused isolation tests now pass, including production-ref aliases, extra/missing
migrations, duplicate versions, remote pipes and inherited credentials. Syntax checks pass.
Startup refuses pre-existing peers on its owned network. If startup or port verification
fails, it attempts to stop only dedicated Supabase container names on that network;
it does not delete volumes or stop unrelated workloads. This cleanup is not runtime-tested.
These tests are run explicitly; they are not yet wired into the existing application CI.
Loopback networking is not an outbound firewall. Application/provider isolation still
requires a runtime allowlist, separate app environments and synthetic HTTP verification.

The reviewer found no obvious migration-time external calls. Historical analytics-drop
migrations may run only in the explicitly disposable local stack; do not replay this full
history against production. A legacy bigint-ID RPC warrants isolated runtime inspection;
it is not evidence of failure in current checkout's differently named RPCs.

### Remaining local acceptance — blocked by Docker readiness

After the engine is healthy, inspect that no unrelated containers own the staging names
or ports, then run the guarded startup. Inspect actual service health and migrate all63
files (no bootstrap shim). Verify PostgREST signatures/grants/cache, local Auth recovery,
local Storage policy/upload, and explicitly generated synthetic administrator credentials.
Start admin3301/storefront3300 with only allowlisted independent local environment values;
never inherit checkout/courier/Sheets/email/WhatsApp/SMS/Cloudinary production credentials.
Use only the local Storage alternative and captured local email. Prove runtime endpoints
before synthetic writes. Test the HTTP/business/media/recovery matrix below in full.

Not run: full-history replay, real Auth/Storage/PostgREST/HTTP suite, provider upload,
native picker acceptance, compatible recovery drill or fresh final-head hosted CI.
Previous1056/44 results must not be relabelled as these missing tests. Fresh application
tests passed1056/1056 on this follow-up, independently of the four new explicit tests.
Read-only Vercel environment-name/target metadata was rechecked for both exact project IDs:
Supabase URL/anon/service-role/project-ref, Cloudinary, ADMIN_TOKEN and CRON_SECRET still
have shared production+preview entries without branch scopes. Values were not decrypted
or printed. This confirms ordinary previews remain unsuitable for synthetic acceptance;
it does not prove the values of unknown custom environments. Native-picker limitations
remain unresolved. No production or ordinary preview write was performed.

### Dedicated hosted staging proposal — not authorized/provisioned

| Proposed resource/change | Exact boundary | Approval/requirements |
| --- | --- | --- |
| Supabase project `buyntry-staging` | Separate project ref, DB/Auth/Storage; synthetic data only | Choose owning organization/region; verify current quote before creation |
| Vercel `buyntry-staging-storefront` and `buyntry-staging-admin` | Separate projects under the intended team; reviewed draft branch; no production domains | Explicit project/settings/preview-deployment approval; verify plan limits/cost first |
| Storage | Dedicated Supabase `product-images`; Cloudinary credentials absent | Validate fallback and public URL provenance; no live media copying |
| Auth/email | Synthetic admin, staging callback allowlist, captured/sandbox email only | Independent credentials; no live user/password changes |
| App secrets/origins | New ADMIN_TOKEN/revalidation/cron values and staging-only proxy origins | Separate scoped environment entries; never copy live secret values |
| External providers | No live PostEx/Sheets/WhatsApp/SMS/Resend/ad credentials | Mock/sandbox endpoints; outbound allowlist and negative isolation tests |
| Domains | Use platform-generated staging hostnames | No domain registration or DNS modification proposed |

No verified current price quote was obtained: do not assume hosted staging is free or
authorize any charge from this proposal. Permissions required are project creation and
staging-scoped configuration/deployment, not changes to unrelated projects or production.
Before provisioning, present actual quoted costs and exact selected resource IDs for
separate approval. Local Docker troubleshooting does not authorize hosted provisioning.

### Recovery and future production approval

Existing coordinated drain/migrate/schema-cache/compatible-roll-forward procedure below
remains a proposal, not recovery certification. A fresh isolated drill must prove partial
migration failure rollback, schema-success/app-failure recovery, stale-writer rejection
and uninterrupted synthetic checkout/cancellation/courier behavior. Never restore legacy
unsafe publishers or an old whole database over newer orders.

Production approval requires: reviewed ordered draft chain, final SHA/CI/build/budget
evidence; full local and dedicated hosted acceptance; native upload proof; verified
current production migration metadata and hashes; narrow old-writer cutoff; compatible
recovery artifacts; explicit target/migration/deployment/window/reopening approval.
Current decision remains **NOT READY — BLOCKERS REMAIN**.

### Fresh local gate results for this follow-up

- Application tests:1056 passed,0 failed; staging isolation tests:4 passed,0 failed.
- Both linters: no warnings/errors. Both explicit typecheck pipelines: passed.
- Storefront production build: passed. Admin production build: initial sandbox EPERM
  creating generated `.next/types/app/api/admin`; permission-approved retry passed.
- Storefront performance budgets: all10 passed (home initial661KB/720KB,
  product-detail initial668KB/720KB; these are bundle budgets, not Lighthouse scores).
- PostgreSQL harness: migration-version uniqueness passed, then Docker ETIMEDOUT;
  no fresh behavioral scenarios ran. The final5-second Docker info check also timed out.
- New script syntax checks and `git diff --check`: passed (Git reports only its
  ordinary LF-to-CRLF normalization notice on the edited Markdown file).
- No new hosted CI or preview deployment was triggered. Existing run40091998133
  certifies the starting SHA only, not this local staging-preparation checkpoint.

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
