# Performance Baseline

## Status

Phase 1 does not modify runtime application behavior, so no performance improvement is claimed.

The earlier Vercel cost investigation established that repeated builds were the dominant metered cost, but a controlled storefront Core Web Vitals baseline belongs to Phase 7. That phase must capture mobile and desktop LCP, INP, CLS, JavaScript execution, image bytes, TTFB, and cache behavior before performance code changes.

## Phase 1 build baseline

- Framework: Next.js 14.2.35.
- CI runner target: GitHub-hosted Ubuntu with Node 24.
- Production runtime target: Vercel Node 24 in Sydney.
- Build timing will be recorded from the Phase 1 draft PR workflow because a clean Linux CI run is the reproducible comparison point.

## Deferred measurements

- Real-user 75th-percentile Core Web Vitals.
- Controlled 390px mobile and 1440px desktop lab journeys.
- Per-route server duration, cold starts, memory, and cache hit ratio.
- Bundle composition and route-specific JavaScript.

No performance claim should be made until those measurements exist.
