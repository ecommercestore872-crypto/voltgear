# Confirmed admin findings

Source reviewed 2026-10-22 from `2188a0b`; no production data queried.
Severity reflects business impact, not proof of exploitation. Paths are repository-relative.

| ID | Priority | Evidence / consequence | Resolution |
| --- | --- | --- | --- |
| A01 | High | `lib/postex-book-order.ts`, `postex-book-order-db.ts`: tracking-only booking guard and unconditional processing update allowed terminal/demo orders to reach live courier | Mitigated: eligibility before provider; conditional claim/finalize; zero rows fail; UI mirrors eligibility |
| A02 | High, conditional | `lib/admin.ts`: automatic cookie credentials accepted unsafe sibling-origin requests; Lax does not isolate sibling origins | Fixed in source: exact trusted Origin for unsafe cookie requests; bearer unaffected; explicit proxy-origin configuration required |
| A03 | Medium | `lib/admin-session.ts`: deterministic session digest has no server expiry/revocation | OPEN: timed/revocable sessions and recovery/logout invalidation need a separately verified auth change |
| A04 | High | `postex-book-order-db.ts` reservation and cancellation RPC are not coordinated | OPEN: cancellation after claim can still leave a real shipment requiring reconciliation; mitigation prevents terminal overwrite, not external atomicity |
| A05 | P1 | `apps/admin/app/admin/products/page.tsx`, `lib/db/admin-product-read-store.ts`: 120 search results fetched before local stock filtering; category/page ignored | OPEN: one counted server query applying all filters before pagination; separate command-search optimization does not solve this |
| A06 | P1 | `lib/db/inbox-store.ts` newest 200 filtered in browser; newsletter store/export newest 500 | OPEN: server predicates/page totals; separate complete export path; older unresolved records otherwise inaccessible |
| A07 | P1 | product/page/testimonial forms pass `!isNew` to dirty tracking; palette uses router navigation outside anchor guard | OPEN: protect new forms, programmatic navigation and inbox note selection; browser Back behavior needs real regression |
| A08 | P2 | `components/admin/order-list.tsx`: restored session query could label unfiltered results; debounce could navigate after tab/detail change | Fixed in source: URL authoritative; pending navigation cancelled; accessible tab/paginator state |
| A09 | P2 | `lib/db/admin-category-store.ts`: count-bearing shop-type cache lacked product-write tag | Fixed dependency wiring; actual runtime invalidation unverified |
| A10 | P2 | `/api/admin/search` fetched product image relations and serial draft IDs, discarded them | Fixed source query contract: narrow one-query product lookup; candidate/scoring bounds preserved |
| A11 | P2 | `lib/db/admin-orders-store.ts`: list plus six HEAD exact counts per navigation | OPEN: assess aggregate RPC with plans; do not trade freshness for speed |
| A12 | P2 | Product category counts independently scan categories twice on cold listing | OPEN: shared counted loader; assess row-cap accuracy; no speculative index added |
| A13 | P2 | `lib/db/admin-page-store.ts`: index includes full draft sections for a badge | OPEN: narrow draft-presence projection without editor data loss |
| A14 | P2 | Command palette keyboard-only, custom modal lacks focus containment/restoration, requests can race | OPEN: visible trigger, existing dialog primitives, request cancellation; no broad redesign |
| A15 | P2 | Customers page catches DB errors as empty business; nowrap table inside overflow-hidden | OPEN: retryable error and responsive overflow/fixture checks |
| A16 | Safety | `admin-category-store.ts:listAdminShopTypesUncached` calls `ensureFallbackShopTypes`; `admin-settings-store.ts` calls setup on reads | OPEN: GET/page visits are not automatically read-only; do not point browser tests at production; separate explicit initialization from reads |
| A17 | P2 | Browser reproduced OrderList hydration error: server default locale differed from browser date format | Fixed order list/detail with one explicit en-GB / Asia-Karachi formatter; other date surfaces not blanket-certified |
| A18 | P2 | Order-detail client imported email rendering/signing transitively through one email-history marker in `order-rules.ts` | Extracted client-safe marker; compatibility tests and build comparison; no claim about secret values reaching client |

Existing lifecycle SQL, HMAC email actions, route authentication, lightweight order lists,
dashboard aggregate RPC and self-hosted admin fonts were retained. No unauthenticated
IDOR was established in the reviewed admin surface. This is not a complete penetration test.

Use specialist follow-up batches: security/session; operational list completeness;
catalog filtering/pagination; navigation/forms; CMS/communications; measured rendering.
