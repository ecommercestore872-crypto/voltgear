# Performance Baseline

## Status

Phase 1 does not modify runtime application behavior, so no performance improvement is claimed.

The earlier Vercel cost investigation established that repeated builds were the dominant metered cost, but a controlled storefront Core Web Vitals baseline belongs to Phase 7. That phase must capture mobile and desktop LCP, INP, CLS, JavaScript execution, image bytes, TTFB, and cache behavior before performance code changes.

## Phase 1 build baseline

- Framework at the Phase 1 baseline: Next.js 14.2.35. The current stacked source uses Next.js 15.5.28; no performance improvement is claimed without a controlled before/after measurement.
- CI runner target: GitHub-hosted Ubuntu with Node 24.
- Production runtime target: Vercel Node 24 in Sydney.
- Build timing will be recorded from the Phase 1 draft PR workflow because a clean Linux CI run is the reproducible comparison point.

## Deferred measurements

- Real-user 75th-percentile Core Web Vitals.
- Controlled 390px mobile and 1440px desktop lab journeys.
- Per-route server duration, cold starts, memory, and cache hit ratio.
- Bundle composition and route-specific JavaScript.

No performance claim should be made until those measurements exist.

## Phase 3 Vercel reliability and cost baseline

Captured read-only on 2026-10-16 from the `voltgear` production project. The
measurement window below is 2026-10-09 18:07 through 2026-10-16 18:07 UTC.

| Metric | Route | Observed value |
| --- | --- | --- |
| Function invocations | `/products/[category]` | 847, the highest route total |
| Function invocations | `/` | 306 |
| Function invocations | Six explicit policy/help routes | 861 combined |
| Function invocations | `/[slug]` | 94 |
| Active CPU | `/` | 175,312 ms total |
| Active CPU | `/products` | 101,250 ms total |
| Function duration p75 | `/` | 8,189 ms average across four-hour buckets |
| Function duration p75 | `/products` | 9,097 ms average across four-hour buckets |
| TTFB p75 | `/` | 7,436 ms average across four-hour buckets |

The six explicit routes in the combined row are `/about`, `/contact`, `/faq`,
`/privacy-policy`, `/shipping-returns`, and `/terms-of-service`. Runtime logs
also recorded repeated `Cannot find module .../app/<route>/page.js` failures for
those routes. A direct request still returned cached HTML with
`X-Vercel-Cache: STALE`; therefore a successful browser response did not prove
that background regeneration was healthy.

### Partial billing evidence

The Vercel FOCUS charge export for 16 adjacent daily windows reported by the API
as 2026-09-30 07:00 through 2026-10-16 07:00 UTC totals $4.1024 billed usage.
This is usage only, not the recurring Pro subscription price.

| Service | Billed usage | Share of the partial-window usage |
| --- | ---: | ---: |
| Build CPU Minutes | $2.8700 | 70.0% |
| Observability Events | $0.3703 | 9.0% |
| Fluid Provisioned Memory | $0.2408 | 5.9% |
| Fluid Active CPU | $0.1995 | 4.9% |
| Fast Origin Transfer | $0.1959 | 4.8% |
| ISR Writes | $0.1745 | 4.3% |
| Function Invocations | $0.0250 | 0.6% |

Build CPU is the dominant variable charge. The repository already skips
documentation-only and database-only Vercel builds. Phase 3 keeps the route fix
inside `apps/storefront`, so its preview should build `voltgear` while
`voltgear-admin` is skipped.

### Interpretation and remaining work

- The present $20 concern cannot be solved by traffic optimization alone when it
  is the recurring Pro plan charge. Plan eligibility and billing changes require
  a separate owner decision; this phase changes neither.
- The root route collision is a reliability defect and an avoidable source of
  failed ISR work. The Phase 3 preview must prove explicit routes are packaged
  as their own pages before this change is considered deployable.
- Home and product-list TTFB are high enough to justify a later, separately
  measured cache/query optimization. That work is not mixed into this route
  ownership fix.

## Phase 3 preview result

The exact source commit produced one ready storefront preview and one canceled
admin deployment. The storefront build generated 148 pages with connected
preview data. Six focused route requests returned their explicit route chunks,
and a deployment-scoped 24-hour query reported no missing-module, error, or
fatal logs. This verifies route packaging and build scoping; it is not a claim
that production latency or monthly billing has already changed.
