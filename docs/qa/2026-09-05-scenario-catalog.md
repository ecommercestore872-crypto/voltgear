# QA Scenario Catalog — Buy n Try store — 2026-09-05

## Meta

- Branch inventoried: main @ 95790cc
- Current working branch: main
- App root: `e commerce store/`
- Production URL (from last deploy): https://voltgear-pi.vercel.app
- Local default: http://localhost:3000
- Roles under test: shopper (guest COD checkout), admin (`ADMIN_TOKEN` cookie at `/admin/login`), demo (`/demo/login` demo/demo)
- Scope: **user-requested launch slice** — admin controls that drive the storefront, Autopilot, analytics, messaging, emails, order flow, navbar/footer/logo, newsletter, compare. Full-app inventory is listed; scenario rounds start after inventory approval.
- UI under test may later differ from main if implementation branches.

## Feature inventory

| ID | Feature | Area | Notes |
|----|---------|------|-------|
| F-001 | Admin login / logout | Admin auth | `/admin/login`, cookie `vg_admin`, middleware on `/admin/*` |
| F-002 | Admin Home snapshot | Admin | `/admin` — today tiles, Needs you, demo purge |
| F-003 | Orders list + filters | Admin | `/admin/orders` |
| F-004 | Order detail + status change | Admin | `/admin/orders/[orderId]` — new→processing→shipped→delivered / cancelled |
| F-005 | Manual PostEx book from order | Admin / courier | Order detail books via `/api/admin/postex/book` (auth gap to verify) |
| F-006 | Products CRUD + publish | Admin catalog | `/admin/products` draft/save/publish |
| F-007 | Shop types (categories) | Admin catalog | `/admin/categories` — drives Gadget shop dropdown |
| F-008 | Collections + home slots | Admin catalog | `/admin/collections` bestsellers/featured/offers |
| F-009 | Pages CMS | Admin content | `/admin/pages` |
| F-010 | Hero slides | Admin content | `/admin/hero` |
| F-011 | Home layout toggles | Admin content | `/admin/home` — section order |
| F-012 | Homepage-sections CMS | Admin content | `/admin/homepage-sections` — **not wired to live homepage** |
| F-013 | Testimonials | Admin content | `/admin/testimonials` |
| F-014 | Inbox (contact + complaints) | Admin customers | `/admin/inbox` |
| F-015 | Customers CRM | Admin customers | `/admin/customers` + profile |
| F-016 | Review approvals | Admin customers | `/admin/reviews` |
| F-017 | Messaging — SMS/WhatsApp broadcast | Admin marketing | `/admin/broadcast` SMS tab; order phones auto-listed |
| F-018 | Messaging — marketing email | Admin marketing | Email tab; T-29 saved templates; Resend |
| F-019 | Discount / promo codes | Admin marketing | `/admin/discounts` — real. `/admin/promotions` is mock |
| F-020 | Analytics console | Admin | `/admin/analytics` — delivered-revenue + funnel |
| F-021 | Site settings | Admin | Brand, logo URL, contact, shipping, SEO, announcement |
| F-022 | Autopilot #1 Order-to-Dispatch | Admin automation | Settings toggle; validator + dispatch API; **no cron** |
| F-023 | Autopilot #2 Delivery Rescue | Admin automation | Toggle only; engine unused |
| F-024 | Autopilot #3 COD Settlement | Admin automation | Toggle only; engine unused |
| F-025 | Autopilot #4 Inventory & Reorder | Admin automation | Toggle only; engine unused |
| F-026 | Autopilot ads / command / exception UIs | Admin automation | Ads page + dead dashboards; not in sidebar |
| F-027 | Cmd+K admin search | Admin | Jump to order/product/customer |
| F-028 | Demo sandbox | Admin / demo | `/demo/login`, is_demo rows, purge |
| F-029 | Storefront Gadget navbar | Storefront chrome | Hardcoded BntWordmark + PRIMARY_LINKS; shop types from admin |
| F-030 | Storefront Gadget footer | Storefront chrome | Company/Care hardcoded; contact from settings |
| F-031 | Footer newsletter | Storefront | `POST /api/newsletter` — **console.log only, no persist** |
| F-032 | Announcement / urgency bar | Storefront | Settings announcement vs hardcoded Gadget tagline |
| F-033 | Product compare-at price | Catalog | Admin `compareAtPrice` = “was” price on cards |
| F-034 | Product compare list | Storefront | `/compare` + localStorage; bar **not** on Gadget chrome |
| F-035 | Shopper checkout COD | Storefront | `POST /api/checkout` — create order |
| F-036 | Order confirmation email | Email | Customer + BCC `ORDER_NOTIFY_EMAIL` |
| F-037 | Order status emails | Email | processing / shipped / delivered / cancelled — code templates, not admin-editable |
| F-038 | Track + shopper self-cancel | Storefront | `/track` 24h window |
| F-039 | Email flows cron | Email | `/api/flows` daily — review ask, abandoned, win-back |
| F-040 | Wishlist | Storefront | `/wishlist` |
| F-041 | Search | Storefront | `/search` |
| F-042 | Cart | Storefront | `/cart` |
| F-043 | Product detail + video chapter | Storefront | `/product/[slug]` |
| F-044 | Blog | Storefront | `/blog` |
| F-045 | Contact form | Storefront | → inbox |
| F-046 | Static policy pages | Storefront | warranty, shipping, privacy, terms, FAQ, about |
| F-047 | Upload media | Admin | Cloudinary / Supabase storage |
| F-048 | Autopilot dispatch API | API | `/api/admin/autopilot/dispatch` — **no isAdminRequest in source** |

## Features count

Total: 48

## Inventory notes (evidence, not scenarios)

- Gadget storefront ignores Settings logo URL and brand name; it uses `BntWordmark` + `SHOPPER_BRAND`.
- Newsletter success UI can show even when nothing is stored.
- Autopilot ACTIVE/SHADOW/OFF is in-memory browser state; server does not persist or enforce it.
- Transactional emails already exist in code (T-04). Admin cannot edit those templates. Marketing templates (T-29) are a different list.
- Emails still brand as `BRAND_NAME` env or “VoltGear” (T-33 planned).
- No navbar item named “compare rate” exists. Closest: compare-at price, or `/compare`.

## Scenarios

Launch-safety features started in T-34 (not the full three-round pass). Playwright still waits for catalog approval.

### F-031 — Footer newsletter

#### Scenarios
| SID | Round | Title | Steps (short) | Expected result | Priority | Type |
|-----|-------|-------|---------------|-----------------|----------|------|
| F-031-S-001 | 1 | Valid footer email is stored | 1. Submit a real email in the Gadget footer. 2. Open `/admin/newsletter`. | Admin list shows that email. Success message on the footer. | P0 | happy |
| F-031-S-002 | 1 | Invalid email is rejected | 1. Submit `not-an-email`. | API 400. Footer does not say “You’re on the list.” | P0 | validation |
| F-031-S-003 | 1 | Duplicate signup is safe | 1. Submit the same email twice. | One row in admin. Second submit still succeeds. | P1 | edge |
| F-031-S-004 | 1 | Table missing | 1. POST while table is absent. | API 500. Footer error, not fake success. | P0 | error |

#### Round log
- Round 1: 4 scenarios
- Status: in progress (full rounds after inventory approval)

### F-036 — Order confirmation email

#### Scenarios
| SID | Round | Title | Steps (short) | Expected result | Priority | Type |
|-----|-------|-------|---------------|-----------------|----------|------|
| F-036-S-001 | 1 | Customer gets confirmation | 1. Place a COD order with a real inbox. | Customer receives “order confirmed” mail branded Buy n Try (or BRAND_NAME). | P0 | happy |
| F-036-S-002 | 1 | Admin gets a separate new-order mail | 1. Set ORDER_NOTIFY_EMAIL. 2. Place an order. | Owner receives “New customer order”, not a BCC of the customer letter. | P0 | happy |
| F-036-S-003 | 1 | Notify unset | 1. Clear ORDER_NOTIFY_EMAIL. 2. Place an order. | Checkout succeeds. Only customer mail is attempted. | P0 | edge |
| F-036-S-004 | 1 | Same address as customer | 1. Notify equals customer email. | Only one mail is sent (no duplicate admin letter). | P1 | edge |

#### Round log
- Round 1: 4 scenarios
- Status: in progress

### F-048 — Autopilot dispatch API

#### Scenarios
| SID | Round | Title | Steps (short) | Expected result | Priority | Type |
|-----|-------|-------|---------------|-----------------|----------|------|
| F-048-S-001 | 1 | Logged-out book is refused | 1. POST `/api/admin/autopilot/dispatch` without cookie. | 401 Unauthorized. No PostEx booking. | P0 | auth |
| F-048-S-002 | 1 | Logged-out PostEx book is refused | 1. POST `/api/admin/postex/book` without cookie. | 401 Unauthorized. | P0 | auth |
| F-048-S-003 | 1 | Admin can still book | 1. Sign in. 2. Book from order detail. | Existing admin book path still works. | P0 | happy |

#### Round log
- Round 1: 3 scenarios
- Status: in progress

### F-005 — Manual PostEx book from order

N/A extra — covered by F-048-S-002 / S-003 after the auth fix.

### F-022 — Autopilot #1 defaults

#### Scenarios
| SID | Round | Title | Steps (short) | Expected result | Priority | Type |
|-----|-------|-------|---------------|-----------------|----------|------|
| F-022-S-001 | 1 | Fresh page shows OFF | 1. Open `/admin/autopilot/settings`. | Master is OFFLINE. All four modes OFF. | P0 | happy |

#### Round log
- Round 1: 1 scenario
- Status: in progress

## Catalog summary

- Features: 48
- Scenarios total: 12 (launch-safety Round 1 only)
- Ready for Playwright: no
## Approval

- [ ] User approved feature inventory
- [ ] User approved catalog for Playwright execution
