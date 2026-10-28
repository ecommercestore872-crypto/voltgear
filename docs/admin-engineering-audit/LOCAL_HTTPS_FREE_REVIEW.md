# Local HTTPS acceptance — free-first review

Reviewed 2026-10-26. Research and read-only checks only; no certificate, trust,
credential, provider setting, application code or deployment was changed.

## Recommendation

Use the existing Windows computer, Docker acceptance stack, local Supabase and
dedicated test Chrome. Finish image acceptance locally before considering hosted
staging. Expected additional Vercel/Supabase charge: USD0 for entirely local tests;
normal electricity/network use and the existing subscriptions are unaffected.
This does not certify hosted latency, deployment protection or physical Safari.

The existing Git-bundled OpenSSL3.5.5 was verified executable with a read-only
version check. No mkcert installation is needed. After approval, prepare a fresh
one-day local CA and separate one-day server certificate for `127.0.0.1`/`localhost`, with
server-auth usage and private-key Windows ACLs restricted to the test user. Import
only the public CA into **Current User**, not Local Machine, and remove that exact
CA after testing. Keep certificate validation enabled. Never import/share a key.

This is a deliberate trust change requiring approval. Current User trust can
affect other applications running as that Windows user; a separate Chrome profile
does not confine Windows-root trust. The CA must be short-lived, its private key
protected, and its exact SHA256/thumbprint recorded before manual import/removal.
Certificate expiry does not remove the installed trust entry; explicit removal
and safe retirement of the generated signing key remain required at completion.
Do not import the older rotating helper certificate blindly or create a permanent
machine-wide CA. If browser policy rejects local trust, stop without changing it.

Chrome documents support for Current User trust roots over TCP; Microsoft documents
the per-user scope. These are supported trust mechanisms, not TLS-warning exceptions.
See [Chrome trust decisions](https://chromium.googlesource.com/chromium/src/%2Bshow/main/net/data/ssl/chrome_root_store/faq.md)
and [Windows certificate stores](https://learn.microsoft.com/en-us/windows-hardware/drivers/install/local-machine-and-current-user-certificate-stores).

## Native image selection

Verified files, generated synthetic PNGs, containing no customer data:

| File | Bytes | SHA256 |
| --- | ---: | --- |
|`synthetic-https-0.png`|137|`24B5B1181FF1F06CD4AC0CB5E090CACAB95D67F70C12262AB50CF34AA6C7C42E`|
|`synthetic-https-1.png`|135|`8233D4077ED632E87DD78DAB9329C53F9111125A6CA02C9FF68C3F14023571D3`|

Both are under:
`D:\e commerce store (1)\.worktrees\admin-efficiency\tmp\isolated-staging\`.

**Simplest authorization:** the operator selects each exact file through Windows'
native picker in the test browser. That is a normal, explicit user file grant and
requires no MCP permission expansion. Current `media-field.tsx` reads only the
first selected file and has no `multiple` attribute: upload them one at a time.

The installed Chrome DevTools MCP is1.10.1. Its plugin launch configuration declares
no filesystem root. Installed source validates upload paths and combines client
roots with explicitly configured `--filesystemRoot`/`--workspace` directories.
The observed denial is consistent with missing applicable roots, though the live
negotiated root list has not been captured. The tool has no per-file authorization
parameter; changing the Codex working directory alone is not proof of authorization.
See the [pinned upstream configuration](https://raw.githubusercontent.com/ChromeDevTools/chrome-devtools-mcp/chrome-devtools-mcp-v1.10.1/docs/configuration.md).

If automated file assignment is preferred later, approve a new fixtures-only
directory containing verified copies of just these two PNGs, then explicitly
authorize that directory in a supported user-owned MCP launch configuration:

```json
"args": [
  "-y", "chrome-devtools-mcp@1.10.1", "--isolated",
  "--filesystemRoot",
  "D:/e commerce store (1)/.worktrees/admin-efficiency/tmp/browser-upload-fixtures"
]
```

This option is not yet configured or tested. It grants directory access, not an
exact two-file allowlist, so the directory must remain fixture-only. Do not grant
the whole drive, repository or `tmp/isolated-staging` (which contains private test
inputs/keys). Do not edit generated plugin-cache configuration or enable
`--allowUnrestrictedPaths`. Copying to a guessed already-permitted directory is
not a replacement for explicit authorization. Manual native selection is preferred.

## Manual steps — after approving local preparation

1. Open **Docker Desktop** from Windows Start and wait until its engine is running.
   Its executable exists, but the engine was unavailable during this review. Do
   not reset Docker, delete volumes, reinstall or change networking. The agent will
   inspect ownership/bindings before resuming only the existing eight containers.
2. Approve preparing the temporary local CA/leaf and the local-only HTTPS harness
   adjustment. Existing production credentials and database remain untouched. The
   current helper regenerates a Node-only self-signed certificate on every run;
   simply importing one old certificate will not fix future runs reliably.
3. When given the exact public CA file and fingerprint, press **Win+R**, enter
   `certmgr.msc`, and open **Trusted Root Certification Authorities → Certificates**.
   Use **All Tasks → Import**, select only that public `.cer` file, verify the
   prepared issuer/fingerprint/validity, and confirm **Current User**. If prompted
   to use Local Machine or change browser policy, stop and report it.
4. Restart only the dedicated test Chrome when coordinated. The agent will verify
   the certificate chain, SAN, expiry and normal HTTPS loading with no warning.
   Browser-tool navigation to `chrome:` settings was denied during review; no
   workaround was used. Trust-manager clicks are a manual operator action.
5. In the local synthetic product editor's **Upload** picker, paste the complete
   path ending `synthetic-https-0.png` and open it. Wait for the decoded preview;
   repeat separately for `synthetic-https-1.png`. Select no other files.
6. Leave the test browser open for observed preview/reorder, save, hard reload,
   publish and storefront image decoding, then the remaining negative/conflict/
   deletion/logout checks in `LOCAL_BROWSER_ACCEPTANCE.md`. Do not enter production
   login details. Chrome mobile emulation is not real iOS/Safari acceptance.
7. At completion, remove only the temporary CA matching the recorded fingerprint
   from the same Current User store. Verify trust removal and stop only owned test
   processes/containers, retaining lab volumes and evidence. No bulk cert deletion.

After approval the harness should reuse one stable, verified CA/leaf for the test
window, trust the CA only in its child Node processes, and bind HTTPS proxies only
to loopback. Proposed external URLs: admin `https://127.0.0.1:33443`, storefront
`https://127.0.0.1:33444`, Supabase/media `https://127.0.0.1:55421`; fixed upstreams
remain3301/3300/55321. These are proposed, not running/accepted. Verify free ports,
origin/redirect/cookie/image/revalidation configuration before synthetic writes;
no production URL-validator relaxation or public tunnel/DNS change is needed.

## Quotas and costs — published versus account-confirmed

| Service | Confirmed account observation | Published limits / cost boundary |
| --- | --- | --- |
| Local Supabase |Existing owned64-migration lab; engine presently unavailable|Local development does not consume hosted project quota|
| Supabase hosted |`VoltGear Store`, org `doaisicygqlkxmdpfgca`, API reports `free`/`tier_free`; one `ACTIVE_HEALTHY` project and one `INACTIVE` project visible|Free: two active projects,500MB database,1GB Storage,5GB egress plus5GB cached egress,50k monthly active users; pauses after a week idle|
| Vercel hosted |Team/billing API requests returned403; CLI help also reported worker timeout/EPIPE|Hobby: non-commercial personal use only;100GB transfer,1m function invocations,4 CPU-hours,360GB-hours memory,5k image transformations. This does not establish this team's remaining allowance|
| Existing Pro subscription |Earlier screenshots show Pro; current invoice/remaining credit not accessible|Current standard Pro: USD20/month platform fee including one deploy seat and USD20 usage credit; excess usage/seats/add-ons can add charges|

A spare Supabase active slot appears possible, but is **not certified**: owner/admin
free-project limits across organizations can block creation. Inactive is not proof
of unused capacity, and database/storage/egress balances were not returned by the
metadata tools. No cost-confirmation/provisioning endpoint was called. Do not reuse,
resume or modify the unrelated inactive project for acceptance.

Supabase Pro is from USD25/month, with additional Micro projects from about USD10/
month billed hourly. Creating a paid branch, enabling add-ons or upgrading would
need separate approval. Vercel previews can consume included credit and cause
overage; a commercial shop or its business staging should not be assumed eligible
for Hobby. The existing USD20 fee may be a base subscription, not traffic cost;
the actual invoice remains unverified. No downgrade or billing setting was changed.

For exact remaining hosted balances, the owner can read **Vercel → Hassaan's
projects → Usage / Settings → Billing** and **Supabase → VoltGear Store → Usage /
Billing**. Report plan, remaining credit and usage totals only, without payment
details or API keys. This is unnecessary to proceed with entirely local acceptance.

Sources checked: [Supabase local development](https://supabase.com/docs/guides/local-development),
[pricing](https://supabase.com/pricing), [free-project rules](https://supabase.com/docs/guides/platform/billing-faq),
[Vercel Hobby quotas](https://vercel.com/docs/plans/hobby),
[commercial-use rules](https://vercel.com/docs/limits/fair-use-guidelines),
[Pro charges](https://vercel.com/docs/plans/pro-plan).
Docker Desktop is free for eligible small businesses below both250 employees and
USD10m annual revenue; company eligibility was not audited. See
[Docker licensing](https://docs.docker.com/subscription-billing/desktop-license/).

## Approval needed now

Approve **local-only temporary certificate preparation, its local HTTPS harness
adjustment and manual Current User public-CA trust/import/removal**, then perform
the native selections when the guarded environment is ready. The operator starts
Docker Desktop. No hosted project, paid service, push, credential change,
production migration, production data modification or deployment is included.
