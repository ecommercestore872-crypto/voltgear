# Vercel CLI publication safety audit — 2026-10-28

**NO-GO for publishing the draft PR under the present preview configuration.**
Read-only CLI GET requests used existing Windows authentication and exact team
`hassaans-projects-e3451522`. No settings, deployments, credentials, Git refs or
production data were changed. Secret values were not displayed or saved in reports.
Only the public Supabase URL was inspected internally to classify its target.

| Project | Retained deployment inventory | Latest listed production-tagged commit | Project domains |
| --- | --- | --- | --- |
| voltgear |160; pagination exhausted|`2188a0b3cb1a9b4c689026a259c675e5a4a1ac8c`|buyntryy.com, www.buyntryy.com, voltgear-pi.vercel.app|
| voltgear-admin |135; pagination exhausted|`2188a0b3cb1a9b4c689026a259c675e5a4a1ac8c`|voltgear-admin-pi.vercel.app|

Both Git integrations point to ecommercestore872-crypto/voltgear, production branch
main. The inventory records deployment IDs, generated URLs, production/preview
targets, states and associated Git SHA/branch when provided. Aliases were inspected
for the most recent12 deployments per project, not for every historical deployment.
Listing production-tagged deployments does not prove which is currently promoted
or bound to each production alias; that mapping remains to be verified.

## Confirmed publishing blocker

Both projects have an unqualified environment entry applying to **production and
preview** for NEXT_PUBLIC_SUPABASE_URL. Its host matches production project
zeuhfqevqjkbzwdaxjuv. Preview also receives SUPABASE_SERVICE_ROLE_KEY, ADMIN_TOKEN,
RESEND_API_KEY, CLOUDINARY_API_SECRET and CRON_SECRET entries. Values were not
displayed, decrypted for these secrets or copied into evidence. Sharing the URL
does not independently prove the encrypted service key's identity; it establishes
production targeting, and the privileged credential configuration is unsafe to
assume isolated. No branch-specific isolated Supabase URL override was returned.

Reviewed shared-source changes can trigger builds of both projects. Their ignore
commands continue building when a previous Git baseline is absent or uncertain.
A draft PR/feature branch is not a deployment-isolation mechanism. Authentication
at Vercel's edge does not stop a build or an authorized preview user from reaching
production-backed services.

## Old deployments and protection

Both project configurations report SSO deploymentType all_except_custom_domains;
password and trusted-IP protection are not configured. Protection-bypass metadata
is present; its scope/effectiveness was not inspected and no bypass value was read
or used. Deployment detail responses can omit inherited SSO settings, so an absent
deployment-level field does not establish an unprotected deployment.

Three oldest ready admin generated URLs, on main commits170424bcd880ef8140d942825b77939a1a4e3970
and f2909a66e3d6cca39fd93b36e1dd2762cd782b8a, remain addressable. Both /admin/login
and /api/admin/products returned302 to vercel.com/sso-api for each. Thus these
sampled generated URLs challenge anonymous access rather than serving the app
directly. No valid legacy cookies or authenticated sessions were tested. Recent
URL probes mostly returned302, with one unavailable result. Custom-domain paths,
all historical aliases, proxy paths, protection exceptions and authorized-user
access to older binaries remain uncertified. One CLI55 deployment-detail read
timed out; the CLI59 cross-check also had several timeouts. No missing response
was interpreted as safe.

## Required protections before publishing — proposal only

1. Independently scope the intended feature branch's previews to an isolated
   Supabase project and synthetic-only credentials for **both** apps; verify the
   effective branch environment, including service-role and auth/revalidation keys.
2. Remove production-capable email, media-write, cron, courier, messaging, Sheets
   and advertising delivery credentials from that preview scope, or replace them
   with explicitly approved isolated equivalents. Do not rotate live credentials
   or assume changing a URL alone isolates a service key.
3. Alternatively, obtain separate approval for a project/branch-scoped mechanism
   that demonstrably prevents automatic Vercel deployments while allowing GitHub
   CI. Do not rely on draft status, branch naming or an unverified ignore command.
4. Verify current production alias bindings and every relevant older admin URL,
   custom-domain/proxy path and exception. Approve precise retirement/restriction
   actions before release; preserve legitimate integrations and public shopping.

No protection/settings change is authorized or performed by this audit. Publishing
must remain stopped until one safe preview/deployment arrangement is demonstrated.

Sanitized evidence is retained under tmp/isolated-staging/release-readiness-20261028:
deployment-safety-6e81bd9a-6597-4b9f-b717-624ba570e97a.json (complete listings),
deployment-safety-3a735dd0-f14e-4e09-aba5-794cfee3a25f.json (CLI59 cross-check), and
old-admin-reachability.json (three oldest ready admin probes). No response bodies,
cookie values, bypass URLs or credential values are retained there.
