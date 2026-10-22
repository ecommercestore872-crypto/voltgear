# Admin feature inventory

2026-10-22; source baseline `2188a0b3cb1a9b4c689026a259c675e5a4a1ac8c`.
Deployed sources: `apps/admin` and `packages/shared`; not a generic dashboard review.
Classification is an engineering recommendation, not evidence of actual staff usage.
All routes below are relative to `/admin`. **Source presence is not runtime acceptance.**

| Feature / route | Business purpose and dependencies | Classification / next verification |
| --- | --- | --- |
| Dashboard `/` | Daily order/revenue/stock queues; order metrics RPC, catalog/reviews | OPTIMIZE; verify RPC deployment, status/date/demo accounting and fallback bounds |
| Orders `/orders`, `/orders/[orderId]` | Daily fulfillment, notes, inventory-safe lifecycle, PostEx, Sheets/email | FIX; booking mitigation implemented; coordinated cancellation reservation remains |
| Products `/products`, `/products/new`, `/products/[id]` | Catalog price/stock/media/variants and drafts | FIX; combined search/category/stock pagination and new-form dirty protection remain |
| Shop types `/categories`, new/edit | Category discovery and product references | OPTIMIZE; cache dependency fixed; read-path seeding/count completeness need follow-up |
| Collections `/collections`, edit | Curated product groups; product references | KEEP provisionally; verify removed/stale references and publish propagation |
| Hero `/hero` | Campaign slides/images/product links/order | KEEP provisionally; verify draft/publish/reorder against isolated fixtures |
| Home layout `/home` | Section ordering/lifestyle configuration | SIMPLIFY candidate; assess overlap without removing routes |
| Homepage sections `/homepage-sections`, new/edit | Dynamic/curated merchandising | KEEP provisionally; verify previews, deterministic ordering, deleted products |
| Testimonials `/testimonials`, new/edit | Configured customer endorsements | FIX; new-form unsaved protection; never fabricate endorsements |
| Discounts `/discounts` | Coupon eligibility/expiry/activation | KEEP provisionally; test timezone, minimums and checkout parity with mocks |
| Deals `/deals` | Bundles/suggested combinations/graphics | KEEP provisionally; test price authority, stale products, publishing |
| Reviews `/reviews` | Moderation/replies | KEEP provisionally; test approval transitions, authorization and pagination |
| Blog `/blog`, new/edit | Guides, SEO, publishing | OPTIMIZE; index draft payload and unsaved new content |
| Pages `/pages`, new/edit | Policy/content management | OPTIMIZE; same editor/index boundary as blog |
| Inbox `/inbox` | Support follow-up/status/notes | FIX; server filters/pagination beyond 200, note-loss protection |
| Customers `/customers`, `/customers/[key]` | Order-derived customer directory | FIX; load failure differs from empty; responsive table, fallback total accuracy |
| Newsletter `/newsletter` | Subscriber management/export | FIX; 500-row cutoff affects listing/export completeness |
| Messaging `/broadcast` | Consent-aware campaigns/recipient reporting | RETAIN AS ADVANCED; provider-only mocks, dedup/retry/opt-out acceptance still needed |
| Settings `/settings` | Branding/nav/SEO/operational policy | KEEP provisionally; verify fresh drafts, validation, read-path setup writes |
| Order emails `/order-emails` | Transactional template editing | RETAIN AS ADVANCED; test template escaping and notification idempotency |
| Email sending `/email-sending` | Sender configuration | RETAIN AS ADVANCED; no real sends in this audit |
| Invoice `/invoice` | Template configuration/preview | RETAIN AS ADVANCED; verify saved template and synthetic order output |
| Promotions `/promotions` | Existing promotion surface outside sidebar | REVIEW overlap with discounts; preserve URL/functionality pending workflow evidence |
| Login/forgot/reset-password | Staff access and recovery | FIX; Origin protection added; session expiry/revocation remains |

Existing sidebar already groups daily operations, catalog, storefront, merchandising,
content and communication. No screen was removed or renamed. No analytics were
available to justify retiring functionality or claiming click/time savings.

Next acceptance order: lifecycle/session safety; complete operational lists;
catalog search and dirty forms; accessible navigation; CMS/communication fixtures;
authenticated responsive/performance checks; independent release review.
