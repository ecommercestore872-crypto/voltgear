# Security review

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
