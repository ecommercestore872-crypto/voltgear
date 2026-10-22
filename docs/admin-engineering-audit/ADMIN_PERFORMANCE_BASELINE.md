# Performance baseline and evidence limits

Baseline source: `2188a0b`; Node 24.14.0, Next 15.5.28, Windows local worktree.
No authenticated isolated database, production query plans or staff RUM were supplied.
Consequently **cold/warm business-route latency, hydration, payload bytes and database
timings have not been measured**. Build sizes are not runtime measurements.

| Workload | Source baseline | Current source / verification |
| --- | --- | --- |
| Command product search | Product/image query + dependent draft-ID query, max 120 candidates | One `id,name,slug` query, same candidate/filter/ranking contract; mocked query-call tests |
| Orders list navigation | One list/exact-count request + six global HEAD counts | Unchanged; no shared cache added to sensitive order data |
| Product cold category counts | Two independent products.category readers | Unchanged scans; count-bearing category cache now depends on product invalidation |
| Dashboard preferred path | Order aggregate RPC + four catalog queries + pending-review count | Preserved; deployed RPC availability unverified |
| Dashboard fallback | Multiple overlapping/bounded-by-provider order reads | Unchanged; do not label totals complete without deployed-path/cardinality check |
| Page/blog index | Draft JSON loaded for presence badge | Unchanged; narrow projection follow-up |
| Product combined search | Max 120 candidates, then client filtering; incorrect totals/pages | One exact-count filtered query plus page-only draft lookup, max 48 default rows; category scans unchanged |
| Inbox/newsletter lists | Up to 200/500 records serialized, then browser filters | 50-row counted server pages; exact counts may have DB cost, not yet timed |
| Newsletter CSV | First 500 subscribers only | Bounded 500-row keyset batches; complete synthetic 607-subscriber fixture, not live timed export |
| Command dialog | Dynamic component mounted on every admin page | Loaded on first open, retained afterward for close focus; no route latency claim |

Next controlled measurement protocol:

1. Verify preview DB/provider isolation without revealing values; otherwise use synthetic local fixtures.
2. Record exact commit, runtime/build mode, region, dataset size, browser/CSS viewport,
   cache state, network/CPU settings. Separate first cold request from repeated warm samples.
3. Measure dashboard, orders/detail, products/editor, customers, promotions, messaging,
   settings. Record server time, request count, transfer/serialized bytes, JS, long tasks,
   table interaction and query timings. Report sample count/median/p95, not one best run.
4. Use existing sanitized admin API/Supabase timing logs; never log query/customer payloads.
5. Use read-only EXPLAIN for observed slow queries before suggesting indexes/RPC changes.
6. Compare the same fixtures/configuration before and after. Check fresh order/stock state;
   never cache PII publicly to improve a score.

No millisecond, percentage, Lighthouse or universal speed improvement is claimed.

## Observed local production-build comparison

Same Node/Next/worktree build configuration, no production environment file:
the earlier combined build reported `/admin/orders/[orderId]` first-load JS **257 kB**;
after extracting the client-safe email-history marker, final build reported **132 kB**.
That is a 125 kB reduction in Next's build estimate, not transferred-byte, hydration,
route-latency or user-speed evidence. The final build also contains the small search
race correction; no runtime causal percentage is claimed.
