# Approved local HTTPS preparation — 2026-10-26

Status updated 2026-10-28: **manual native selection and the complete media/data
workflow observed; certificate cleanup verified; the subsequent local hydration
fix is verified in `HYDRATION_RACE_FIX.md`**. Remote release gates remain separate.
Production, live credentials, providers, deployments and
remote Git are unchanged. Previous acceptance evidence/fixtures remain intact.
The original preparation/import instructions below are retained as history; the
dated results section records what actually happened after import.

## Prepared certificate

Public DER certificate (the only file to import):

`D:\e commerce store (1)\.worktrees\admin-efficiency\tmp\isolated-staging\browser-pki-86b834ff-65d9-4fd2-8ddf-6dcbd834f2ee\BuyNTry-LOCAL-ONLY.cer`

SHA256 certificate fingerprint **and DER file hash**:
`2264BDD4E2FF9D0B77A94859C529DB04AC3E4D44DF5C2F108C58DE0ADCDDDBEB`.

Windows SHA1 thumbprint:
`7DBD5BE3562240C5B35A98F81950DBDCB1B1D0FE`.

Subject: `CN=Buy N Try LOCAL ONLY d834f2ee`.
Root expiry:2026-10-27 18:14:57UTC /23:14:57 Pakistan time.
The server certificate is separately signed, valid for one day, CA:false, limited
to server authentication, with SAN127.0.0.1/localhost. The root has CA:true,
path-length0, certificate-signing usage and server-auth EKU. Actual OpenSSL and Node
chain/purpose/IP checks pass. Private material uses an inheritance-disabled Windows
ACL allowing only the current user; checks verify that rule before use. The
generated CA signing key was deleted after issuing the server certificate and its
absence is verified on load. No trust-store installation command was run.

The last exact-thumbprint read found **Current User absent, Local Machine absent**.
This is an observation before manual import, not a promise about subsequent state.
The session refuses an already-present Local Machine copy at startup. Never import
under Local Machine, disable validation, or click through a TLS warning.

## Manual import and native selection

1. Press **Win+R**, enter `certmgr.msc`, and open **Trusted Root Certification
   Authorities → Certificates** for **Current User**.
2. Right-click **Certificates → All Tasks → Import**. Select the exact public `.cer`
   above. Verify its subject, expiry and recorded thumbprint, then finish. Do not
   import any key, use `certlm.msc`, or change machine/browser policy.
3. Tell the agent **Imported into Current User**. The agent must verify the matching
   store entry and browser HTTPS success before proceeding. Any necessary restart
   is limited to the dedicated test Chrome, preserving personal browser sessions.
4. The agent will sign in to the synthetic local admin and open a synthetic product
   editor at `https://127.0.0.1:33443`. In its **Upload** button's native picker,
   select the following files separately, waiting for each preview:
   - `D:\e commerce store (1)\.worktrees\admin-efficiency\tmp\isolated-staging\synthetic-https-0.png`
   - `D:\e commerce store (1)\.worktrees\admin-efficiency\tmp\isolated-staging\synthetic-https-1.png`
5. Continue observed reorder/save/reopen/hard-reload/publish and decoded storefront
   image checks at390px/1440px. The32px fixture quality warning is expected; decoded
   images and persisted order still need actual browser proof. Native selection,
   preview persistence and physical Safari are not certified by API tests.

The existing file permission denial is respected. No MCP configuration or roots
were changed and no file-upload bypass was used. Human native selection supplies
the explicit file grant. Certificate-manager navigation via the browser tool
remains blocked; trust-manager steps belong to the operator.

## Actual local results

| Verification | Observed result |
| --- | --- |
| Proxy/isolation contract tests |9/9 pass: fixed targets, host/path restrictions, local endpoints, secret stripping, Docker/migration guards|
| HTTPS preflight |6/6 groups pass: three verified origins; untrusted chain rejection; Host/namespace rejection; Secure+HttpOnly cookie/protected GET; foreign-origin mutation denial with unchanged catalog; logout replay401|
| HTTPS multipart/media |3/3 groups pass: both exact PNG byte sequences survive upload/download with verified TLS; corrupt400 and oversized413 create no additional objects; test logout200|
| PKI |Public DER SHA256 independently matches; chain, SAN, EKU, expiry, private ACL and signing-key retirement verified|
| Local service scope |Owned Docker network/eight services, loopback bindings, all64 migration bytes/history and Auth/Storage health verified before synthetic writes|
| Harness source |New script syntax checks and existing tracked diff whitespace check pass; application/migration/workflow source unchanged|
| Native browser trust and file workflow |User selected both exact fixtures in Chrome's native picker; two upload200 responses and visible decoded previews observed. See dated continuation below.|

The first preflight passed TLS checks but its deliberately forged Host header
caused Node's default SNI derivation to fail the TLS handshake before the intended
HTTP rejection. The strict test client now sends no SNI for its fixed IP URL;
normal IP certificate verification and `rejectUnauthorized:true` remain enabled.
The corrected run passes all6 groups. The first failed report is retained.

Existing production-mode BUILD_IDs remain:
admin `1-LdQDvIe901cfKWAaelX`, storefront `uUlRAKU1-Dmj0d1mhq514`.
No rebuild or proof of their source-commit provenance is claimed. Prior application
tests, real concurrency/security suites and budgets were not redundantly rerun.

Artifacts remain ignored under `tmp/isolated-staging`: active PKI manifest,
`browser-https-session.json`, `browser-https-first-attempt-*.json`,
`browser-https-media-results.json`, and private login input inside the protected PKI
directory. Do not publish that input, private keys, cookies or Auth response bodies.

## Lifecycle and exact trust removal

Only fixed origins are exposed: admin33443→3301, storefront33444→3300,
Supabase/media55421→55321, all on127.0.0.1. Inherited provider configuration is
stripped. Synthetic accounts/objects are retained; only this run's browser sessions
are revoked during cleanup. No production SQL, external provider delivery, public
tunnel, DNS change or paid resource is used.

The ready session is bounded to60minutes. On controlled stop/timeout it revokes
its synthetic sessions, closes owned apps/proxies, removes its private input,
executes the exact certificate removal script, and verifies test ports/trust state.
This cleanup path has not yet completed for the active ready run. Abrupt process
termination/engine failure can prevent finally handlers; the manual recovery script
is retained. If the session expires before import, report that before proceeding.

Exact removal script:
`D:\e commerce store (1)\.worktrees\admin-efficiency\tmp\isolated-staging\browser-pki-86b834ff-65d9-4fd2-8ddf-6dcbd834f2ee\Remove-Exact-Temporary-CA.ps1`.

Without `-Remove` it only reports status. With `-Remove` it checks SHA256 and removes
only `Cert:\CurrentUser\Root\7DBD5BE3562240C5B35A98F81950DBDCB1B1D0FE`.
It never targets Local Machine or bulk-deletes certificates. After testing, verify
that the exact entry is absent; certificate expiry alone does not remove trust.
Stop the eight owned containers using the existing guarded `stop.mjs` when local
acceptance is finished, retaining every volume and fixture.

## Observed native acceptance continuation — 2026-10-27

The public certificate's SHA256 was read from the actual Current User entry and
matched `2264BDD4E2FF9D0B77A94859C529DB04AC3E4D44DF5C2F108C58DE0ADCDDDBEB`.
Chrome155 trusted TLS1.3 without an exception. Local Machine trust was absent.
Sandbox-only process/trust reads incorrectly appeared empty; these were corrected
using privileged read-only checks before further action. Never infer Windows trust
absence from the restricted view alone.

The original run `f65a22e7-6051-48f6-87e8-29fcd7222c91` records actual UI draft
creation and two human native selections. No script assigned a file or intercepted
a picker. Product `cf702d7d-03d4-4b2b-9548-02b17428dd5c` is synthetic and local only.
Both upload responses were200. Strict HTTPS downloads matched the exact fixture
hashes and retained PNG content. The small32px quality warning is expected.

| Fixture | SHA256 |
| --- | --- |
| synthetic-https-0.png,137bytes |24B5B1181FF1F06CD4AC0CB5E090CACAB95D67F70C12262AB50CF34AA6C7C42E|
| synthetic-https-1.png,135bytes |8233D4077ED632E87DD78DAB9329C53F9111125A6CA02C9FF68C3F14023571D3|

An initial browser assertion ran before current image elements finished loading.
Persisted draft fields and ordering were inspected rather than overwritten. The
wait now checks each current Photos image for visibility, completion and nonzero
natural width. The original failure and subsequent attempts are retained.

At07:04:47UTC the workflow had passed persistence, publish, responsive rendering
and stale-editor conflict checks, but Back after logout failed with
`ERR_SSL_PROTOCOL_ERROR`. An unauthenticated local response exposed
`Location: https://localhost:3301/admin/login`, pointing at the internal plaintext
Next port. The local test proxy now rewrites only exact current-service loopback
redirects to its fixed HTTPS origin and rejects unknown destinations. It never
follows redirects. This is a harness repair, not a claimed production fix.

The old session later disappeared; PID8084 was reused by WSL, whose creation time
was later than the completed native attempt. Recovery verified that evidence and
all five free ports, archived the old metadata/private input, and left WSL
untouched. All eight existing owned containers were resumed without recreating
them or changing volumes. The new session is
`c7998583-90b2-45d8-b009-0a9e78a8f476`; all six HTTPS preflight groups passed again.

Attempt `388af670-4e15-497a-aaaf-98afca3bdd5f`, finished13:37:29UTC, reused the
same manually uploaded product/images and the exact same two BUILD_IDs. It passed:

- Price1999, cost300, quantity5 and ordered images survive navigation/hard reload.
- Publish retains those authoritative fields and the two image relationships.
- Storefront images decode at1440px and390px with no horizontal overflow;
  screenshots were also visually inspected. Physical Safari remains untested.
- A second stale editor receives409 and a visible conflict alert; reload restores
  the winning summary and both images.
- Actual browser logout returns200; Back and direct protected navigation return
  to login with no editor visible.

This attempt had **zero page runtime errors**, but its overall `passed` remains
false because previous runtime failures have not been explained. It does not erase
the earlier native selection evidence or pretend that file selection was repeated.

Read-only diagnostic `810c731b-4786-453b-acc5-d3021250b973`, finished13:40:12UTC,
completed five navigation/image checks, preserving all numeric fields and both
decoded images, then logged out200. It **reproduced React error418 on iteration4**
in the product editor. Five resource404 console errors were also captured; their
resources were subsequently identified below. The earlier `$RS` null-parent error
remains recorded. Root cause is not yet confirmed; no application source fix is claimed.

Local proxy/PKI/recovery/isolation/cleanup tests: **19/19 pass**. Independent read-only
review found two small harness gaps (relative redirect normalization and inherited
attempt flags); both were corrected and re-reviewed with no remaining finding in
that bounded scope. A later diagnostic-cleanup finding was also corrected and
re-reviewed: evidence writes and shutdown steps run independently, and both debug
ports must be free before restoring generated files. Three injected-failure tests
cover those cases. That reviewer did not independently rerun the tests. This last
cleanup correction was unit-tested and source-reviewed, not rerun through another
costly development compilation.

A separate development cache and fixed loopback ports3302/33445 were used to seek
React's detailed error. The first diagnostic failed its cleanup comparison because
Next reordered `tsconfig.include`; semantic checks then archived/restored exactly
the two generated files. The second timed out during login and saved failure
`4ae701b5-2280-4240-b106-5d75f012bc31`; it is not product acceptance.
The third, `60e7e6d8-f00f-4b55-ba83-71c0f3c52f52`, finished14:00:26UTC, logged
in200, completed five editor navigations without React page errors and logged
out200. Development HMR websocket errors are expected because that narrow
diagnostic proxy deliberately exposes no websocket service. They are not a
production result. The intermittent production-build error was not explained by
the development run.

Both this run and the production-mode one-navigation resource diagnostic
`5ac8e151-c0e8-4010-ac34-ed9b3b362ca0` identify the404 as an **image** request to
`/admin/synthetic-original`, an older unrelated synthetic fixture. The latter
reported no page errors, decoded both real uploaded images and logged out200;
its strict `passed` remains false due to the captured404. No fixture was deleted
or altered to hide it. No failure of the two manually uploaded PNG URLs is inferred.

Both extra diagnostic ports are closed. Generated config edits were restored;
`git diff --exit-code -- apps packages supabase .github` passed. The diagnostic
cache was moved, not deleted, into ignored staging after validating exact paths
and free ports. Both original production-mode build artifacts remain intact.

## Cleanup verification — 2026-10-27

The exact stop marker ended session `c7998583-90b2-45d8-b009-0a9e78a8f476`.
Its final ledger reports `ready:false`, `ended:true`; synthetic session revocation,
private input removal and five application/proxy port releases produced no errors.
However, the exact CA removal script failed with Windows' message:
**“The operation is on user root store and UI is not allowed.”** A subsequent
privileged trust check confirms Current User still contains the matching SHA256;
Local Machine remained absent. At that point overall cleanup had **not yet passed**.

The operator was asked to use `certmgr.msc` → Current User → Trusted Root
Certification Authorities → Certificates, open subject `Buy N Try LOCAL ONLY
d834f2ee`, verify SHA1 thumbprint `7DBD5BE3562240C5B35A98F81950DBDCB1B1D0FE`,
then delete only that exact certificate and accept Windows' confirmation.
No UI-confirmation bypass, system trust modification or broad certificate deletion
was attempted. Do not report removal until a privileged matching-entry check
confirms absence. Retain the failed cleanup ledger as historical evidence even
after a separate manual-removal verification succeeds.

The guarded `stop.mjs` completed successfully: **eight exact owned acceptance
containers stopped**, all containers, synthetic fixtures and volumes retained.
Docker Desktop and unrelated workloads were not stopped. All temporary application
and diagnostic listeners had been released before container shutdown. The remaining
cleanup action at that point was manual Current User certificate removal and
subsequent exact-entry verification.

**Manual removal verified — 2026-10-27 23:21 Pakistan time (18:21UTC):** after the
operator reported deleting the exact certificate, a privileged exact-thumbprint
check confirmed it is absent from both Current User and Local Machine. All seven
test/diagnostic ports were verified free, all eight exact owned containers were
verified stopped, and the active private browser input was absent. Certificate
expiry had occurred; recovery-only metadata validation was used without returning
TLS material, restarting servers or weakening live certificate validation.
Cleanup is now **complete**. Nonsecret evidence is
`tmp/isolated-staging/browser-cleanup-verification-c7998583-90b2-45d8-b009-0a9e78a8f476.json`,
with `passed:true`; the original automatic-cleanup failure ledger is preserved.
This closed certificate cleanup. The later hydration investigation/fix is recorded
separately in `HYDRATION_RACE_FIX.md`; its original failures remain preserved.

Artifacts are ignored under `tmp/isolated-staging`: original native report,
per-attempt native archives, restarted session/preflight, read-only diagnostic
archives, and screenshots. Private login/key material stays inside its protected
directory and must not be included in a PR.

No application, package, database migration or GitHub workflow source was changed
for these repairs. No full application gate was rerun merely for harness edits.
Existing build IDs still lack final-source compilation provenance. Exact-head CI,
old-admin protection inventory and a distinct compatible hosted rollback candidate
remain unverified; production is **NO-GO**. No push/deployment approval is implied.
