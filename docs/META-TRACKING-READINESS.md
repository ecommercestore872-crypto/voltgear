# Buy N Try Meta tracking candidate — verified 2026-11-03

## Source and publication boundary

Candidate branch: `codex/buyntry-meta-readiness-20261102`, based on verified GitHub
head `3356a477183562837238bf1a5e1159a63551b30c` from
`codex/buyntry-tiktok-production-ready-20261102`. The original dirty worktree and
its checkout, design and security work were preserved. GitHub main was
`2188a0b3cb1a9b4c689026a259c675e5a4a1ac8c`; this candidate is not a patch directly
on main. PRs #33 and #35 are separate historical release candidates.

No commit, push, PR, production deployment, environment change, SQL, asset-sharing
change, courier action or real order was authorized or performed. Both app
`vercel.json` files suppress Git deployments for this exact candidate branch.
Shared tracking changes otherwise qualify both projects for builds. Suppression
is prepared in source; hosted enforcement cannot be certified before authorized
publication and read-only deployment inspection.

## Measurement contract

Existing configured Pixel/Dataset: **1707417188053568**. Browser and CAPI use
the same `NEXT_PUBLIC_META_PIXEL_ID`; no new dataset was created. One SDK and
initialization per document; `trackSingle` explicitly targets that ID. Automatic
event configuration is disabled. No second injector was found in relevant source.
Read-only inspection of the live storefront layout's async JavaScript confirmed
the same ID in `/_next/static/chunks/3744.10c2ddc71c92eeab.js` (HTTP 200). Source
fetching did not execute the SDK or send any analytics event.

Consent must be `all`; essential/unknown, Global Privacy Control and Do Not Track
disable Meta. Development, preview hosts, admin, studio, demo, test/API, order
lookup/confirmation and tracking pages are excluded. Sensitive query parameters
and fragments suppress browser events because the SDK includes the document URL.
Confirmation does not reconstruct or re-emit Purchase. Browser privacy controls
can prevent delivery; a queued SDK call is not proof of receipt.

| Event | Meaning and data |
| --- | --- |
| PageView | Once per storefront pathname visit; client navigation counted; rerenders/remounts suppressed. |
| ViewContent | Current valid, available PDP; consent granted while viewing also counts; product slug, name, unit price, quantity 1. |
| AddToCart | After React commits the cart addition and storage write succeeds; actual stored product slug/price and added quantity. Genuine separate additions remain separate. Storage restoration never emits. |
| InitiateCheckout | First settled cart quote on checkout entry; product slugs, prices, quantities and payable total. Same snapshot reload is suppressed in session storage; leaving checkout permits a new attempt. |
| Purchase | A successfully persisted, accepted COD order. **This is not payment collection or successful delivery.** Uses only successful API response order ID, lines and numeric total, including recovered idempotent responses. |

All monetary values are numeric PKR. Purchase/checkout value includes shipping
and gift-wrap charges and subtracts supported discounts, matching checkout's
payable total. `contents.item_price` is the undiscounted persisted unit price;
it therefore need not sum to the discounted/shipped `value`. Product slugs are
consistent throughout Meta's funnel. No Meta catalog connection was verified;
any future catalog must use these slugs or receive a coordinated ID migration.
The existing TikTok SKU/variant identifier scheme is unchanged.

Browser Purchase `eventID` and CAPI `event_id` are exactly the accepted public
order ID, with event name `Purchase` and the same dataset and commercial data.
An SDK exception after an attempted send retains the browser claim, because it
cannot prove that the SDK did not already queue/transmit the event.
Browser local-storage claims survive refresh/replay; Web Locks serialize claims
across tabs when supported, with a 100 ms acquisition bound before navigation.
When purchase-marker storage is unavailable, browser Purchase is suppressed and
CAPI remains independent. Browsers without Web Locks also use server-only Purchase,
because a storage read/write alone cannot guarantee atomic cross-tab deduplication.
Server checkout replay branches do not invoke new server conversions. Two
different accepted order IDs remain two logical conversions. Cancellations,
refunds and inventory restoration do not emit Purchase; no reversal-reporting
integration was introduced.

## CAPI behavior and limitations

Server Purchase uses Graph API **v26.0**, HTTPS, bearer authorization, website
action source, acceptance time, and a fixed clean checkout URL. The version is
supported by Meta's [current official Business SDK configuration](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/apiconfig.py).
Meta developer documentation returned HTTP 429 during inspection; the official
[server event contract](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/serverside/event.py)
confirms event identity and occurrence-time semantics.

Email and Pakistan phone numbers are normalized and SHA-256 hashed. Generated
`@orders.buyntryy.com` COD addresses are excluded. Names, postal addresses and
city are not sent. Valid `_fbp`/`_fbc`, IP and user agent remain unhashed matching
fields. The original real `fbclid` and click timestamp are captured before URL
cleanup; `_fbc` is written only after consent. No fabricated click ID is generated.

Meta starts independently of attribution persistence and TikTok. HTTP errors,
malformed responses, timeouts and outages cannot fail the accepted order. Two
attempts at most, each with a four-second timeout, reuse an identical payload,
ID and timestamp. Application acceptance requires HTTP success and
`events_received: 1`; logs contain channel/outcome only. Tokens never enter URLs,
browser bundles, response bodies or reports. Checkout itself has a 20-second
timeout and retains its idempotency key for uncertain-result retries.

There is no existing durable conversions outbox in this architecture. This
candidate uses existing Vercel `waitUntil` and bounded retry, without a new table,
migration, service or paid resource. A process termination or outage beyond both
attempts can lose server delivery. It is **not** a guarantee of durable or
exactly-once network delivery. Meta-side deduplication remains an external gate.

Production browser events require canonical storefront hosts; production CAPI
additionally requires `VERCEL_ENV=production` and normal mode. Isolated mode
requires `NEXT_PUBLIC_META_TEST_MODE=true`,
a dataset different from the known production ID, a nonproduction environment,
and a `META_TEST_EVENT_CODE`. Never configure isolated mode against another live
business dataset. Production must omit the test code. CAPI token was missing in
available local configuration; hosted configuration is unverified.

## Verification evidence

Evidence is recorded under `tmp/meta-*` in this worktree. These are local test
artifacts and must never be deployed; the test builds contain fixture settings.

- Full unit run: **850 passed, 0 failed, 0 skipped** (`tmp/meta-unit-reviewed.log`).
- After the final SDK exception-claim change, the affected actual-payload suite
  was rerun: **9/9 passed** (`tmp/meta-payload-reviewed.log`).
- Both app lint, typechecks and production builds passed during the CI stage in
  `tmp/meta-verified-gate.log`. The wrapper's subsequent browser stage initially
  failed on proxy teardown; the corrected browser-only run passed separately.
- Meta browser gate: **100 assertions passed**, Chromium 1440 px and Android-sized
  390 px, nine mocked checkout posts each, two distinct Purchase IDs each,
  zero runtime/unexpected console errors (`tmp/meta-browser/report.json`). This
  includes successful checkout with browser Purchase suppressed when Web Locks
  are unavailable, preserving atomic browser deduplication.
  Exact product names, merchandise, shipping and checkout totals passed in the
  final browser rerun (`tmp/meta-exact-values-proof.log`). The final storefront
  build/browser gate also passed (`tmp/meta-accepted-candidate-gate.log`).
- TikTok browser regression: **90 assertions passed**, desktop Chromium,
  Android-sized Chromium and iPhone-sized WebKit, five mocked checkout posts per
  viewport, with stable event IDs and zero runtime errors
  (`tmp/tiktok-browser/report.json`). Combined browser runner exited successfully
  (`tmp/meta-browser-reviewed-proof.log`).
- All ten storefront JavaScript/CSS performance budgets passed
  (`tmp/meta-performance-accepted.log`).
- Static RLS/public-environment security audit passed (`tmp/meta-security-audit.log`).
  New public switches are deliberately allowlisted; CAPI credentials remain forbidden.
- Targeted payload tests execute the actual helpers and transport, including
  multi-item PKR values, matching/hashing, acceptance validation, duplicate IDs,
  consent/environment denial, HTTP 400/409/429/500, malformed CAPI responses,
  transient retry and timeout recovery. Tests replace network transport.
- Root-wide `npx tsc --noEmit` encounters pre-existing TypeScript annotations in
  `scripts/check-products.mjs`; app-scoped typechecks use the repository CI commands.
- Initial admin builds with a cross-worktree dependency junction omitted
  AdminShell from the client manifest. Installing this checkout's own locked
  dependencies offline and rebuilding cleanly resolved the failure, without
  changing admin application code. The original dependencies were preserved.
- Test proxy retries/cleanup preserve original failures; the TikTok confirmation
  fixture waits for settings fetches before replacing the document, avoiding
  WebKit cancellation/CORS noise. Existing TikTok payload assertions were retained.
- Inherited inventory tests include assertion-only contracts; no real Supabase
  transaction/concurrency test or production SQL execution is claimed.

The browser runner starts read-only local database fixtures and mocks checkout,
Meta SDK and all external transport. Run `node scripts/run-meta-isolated.mjs --build`
for a fresh storefront build/browser gate, add `--tiktok` for the existing
Chromium/WebKit TikTok regression, or use `--verify-all` for repository CI first.
Synthetic order/event fixtures never reach the production database or Meta.

## External verification and single operator handoff

The connected Ads connector exposes account **1439977298021248 — Buy N Try -
Pakistan - Main**. It does not expose Events Manager receipt/deduplication,
dataset ownership, sharing permissions, domain verification or Event Matching
Quality. The existing browser settings URL referenced dataset `1031175786614866`,
which differs from the configured website ID. Browser control could not read the
page, so this discrepancy is unresolved; do not change the website ID on that basis.

GitHub reported successful Vercel checks for base `3356a47` in both projects.
Those statuses do not prove current production alias/SHA mappings. Available
Vercel access returned project/scope-not-found for the linked team; actual
production deployments and preview isolation remain unverified.

Complete one operator session with the owning business administrator:

1. In Events Manager select **1707417188053568** explicitly. Record owner Business
   Portfolio, dataset name, connected ad accounts/partners, permitted people/system
   users, domain association and any catalogs/audiences/campaign dependencies.
   Resolve why the open settings page selected `1031175786614866` before sharing.
   Do not delete/transfer either dataset or remove old-account access.
2. Provision or confirm a valid dataset CAPI token as server-only
   `META_CONVERSIONS_API_ACCESS_TOKEN` in the authorized storefront environment.
   Keep the browser/server ID identical, normal mode enabled, test mode false,
   test code absent and API version v26.0. Do not paste the token into chat/report.
   These hosted changes require explicit approval; none were made here.
3. Authorize the exact reviewed candidate's commit/publication and, separately,
   deployment after reconciling it with the intended release branch. Verify both
   projects' branch suppression before push and inspect actual deployment/SHA
   mappings afterwards. Rebuild source with approved live environment settings;
   never upload the isolated fixture build.
4. In Test Events verify browser PageView/ViewContent/AddToCart/InitiateCheckout
   payloads and counts. For Purchase use an **approved isolated dataset** or obtain
   separate explicit authorization for a controlled real COD order. Record API
   acceptance separately from actual Events Manager receipt and deduplication.
   Verify matching name/ID/dataset/value for both delivery orders, browser blocked,
   delayed/retried server, refresh/replay and a second distinct order. Check
   Diagnostics, deduplication status and Event Matching Quality without assuming
   a guaranteed score. No fabricated Purchase may enter the live dataset.
5. Connect the same dataset to the specified target account using the applicable
   route below, with explicit asset-sharing authorization.

## Account-switch steps

**Keep and share the existing dataset**, subject to ownership/use permissions.
Sharing an authorized dataset does not require rebuilding website tracking or
changing its ID. A new ad account, its business ID and its ownership have not yet
been supplied/verified, so no sharing action was performed.

- **Same portfolio:** Business Settings → Data sources → Datasets (or Pixels) →
  dataset **1707417188053568** → Connected assets → Add assets → select the new
  ad account. Assign the advertising people/system users the required dataset
  use/manage permissions. Confirm that Ads Manager can select this dataset and
  Purchase for the new account. Preserve existing connections.
- **Different portfolio:** An administrator of the dataset's owning portfolio
  uses the dataset's Partners/Assign partner control to grant the target Business
  Portfolio ID the required use access. The receiving administrator assigns its
  people and new ad account to the shared dataset, then confirms selection in Ads
  Manager. Ownership stays with the original portfolio; the receiving portfolio
  cannot grant permissions the owner has not delegated. If sharing is unavailable,
  the owner must resolve Meta's ownership/account restrictions; that is not yet
  evidence that a new pixel is required.

Actual Meta API acceptance: **NOT TESTED**. Events Manager receipt: **NOT TESTED**.
Meta-recognized deduplication: **UNVERIFIED**. Domain/ownership/sharing: **UNVERIFIED**.
Production release remains gated on these checks and explicit authorization.

## Decision

**READY LOCALLY, LIVE VERIFICATION PENDING.** No known critical Meta source defect
remains in the tested scope. Browser payloads, local transport behavior and local
deduplication are verified. No actual Meta API acceptance, Events Manager receipt
or Meta-recognized deduplication is claimed. Token/configuration, asset ownership,
ad-account sharing, hosted deployment mapping and publication/deployment approval
remain operator gates. The bounded-delivery limitation above remains explicit.
