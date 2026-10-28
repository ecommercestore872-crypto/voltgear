# Local isolated staging acceptance

## Approved manual-trust HTTPS browser preparation

See `docs/admin-engineering-audit/LOCAL_HTTPS_ACCEPTANCE.md` for the actual temporary
public certificate fingerprint, Current User import/removal instructions and
observed native selections and remaining hydration/cleanup gates. `browser-pki.mjs prepare` creates a protected
one-day CA/leaf once and retires its issuer key; it never installs trust. `status`
only inspects the exact matching trust entries. No expired/unknown PKI is reused.

`browser-https-session.mjs` runs the existing built apps through fixed loopback TLS
proxies on33443/33444/55421, validates HTTPS/auth/origin behavior and then waits for
manual acceptance for at most60minutes. Use only after explicit temporary-trust
approval. Its cleanup attempts removal of only the exact temporary Current User CA by SHA256,
revokes only its synthetic sessions, removes private input and checks owned ports.
The operator must manually import the public CA and select each PNG; API tests do
not replace native selection. `browser-https-media.mjs` tests actual multipart byte
preservation/negative uploads against a ready guarded session. Do not run builds
or other app suites against the same occupied test ports/artifacts.

Windows refused unattended user-root deletion during the actual run because a UI
confirmation is required. Do not bypass that confirmation: ask the operator to
remove only the fingerprint-verified entry using Current User `certmgr.msc`, then
verify absence using a privileged exact-entry check. Cleanup must remain failed
until that check succeeds; expiry alone does not remove trust.

`browser-https-recover.mjs` archives stale metadata/private input only after exact
port checks and process absence, or proof a later unrelated non-Node process reused
the PID. It never kills that process. The optional separate hydration diagnostic
uses3302/33445 and its own cache; it does not replace either production-mode build.
Its lifecycle fault tests ensure evidence-write/shutdown failures cannot skip the
remaining cleanup steps or permit restoration while a debug port is occupied.

`node --test scripts/local-staging/browser-https.test.mjs` checks fixed-target
request guards without opening sockets. The original Node-only TLS helper and
all previous local evidence remain available unchanged.

Status: the actual64-migration local stack and44 transaction scenarios passed.
Session hardening passed13 real HTTP groups; commerce passed13 groups, the original
admin/Storage workflow passed9, Auth/PostgREST passed6 and explicitly trusted local
HTTPS media passed4. Browser media and hosted release/CI gates remain separate.
Consult `docs/admin-engineering-audit/COLLECTION_INTEGRITY_ACCEPTANCE.md`.

`session-performance.mjs` measures the protected cookie/bearer paths using one
synthetic identity and existing production-mode admin build. It verifies the
owned64-migration loopback stack first; accepts no endpoint override and never
targets hosted services. It retains synthetic history, records its runner hash and
fails overall if logout/owned-port cleanup cannot be verified. Run only when3301
is free and no build/app suite is using the artifacts. It does not independently
prove the existing build came from the recorded source SHA. Qualified original-run
results and the subsequently prepared cleanup correction's unrerun status are in
`docs/admin-engineering-audit/SESSION_PERFORMANCE.md`.

The user-requested trusted hosted browser proposal is separately documented in
`ISOLATED_HTTPS_PROPOSAL.md` in that report directory. It does not permit retargeting
these local-only runners or creating a hosted environment without approval.

## Existing verified stack

Project `buyntry-isolated-acceptance`, network `buyntry-isolated-acceptance-loopback`.
API55321, PostgreSQL55322, Studio55323, local captured mail55324;
application test ports3300/3301. All eight actual published container bindings were
verified as127.0.0.1. Production ref `zeuhfqevqjkbzwdaxjuv` is forbidden.

For a fully stopped, previously verified stack:

```powershell
node --test scripts/local-staging/isolation.test.mjs
node scripts/local-staging/resume.mjs
node scripts/local-staging/rpc-permissions.mjs
node scripts/local-staging/http-acceptance.mjs
```

After acceptance, `node scripts/local-staging/stop.mjs` stops only the eight exact
owned acceptance containers, retaining all volumes/fixtures and leaving Docker
Desktop and unrelated workloads untouched.

`resume` refuses partially running/unowned containers; inspect before resuming.
The two acceptance commands create independent synthetic Auth/catalog fixtures;
never point them at a hosted project. Runtime checks require exact local endpoints,
all eight owned containers, loopback bindings, exact config/migration hashes and
the complete applied history before obtaining a write client.

`pg-acceptance.mjs` runs all44 retained scenarios on the full schema without a shim.
Runs namespace historical fixed collection slugs, use unique generated default
names and choose an unclaimed home slot. Only the current run's winning slot claim
is released; rows and prior fixtures are retained. Foreign injection hooks still
cause refusal. Do not reset/delete the database to rerun tests.

The additive session migration was applied locally using `prepare.mjs` followed by
`apply-session-migration.mjs`. That apply command requires the existing63-version
history and is intentionally not idempotent; **do not rerun it on the current64
migration stack**. Runtime checks now require all64. Production was not changed.

## Browser and failure/recovery checks

`browser-session.mjs` starts only unoccupied loopback application ports with new
synthetic credentials and stripped inherited provider configuration. It holds an
ignored, private `tmp/isolated-staging/browser-input.json` only during its lifetime.
Do not print that file. It removes the file and stops its exact app processes on
exit; it also auto-stops after20minutes. Never commit any ignored staging artifacts.

`browser-session.mjs --https-media` additionally starts an owned loopback TLS proxy
on55421 and trusts its one-day certificate only in child Node processes. It makes
no Windows/Chrome trust change. Browser trust and permitted native selection must
still be established separately; do not click through warnings as acceptance.
`--production-build` serves the already built apps instead of running a dev
compiler. Do not start it during a build. The local TLS helper uses the observed
Git-bundled OpenSSL at `D:\D FROM CHROME\Git\usr\bin\openssl.exe`; inspect that path
before reusing the harness on another computer. It installs no dependency or CA.

While a plain browser session is ready, `http-failclosed.mjs` checks503/recovery and
`media-api.mjs` checks HTTP-public-URL uncertainty/error/deletion behavior. The latter
deliberately returns nonzero when an uploaded HTTP public URL is rejected. That is
not a successful media acceptance result.

With3300/3301 free, the following self-owned suites start/stop their own test apps:

```powershell
node scripts/local-staging/session-acceptance.mjs
node scripts/local-staging/commerce-acceptance.mjs
node scripts/local-staging/media-https-acceptance.mjs
```

Do not run app suites/builds concurrently against the same `.next` directories.
`quality-build.mjs` performs both workspace production builds with stripped provider
credentials and bounded memory. After builds, run both typechecks, performance
budgets and `release-acceptance.mjs` for the local immutable-build recovery drill.
That drill does not authorize hosted cutovers or certify retired Vercel URLs.
See `docs/admin-engineering-audit/SESSION_V2_RELEASE_RECOVERY.md` and
`LOCAL_BROWSER_ACCEPTANCE.md` in the same report directory for approval/manual gates.

`browser-verify.mjs <synthetic-product-uuid>` checks the recorded browser fixture's
price1999/cost300/quantity5 after publishing. `storefront-diagnose.mjs <synthetic-slug>`
performs a bounded local PDP check and stops only its diagnostic child. It does not
certify cache invalidation or complete browser hydration.

## Cold startup limitations and recovery

`prepare.mjs` copies only actual migration bytes and a fixed config into ignored
`tmp/isolated-staging`. No production credential, link or seed is copied. The native
CLI path is the observed Windows2.116.0 installation beneath
`D:\npm-global\node_modules\supabase\node_modules\@supabase\cli-windows-x64\bin`.
Inspect paths/version before using these tools on another machine.

`start.mjs` requires a pristine owned network. It uses a process-scoped official
Docker Hub registry override after an observed ECR CDN failure, not daemon settings.
It now tests default port binding using a no-service, tmpfs-only sleep probe before
starting any real service. The current Desktop29 engine ignored the documented
network default, so a cold start must fail closed on this host; do not bypass it.

The existing stack was recovered through `rebind.mjs`: originals were renamed and
retained, replacements received explicit127.0.0.1 ports, and volume identity was
verified unchanged. `kong-files.mjs` preserves the CLI-injected gateway config/TLS
files in memory without logging them. `auth-email.mjs` corrected only the local
email-provider switch while keeping public signup disabled. These repair scripts
have exact preconditions; do not rerun them casually on the repaired stack.
Nonsecret recovery ledgers are under `tmp/isolated-staging`.

No resets, prunes, reinstalls, volume deletion or shared-workload restarts are used.
Do not log raw `supabase status` or Docker inspect output containing environment
values. The loopback network is not an outbound firewall. Live courier, Sheets,
email, WhatsApp, SMS, Cloudinary and advertising credentials remain absent.
