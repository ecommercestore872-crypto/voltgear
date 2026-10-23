# Admin feature inventory

2026-10-22; source baseline `2188a0b3cb1a9b4c689026a259c675e5a4a1ac8c`.
Deployed sources: `apps/admin` and `packages/shared`; not a generic dashboard review.
Classification is an engineering recommendation, not evidence of actual staff usage.
All routes below are relative to `/admin`. **Source presence is not runtime acceptance.**

| Feature / route | Business purpose and dependencies | Classification / next verification |
| --- | --- | --- |
| Dashboard `/` | Daily order/revenue/stock queues; order metrics RPC, catalog/reviews | OPTIMIZE; verify RPC deployment, status/date/demo accounting and fallback bounds |
| Orders `/orders`, `/orders/[orderId]` | Daily fulfillment, notes, inventory-safe lifecycle, PostEx, Sheets/email | FIX; booking mitigation implemented; coordinated cancellation reservation remains |
| Products `/products`, `/products/new`, `/products/[id]` | Catalog price/stock/media/variants and drafts | IMPROVED; combined server filters/count/page and new-form dirty protection implemented; editor CRUD/media acceptance remains |
| Shop types `/categories`, new/edit | Category discovery and product references | OPTIMIZE; cache dependency fixed; read-path seeding/count completeness need follow-up |
| Collections `/collections`, edit | Curated product groups; product references | KEEP provisionally; verify removed/stale references and publish propagation |
| Hero `/hero` | Campaign slides/images/product links/order | KEEP provisionally; verify draft/publish/reorder against isolated fixtures |
| Home layout `/home` | Section ordering/lifestyle configuration | SIMPLIFY candidate; assess overlap without removing routes |
| Homepage sections `/homepage-sections`, new/edit | Dynamic/curated merchandising | KEEP provisionally; verify previews, deterministic ordering, deleted products |
| Testimonials `/testimonials`, new/edit | Configured customer endorsements | IMPROVED; new-form unsaved protection enabled; publication acceptance remains; never fabricate endorsements |
| Discounts `/discounts` | Coupon eligibility/expiry/activation | KEEP provisionally; test timezone, minimums and checkout parity with mocks |
| Deals `/deals` | Bundles/suggested combinations/graphics | KEEP provisionally; test price authority, stale products, publishing |
| Reviews `/reviews` | Moderation/replies | KEEP provisionally; test approval transitions, authorization and pagination |
| Blog `/blog`, new/edit | Guides, SEO, publishing | OPTIMIZE; index draft payload and unsaved new content |
| Pages `/pages`, new/edit | Policy/content management | OPTIMIZE; same editor/index boundary as blog |
| Inbox `/inbox` | Support follow-up/status/notes | IMPROVED; counted server pages beyond 200, note-change confirmation; mutation and browser Back acceptance remain |
| Customers `/customers`, `/customers/[key]` | Order-derived customer directory | IMPROVED; failures no longer fake empty, table scrolls; fallback total accuracy and complete workflow acceptance remain |
| Newsletter `/newsletter` | Subscriber management/export | IMPROVED; counted pages and bounded complete CSV path replace 500-row cutoff; consent/mutation live acceptance remains |
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

## Product deep audit — 2026-10-23

Preserved draft chain: #23 `3012b8d` -> #24 `bb0a127` -> #25 `48a96ce`,
all OPEN/DRAFT at reconciliation. Product work branches from #25, not stale local main.

Reference practices were checked against official Shopify documentation: separate
selling/compare-at/internal cost, explicit product state and search preview
([product details](https://help.shopify.com/en/manual/products/details/product-details-page));
featured image ordering and upload/error workflows
([media](https://help.shopify.com/en/manual/products/product-media/add-media));
descriptive image alternatives
([alt text](https://help.shopify.com/en/manual/products/product-media/add-alt-text));
variant editing ([variants](https://help.shopify.com/en/manual/products/variants/edit-variants))
and flexible specialized attributes ([metafields](https://help.shopify.com/en/manual/custom-data/metafields)).
These are comparison references, not a requirement to copy Shopify's inventory ledger,
multi-location model or every optional field. The findings below are from Buy N Try source.

### Field-level gap matrix

"Present" means source implementation found; it does not certify deployed acceptance.
"Improved" means current source changes, subject to the verification matrix.

| Capability | Existing implementation / gap | Classification, priority and action | Current status |
| --- | --- | --- | --- |
| Name / identity | Product UUID; name field; automatic new-product slug | Present, P1 duplicate/malformed API validation still needed | Preserve; raw-input follow-up |
| Editable slug | Auto-generated for new products, no editor input | Essential missing UX, P3; expose existing slug with uniqueness/old-URL plan | Not implemented |
| Category / collections | Assignable category selector and collection picker | Present but improve P1; Save Draft currently changes live memberships | Source audit; atomic draft/live follow-up |
| Brand / SKU | Schema/types/mapping support both; editor lacks inputs | Needs improvement P3; expose existing fields, no duplicate columns | Not implemented |
| Summary / description | Text summary and safe structured-content conversion; paragraph/list formatting | Present; round-trip rich content fidelity needs fixtures | Preserve, not blanket-certified |
| Features / specifications | Reusable list and label/value specification editor | Present; category-aware optional templates justified, not required fields | Reuse existing model; no fabricated values |
| Model / usage notes | Can use specifications/features | Optional P3; dedicated model column unnecessary without business reason | No schema expansion |
| Warranty / returns | Store-level policy/settings, flexible specs/FAQ for product exceptions | Needs specification P3; do not duplicate policy or invent durations | No new warranty claims |
| Compatibility / package contents | Existing string-list editors | Present; publish/round-trip acceptance needed | Preserve |
| FAQs | ProductDocument supports FAQs; full editor has no FAQ control | Needs improvement P3; expose existing supported structure | Not implemented |
| Selling / compare-at / cost | Three existing fields; internal cost excluded by public map | Improve P1 invalid numeric/raw input and clearing behavior; clear PKR labels | Labels improved; server validation next |
| Zero-price publication | Current publish gate permits zero while checkout rejects it | P1 correctness; raw validation plus positive sellable-price gate | OPEN, release-blocking |
| Quantity / availability | Product-level quantity; null untracked, zero sold out, status separate | P1; invalid/omitted quantity must not become untracked | Explanatory copy improved; server fix next |
| Concurrent stock | Checkout decrements product quantity; publisher can overwrite from stale editor | P1 data integrity; stock baseline/revision check in locked transaction | OPEN; isolated SQL test/design required |
| Color / size | Enabled axes generate combinations, product quantity shared | Present; do not imply independent variant stock | All image upload busy events connected |
| Other axes / per-variant price | Legacy variant model has price/SKU/image; current axes UI is Color/Size | Optional/needs business decision P3; preserve existing values | No new inventory ledger |
| Photos / cover / reorder | Ordered URL list, first image acts as cover, Move Up/Down | Present but unsafe immediate byte deletion | Improved: unlink-only; no automatic physical cleanup |
| Upload status / failures | Busy spinner and error UI, original boundary weak | P1; validate before providers; block all product saves while pending | Improved; tests distinguish mocks from real providers |
| Batch / drag-drop / percent progress | Single-file picker and URL paste | Optional P3; safe queue/progress design after baseline reliability | Deferred; not called implemented |
| Alt text | String URL image model; no per-image alt editor | Accessibility gap P3; design persistence plus actual gallery use | No unused UI-only field added |
| Product/social video | Existing video data and Instagram/TikTok links, optional poster | Present; editor hydration missed live social links | Hydration improved; real provider playback unverified |
| Save / publish controls | Existing sticky PublishBar; new draft button was non-sticky | P1 duplicate/async protection; explicit Draft vs Unpublished state | Improved synchronous lock, pending guard, sticky new Save |
| Unsaved / discard | Dirty hook exists; unpublish marked unsaved content clean; discard used stale initial live data | P1 editor reliability | Improved own-session snapshots and membership reset; external edit conflicts remain |
| Reviews | Separate moderation; slim editor emits empty reviews, publisher replaces them | P1 preserve moderation-owned data atomically | OPEN; review/publish transaction follow-up |
| Draft/live flags | Draft save directly writes live is_demo/cost and memberships | P1 draft/live separation | OPEN; do not mark product lifecycle accepted |
| SEO title / description | PDP derives metadata from product data; no custom product SEO controls | Essential follow-up P3; actual persisted metadata + public output, not decorative inputs | Not implemented |
| Canonical / structured data | Existing PDP canonical and Product JSON-LD | Present; slug redirects, availability and claim quality require tests | Preserve; source audit only |
| Public data confidentiality | Public map/slim queries exclude costPrice/cost_price | Source boundary checked, not live RLS assurance | No application leak established |
| Large product lists | #25 counted server filters before range; page-scoped drafts | Implemented + tested prior batch; category count scans still bounded incorrectly | Preserve; performance measurements pending |
| Bulk / duplicate / CSV | No new bulk product editor introduced | Optional P5; needs dry-run, validation, row errors and actual operator need | Deferred, not business-essential by default |
| Multi-location stock / multi-currency / gift-card fields / 3D | No demonstrated Buy N Try requirement | Unnecessary now; would add schema/workflow burden | Do not implement |

### Product form blueprint and execution sequence

Keep the current branding and reusable components. Everyday sections: identity and
description; photos/cover; selling/compare-at/internal cost; quantity/availability and
existing axes; specifications/compatibility/package contents. Secondary controls:
category/collections, publication, supported social links, FAQs, existing advanced
merchandising. SEO/alt controls must persist to the public page before they are added.

Draft requires a title, generated valid slug and assignable category under the current
contract; incomplete marketing/specification fields remain optional. Publishing needs
valid positive purchase prices, valid image references, consistent axes and quantity;
server validation remains authoritative. Never infer stock, reviews, warranty or claims.

1. Media/editor safety: unlink-only, fail-closed destructive media API, validation,
   all-upload locking, repeat-save prevention and accurate pending/dirty state.
2. Product write integrity: raw validation, omitted/null quantity semantics, draft/live
   flags/membership, moderation data preservation and atomic stock concurrency design.
3. Product essentials/UX: existing slug/brand/SKU/FAQ, coherent field groups and truthful
   metadata/alt persistence. No wholesale redesign or speculative bulk system.
4. Measure authenticated performance in isolated data; retain #23-25 improvements.
5. Address previous session/courier/read-side-write blockers, then independent release
   review. Production changes and real mutation tests still require separate approval.
