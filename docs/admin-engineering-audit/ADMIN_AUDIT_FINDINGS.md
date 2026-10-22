# Confirmed admin findings

Source reviewed 2026-10-22 from `2188a0b`; no production data queried.
Severity reflects business impact, not proof of exploitation. Paths are repository-relative.

| ID | Priority | Evidence / consequence | Resolution |
| --- | --- | --- | --- |
| A01 | High | `lib/postex-book-order.ts`, `postex-book-order-db.ts`: tracking-only booking guard and unconditional processing update allowed terminal/demo orders to reach live courier | Mitigated: eligibility before provider; conditional claim/finalize; zero rows fail; UI mirrors eligibility |
| A02 | High, conditional | `lib/admin.ts`: automatic cookie credentials accepted unsafe sibling-origin requests; Lax does not isolate sibling origins | Fixed in source: exact trusted Origin for unsafe cookie requests; bearer unaffected; explicit proxy-origin configuration required |
| A03 | Medium | `lib/admin-session.ts`: deterministic session digest has no server expiry/revocation | OPEN: timed/revocable sessions and recovery/logout invalidation need a separately verified auth change |
| A04 | High | `postex-book-order-db.ts` reservation and cancellation RPC are not coordinated | OPEN: cancellation after claim can still leave a real shipment requiring reconciliation; mitigation prevents terminal overwrite, not external atomicity |
| A05 | P1 | `apps/admin/app/admin/products/page.tsx`, `lib/db/admin-product-read-store.ts`: 120 search results fetched before local stock filtering; category/page ignored | Fixed source/query contract: one counted query combines search/category/stock before range, page-scoped draft flags, URL-backed filters and stale-response protection; isolated DB acceptance remains |
| A06 | P1 | `lib/db/inbox-store.ts` newest 200 filtered in browser; newsletter store/export newest 500 | Fixed source: counted server filters with 50-row pages; separate 500-row keyset export batches, initial errors return 503, later stream errors abort; not a transactional snapshot |
| A07 | P1 | product/page/testimonial forms pass `!isNew` to dirty tracking; palette uses router navigation outside anchor guard | Partial: new forms protected; keyboard palette uses real anchor; inbox selection/filter changes confirm unsaved notes; browser Back behavior remains unverified and is not certified |
| A08 | P2 | `components/admin/order-list.tsx`: restored session query could label unfiltered results; debounce could navigate after tab/detail change | Fixed in source: URL authoritative; pending navigation cancelled; accessible tab/paginator state |
| A09 | P2 | `lib/db/admin-category-store.ts`: count-bearing shop-type cache lacked product-write tag | Fixed dependency wiring; actual runtime invalidation unverified |
| A10 | P2 | `/api/admin/search` fetched product image relations and serial draft IDs, discarded them | Fixed source query contract: narrow one-query product lookup; candidate/scoring bounds preserved |
| A11 | P2 | `lib/db/admin-orders-store.ts`: list plus six HEAD exact counts per navigation | OPEN: assess aggregate RPC with plans; do not trade freshness for speed |
| A12 | P2 | Product category counts independently scan categories twice on cold listing | OPEN: shared counted loader; assess row-cap accuracy; no speculative index added |
| A13 | P2 | `lib/db/admin-page-store.ts`: index includes full draft sections for a badge | OPEN: narrow draft-presence projection without editor data loss |
| A14 | P2 | Command palette keyboard-only, custom modal lacks focus containment/restoration, requests can race | Fixed source: visible desktop/mobile triggers, existing Radix dialog, lazy first mount, focus trap/restoration, abort plus stale-response guard; synthetic browser keyboard checks passed |
| A15 | P2 | Customers page catches DB errors as empty business; nowrap table inside overflow-hidden | Fixed source: DB errors reach retryable route boundary and horizontal table scrolling; mocked page rejection tested; complete customer workflow acceptance remains |
| A16 | Safety | `admin-category-store.ts:listAdminShopTypesUncached` calls `ensureFallbackShopTypes`; `admin-settings-store.ts` calls setup on reads | OPEN: GET/page visits are not automatically read-only; do not point browser tests at production; separate explicit initialization from reads |
| A17 | P2 | Browser reproduced OrderList hydration error: server default locale differed from browser date format | Fixed order list/detail; extended explicit en-GB / Asia-Karachi formatters to inbox/newsletter, with timezone tests; other date surfaces not blanket-certified |
| A18 | P2 | Order-detail client imported email rendering/signing transitively through one email-history marker in `order-rules.ts` | Extracted client-safe marker; compatibility tests and build comparison; no claim about secret values reaching client |
| A19 | P1 release reliability | Initial PR25 Vercel checks green but deployments CANCELED; logs show ignored-build skip. `vercel-ignore-build.mjs` used HEAD^ when no prior baseline, which misses earlier source commits in a multi-commit push ending in docs | Conservative source fix: missing/zero baseline continues build, verified ranges retain scoped skipping; regression tests exercise actual script with controlled process/git dependencies. Require actual Ready status, not green check alone |

Existing lifecycle SQL, HMAC email actions, route authentication, lightweight order lists,
dashboard aggregate RPC and self-hosted admin fonts were retained. No unauthenticated
IDOR was established in the reviewed admin surface. This is not a complete penetration test.

Use specialist follow-up batches: security/session; operational list completeness;
catalog filtering/pagination; navigation/forms; CMS/communications; measured rendering.
