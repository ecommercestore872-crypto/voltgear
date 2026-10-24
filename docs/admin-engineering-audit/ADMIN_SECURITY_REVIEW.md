# Security review

## Atomic collection follow-up — draft PR30

Independent read-only transaction review found and drove fixes for automatic-pin
compatibility and product-delete cascade lock order. The latest inspected SQL core has
no further identified source-level transaction blocker; actual isolated tests passed.
[Release safety review and target manifest](COLLECTION_INTEGRITY_ACCEPTANCE.md) retain
old-writer cutoff, separate exact migration approval and preservation of live order /
courier services. No stage/provider acceptance or independent whole-system certification
is implied. Production-connected previews must never be synthetic mutation targets.

## 2026-10-24 focused product-integrity review

Independent read-only database/security findings and coordinator follow-up fixes are
documented in [PRODUCT_INTEGRITY_V2.md](PRODUCT_INTEGRITY_V2.md). Catalog mutations use
the versioned service-role-only RPC with CAS and no legacy fallback. Catalog publishing
does not write moderation-owned reviews/aggregates. No production migration has run.
Old direct-write admin versions must be drained before rollout; revoking old RPCs alone
is insufficient. Concurrent explicit membership edits remain an identified release risk.

Source-only initial review, 2026-10-22. No real provider/customer mutations or database SQL.

## Boundaries checked

- Middleware covers admin pages/APIs, messaging, order aliases and IndexNow. Reviewed
  handlers also authenticate. Public login/recovery/signed quick actions are separate.
- Master bearer secret and HMAC-derived HttpOnly cookie are distinct. Cookie is Secure
  in production, SameSite=Lax. Cookie maxAge is **not server-side expiry/revocation**.
- Unsafe cookie methods now require the request URL's exact Origin or an explicitly
  configured public admin Origin. Missing/opaque/cross-origin origins fail closed.
  Bearer-secret integrations do not rely on automatic browser credentials and remain valid.
- Supported proxy compatibility is explicit: on admin, `ADMIN_PUBLIC_URL` must identify
  the trusted public admin entry point; alternatively explicit `ADMIN_SAME_ORIGIN=1/true`
  permits `NEXT_PUBLIC_SITE_URL`. A generic shop URL alone is not an admin allowlist.
  No wildcard/suffix/forwarded-host trust. No live environment was changed.
- Read-only Vercel CLI metadata check confirmed `voltgear-admin` project ID
  `prj_LgVWqruDirgQKMPgDgH0zpHtrC6K`, root `apps/admin`, Node 24.x.
  Supabase URL/service-role configuration targets production and preview together;
  preview is not an isolated mutation-test environment. Provider variable names also
  exist in preview. No values were printed, decrypted into reports or changed.
  `ADMIN_PUBLIC_URL` and `ADMIN_SAME_ORIGIN` were absent from admin project metadata;
  configure an exact approved public admin origin before releasing to a proxied host.
  Direct-host mode does not require that additional origin.
- PostEx now excludes demo and non-pre-dispatch states before provider work; conditional
  writes repeat eligibility. Finalize requires owning claim and empty tracking, checks rows.
  Conflict retains manual reconciliation behavior rather than reopening terminal orders.
- Existing atomic order lifecycle and cancellation/inventory restoration SQL retained;
  no ad-hoc status write replacement or checkout pricing change introduced.

## Release blockers / incomplete assurance

1. Deterministic browser sessions need authenticated expiry, identity binding and revocation
   on logout/password recovery/allowlist change. A copied cookie remains valid today.
2. Cancellation must coordinate with courier reservation to prevent a shipment created
   during cancellation. Current mitigation avoids status overwrite but cannot make an
   external API call part of a PostgreSQL transaction.
3. Verify direct and configured proxy cookie flows in isolated deployment before release.
4. Read helpers can initialize category/settings rows; production navigation tests are
   not allowed until read/write boundaries are separated or isolation is confirmed.

No full dependency-advisory, RLS penetration, upload fuzzing, role matrix, recovery-email,
or deployed-secret/config review is claimed. Those remain separate safe audit steps.
No sensitive payloads belong in reports, screenshots, logs or PRs.

## Operational-list follow-up

List/export handlers retain admin authentication and the existing mutation Origin gate.
New query normalizers bound page/search input and remove PostgREST filter punctuation
and wildcard characters before interpolation; equality filters are not string-built ORs.
List/export reads use the existing no-store service-client mode. Newsletter download is
authenticated, no-store, and streams bounded batches; CSV formula escaping is preserved.
No new public business-data endpoint, dependency, SQL migration or provider action added.
Local browser fixtures contained synthetic data and an unreachable Supabase URL; fixture
source was removed before staging. Shared production/preview isolation warning still applies.

## Product media boundary — 2026-10-23

Authenticated upload DELETE returns 409 without provider side effects; URL unlinking
does not authorize deleting live/shared bytes. The follow-up below removes the
product-deletion cleanup path as well; reference-aware orphan cleanup stays deferred.
POST checks metadata before buffering, MIME/extension/signature consistency, and real
raster decoding with existing Sharp under a 40-million-pixel bound. File limit is
4,000,000 bytes, leaving multipart headroom below the hosting ceiling
([Vercel limits](https://vercel.com/docs/functions/limitations)).
HEIC/HEIF headers are not full local decoding: successful provider WebP conversion is
required; raw originals never fall back to Storage. Transport timeouts, 5xx and malformed
success can persist ambiguously; no auto-retry/second-provider copy. Generic errors omit
provider secrets. Tests use synthetic raster bytes and mocked providers, not live bucket
policies, malware scanning or production integration. Prior release blockers remain.

## Product deletion follow-up — shared media

The product deletion adapter no longer calls Storage remove. A URL in one product's
live/draft image list is not proof that the file is unreferenced elsewhere. Existing
route authorization and product-row deletion behavior are unchanged. Five mocked
adapter regressions prove no Storage access and no invalidation on a failed delete;
this is not an RLS/cascade/live-provider integration test. Retained unused files are
an explicit safety tradeoff; no orphan purge, migration or real deletion was run.

Rendered follow-up used an isolated browser context and localhost-only synthetic data.
All API calls were intercepted in the temporary fixture; no production preview was
mutation-tested. No cookies, tokens or other authentication material were inspected.
Temporary fixture source/cache removed and dev server stopped before the final gate.
