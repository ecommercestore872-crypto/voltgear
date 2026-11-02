# Buy N Try TikTok tracking release

Release branch: `codex/buyntry-tiktok-production-ready-20261102`.
Base: redesign commit `663a494a7e11d94d2abde6afb8a70720107b090b`.
Applicable tracking and idempotency changes were selectively reconciled from
`55142cd`; its complete release commit was not cherry-picked.

## Behavior

- Pixel initialization follows advertising consent without waiting for browser
  load or deferred UI. Remounts/navigation do not duplicate bootstrap/PageView.
- SDK retries are bounded, preserve the event queue, and recheck consent.
- Ecommerce payloads use catalog-compatible IDs, quantities, real snapshots and
  PKR. The default displayed product variant is used for initial ViewContent.
- Purchase uses only an accepted backend order snapshot, queues before
  navigation, and shares `purchase_<orderId>` with Events API 2.0. Replays can
  recover a missed browser event without repeating server side effects.
  Accepted retries are also recovered across deployments before stock/pricing
  revalidation, after checking the saved customer and cart match.
- Server delivery uses `/open_api/v1.3/event/track/`, checks HTTP and application
  success, and retries transient transport failures once with unchanged IDs and
  timestamps. Post-response continuation is registered synchronously.
- Demo orders and denied consent cannot emit TikTok Purchase. Generated COD
  email addresses are excluded from matching. Phone/email are normalized and
  hashed; tokens and raw customer data are not logged. Confirmation URLs no
  longer carry matching phone/email query parameters. Production events never
  include `test_event_code`.

## Reproducible local gate

Run `node scripts/run-tiktok-isolated.mjs --verify-all` with locked dependencies
and installed Playwright Chromium/WebKit browsers. The runner executes the full
CI suite, performance budgets and the production-build browser journey. It
starts a local read-only Supabase fixture, supplies dummy credentials/signing
values, mocks checkout and analytics, and stops its service processes.

Browser reports/screenshots are written to `tmp/tiktok-browser/`. Assertions
cover desktop, Android Chrome emulation and iPhone WebKit, including consent,
product/cart/checkout events, invalid submissions, HTTP 409/429/500, rapid double
submissions, accepted Purchase, refresh and idempotent replay. No real orders,
messages, courier shipments or TikTok conversions are created.

The generated local build uses fixture configuration. Do not publish its build
artifacts; an approved deployment must rebuild the tested source with the
storefront's authorized environment.

## External gates and release

Production advertising release remains **NO-GO** until authenticated TikTok
Test Events/Diagnostics confirms token validity, reception and deduplication.
Local mocked success is not evidence of live TikTok reception.

The optional `scripts/tiktok-synthetic-test.ts` probe now sends only a PageView
to Events API 2.0, with no fabricated product/order values. It requires explicit
`TIKTOK_ISOLATED_TEST_MODE=true`, `TIKTOK_TEST_PIXEL_ID`, an access token and
`TIKTOK_TEST_EVENT_CODE`. It must be used only with an authorized Test Events
workflow; it was not sent during local verification.

Push/draft PR creation is withheld until Git-triggered Preview services and
analytics are proven isolated. The available Vercel account could not inspect
the linked storefront team. No settings, credentials, deployments or database
schema were changed. Intended draft PR base: `redesign/storefront-production-polish`.

After reviewing the verified commit, obtain explicit approval before production
publication. Record its full SHA and the actual production deployment ID. The
rollback candidate is `2188a0b3cb1a9b4c689026a259c675e5a4a1ac8c` (the supplied
last-known production commit). Resolve and verify its storefront deployment ID
and alias before restoring it with approval. That deployment lookup remains
unverified; do not guess a deployment ID from a Git SHA.
Vercel rollback cannot undo orders or other external side effects.
