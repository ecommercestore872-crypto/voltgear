# Dev priorities

Single tracker for this store. Status lives here only.

**Status key:** ⚪ Planned · 🟡 In Progress · ✅ Done · ⏸️ Blocked

## Active task

**T-36 — Chrome CMS** — implementing  
Spec: `docs/superpowers/specs/2026-09-05-t36-chrome-cms-design.md`  

## Program

Custom self-hosted commerce: Supabase + custom admin, tracking, emails, funnel logs, staging, black-and-white storefront with product videos, Vercel deploy. Admin platform program adds Shopify-parity gaps (inbox, collections, marketing email, category-grouped products, nav IA).

## Tasks

| ID | Title | Status | Depends on | Notes |
|---|---|---|---|---|
| T-01 | Database + replace Sanity with Supabase | ✅ Done | — | Schema pushed. Sanity copy: 16 products, 10 pages, 6 orders. App reads Supabase. Keys in `.env.local`. Closeout docs skipped when moving to T-02. |
| T-02 | Custom admin CMS | ✅ Done | T-01 | Full Studio replacement. Orders added in T-03. Spec: `docs/superpowers/specs/2026-08-26-t02-admin-cms-design.md`. Verified 2026-08-26. |
| T-03 | Orders, statuses, customer tracking | ✅ Done | T-01 | Admin list + detail + any-status update. Restyle `/track`. Spec: `docs/superpowers/specs/2026-08-26-t03-orders-tracking-design.md`. Docs: `docs/modules/orders/`. |
| T-04 | Transactional emails | ✅ Done | T-03 | Confirm, processing, shipped, delivered, cancelled. Light templates + BCC on confirm. Spec: `docs/superpowers/specs/2026-08-26-t04-transactional-emails-design.md`. Docs: `docs/modules/email/`. |
| T-05 | Funnel and activity logging | ✅ Done | T-08 | Microsoft Clarity on the live shop only (`y9fzz5qrvo`). `/admin` and localhost excluded. Verified on https://voltgear-coral.vercel.app 2026-08-28. Dashboard: https://clarity.microsoft.com/ |
| T-06 | Staging vs production | ✅ Done | T-01 | Demo login `/demo/login` (`demo`/`demo`), `is_demo` rows, purge in admin. Same database. Spec: `docs/superpowers/specs/2026-08-26-t06-demo-sandbox-design.md`. Docs: `docs/modules/demo/`. Schema pushed 2026-08-26. |
| T-07 | Storefront UI (gadget preview) | ✅ Done | T-01 | Keep both: live `/` and gadget `/home2` + `/product2/[slug]`. Do not switch `/`. Spec: `docs/superpowers/specs/2026-08-26-t07-gadget-storefront-preview-design.md`. Docs: `docs/modules/storefront/`. Verified 2026-08-26. |
| T-08 | Vercel deploy wiring | ✅ Done | T-01, T-06 | Live at https://voltgear-coral.vercel.app. Same Supabase. Spec: `docs/superpowers/specs/2026-08-26-t08-vercel-deploy-design.md`. Docs: `docs/modules/deploy/`. Verified 2026-08-26. |
| T-09 | Easy admin: product form + shop types | ✅ Done | T-02 | Short product form, shop types CRUD, required Category from that list. Verified local + live 2026-08-27. Plan: `docs/plans/2026-08-27-t09-category-assignment-plan.md`. |
| T-10 | Homepage sections CRUD | ✅ Done | T-09 | Home layout on main; `home_sections` on remote. Spec: `docs/superpowers/specs/2026-09-01-t10-homepage-sections-design.md`. |
| T-21 | Admin IA — Shopify-style nav groups | ✅ Done | T-12a | Grouped sidebar + Inbox + Collections + Home layout. |
| T-22 | Inbox — contact + complaints | ✅ Done | — | `contact_submissions` pushed. `/admin/inbox` + kind on contact form. |
| T-23 | Collections CRUD + home placement | ✅ Done | T-10 | CRUD + auto rules + home_slot (bestsellers/featured/offers). Reorder rails via Home layout. |
| T-24 | Products admin grouped by category | ✅ Done | T-09 | Category sections + filters in `/admin/products`. |
| T-25 | Marketing email — single, bulk, templates | ✅ Done | T-04 | Messaging → Email tab; batch Resend + permission confirm. |
| T-26 | Customers light CRM | ✅ Done | T-03 | `/admin/customers` from live orders. |
| T-27 | Home COD follow-up | ✅ Done | T-13 | WhatsApp/Call on pending; shipped stale ≥3d Karachi. |
| T-28 | Customer profile depth | ✅ Done | T-26, T-22 | `/admin/customers/[key]` orders + inbox. |
| T-29 | Saved email templates | ✅ Done | T-25 | DB templates for Messaging compose. |
| T-30 | Admin Cmd+K search | ✅ Done | T-21 | Jump to order / product / customer. |
| T-31 | Promo / discount codes | ✅ Done | T-03 | percent/fixed/free_shipping + checkout apply. |
| T-11 | Event theme + color suggestions | ⚪ Planned | T-09 | Owner sets a shop look for an event; suggested palettes. Spawned from T-09 intake. |
| T-12 | Easier layout for the rest of admin | 🟡 In Progress | T-09 | T-12a Biometic theme shipped. Deeper ease-of-use continues via T-21. Spec: `docs/superpowers/specs/2026-09-01-t12a-admin-biometic-theme-design.md`. |
| T-13 | Admin business overview (dashboard) | ✅ Done | T-03 | Home at `/admin`: today’s orders/money, pending (New+Processing), delivered/cancelled today, low stock, Needs you. Live on Vercel 2026-08-27. Spec: `docs/superpowers/specs/2026-08-27-t13-admin-business-overview-design.md`. |
| T-14 | Commerce intelligence & delivered-revenue analytics | ✅ Done | T-03, T-13 | COD analytics: delivered revenue is the primary KPI. `/admin/analytics` live 2026-08-27. Spec: `docs/superpowers/specs/2026-08-27-t14-commerce-intelligence-design.md`. Docs: `docs/modules/analytics/`. |
| T-15 | First-party traffic, funnel tracking & conversion insights | ✅ Done | T-14 | Live Biometic paths counted. Spec: `docs/superpowers/specs/2026-08-27-t15-first-party-traffic-design.md`. Merged PR #5 2026-09-01. |
| T-16 | Homepage redesign (discovery-driven VoltGear home) | 🟡 In Progress | T-07 | Biometic live on `/`. Spec: `docs/superpowers/specs/2026-09-01-t16-home2-redesign-design.md`. |
| T-17 | `/product2` redesign (match T-16 language) | ⚪ Planned | T-16 | Guided buy / Biometic chrome. Spawned from T-16 impact analysis. |
| T-18 | Gadget catalog entry chrome | ⚪ Planned | T-16 | Preview catalog/nav entry points matching T-16. Spawned from T-16 impact analysis. |
| T-19 | Gadget craft system: motion, type, copy, icons | ✅ Done | T-16 | Craft tokens + home reveals + buy trust microcopy + glyphs. |
| T-20 | Shopper self-cancel on Track (24h, new/processing) | ✅ Done | T-03, T-04 | Cancel from `/track` within 24h while new/processing; same cancelled email. Spec: `docs/superpowers/specs/2026-09-01-t20-shopper-self-cancel-design.md`. Shipped 2026-09-01. |
| T-32 | Storefront visual system (Buy n Try hardware stage) | 🟡 In Progress | T-16, T-19 | Spec + UI plan written 2026-09-05. Hardware-stage cards, Newsreader + Manrope, BNT10 popup, shopper copy to Buy n Try. Admin out of scope. Emails → T-33. |
| T-33 | Customer email + message brand (Buy n Try) | 🟡 In Progress | T-32 | Transactional fallback brand is Buy n Try (T-34). FROM_EMAIL / marketing VoltGear copy still env. |
| T-34 | Launch safety | 🟡 In Progress | T-03, T-04 | Courier API auth, newsletter persist, distinct admin new-order email, optional atomic stock. |
| T-35 | Color and Size variants | 🟡 In Progress | T-09, T-34 | Color/Size on/off + per-value on/off. Optional color photo swaps gallery. Product units only. |
| T-36 | Chrome CMS | 🟡 In Progress | T-32 | Settings-driven logo, navbar, Help, footer Company/Care. |

## Suggested build order

Remaining: collection→home rails, optional DB email templates, deploy/verify live. Master plan: `docs/plans/2026-09-01-admin-platform-master-plan.md`.

## T-01 decisions (so far)

- New Supabase project is created and linked; tables not designed yet.
- **Move current Sanity content into Supabase, then align the store to that database.** Do not start from empty tables.
- **Hard switch locally** (Sanity off, Supabase on). Dual-run is extra work and not useful while we only edit on this machine.
- **Keep cash on delivery** as the only payment for now (that is what checkout already does).
- **Sanity content is real store data** — copy it into Supabase, do not treat it as demo seed.
- **Copy everything** from Sanity: products, images metadata, hero, pages, settings, testimonials, reviews, orders, and email events.
- **T-01 keeps the current storefront.** Same pages, cart, checkout, and theme. Black-and-white redesign is T-07.
- **Approach: Option 1** — real SQL tables, server-side Supabase data layer, CLI migrations. Images: **Cloudinary first**; if Cloudinary is missing or fails, **store files in Supabase Storage** instead.

## T-01 edge cases

- Image copy: **all images must move.** Try Cloudinary first. **If Cloudinary is missing or fails, upload to Supabase Storage.** Do not cut over while any image is still only on Sanity.
- Data copy: **all-or-nothing.** If any record fails, stop, fix it, then continue. Do not skip bad rows.
- Permissions: **server writes only** (checkout, reviews, emails). Shoppers read through the site. Product/content editing waits for T-02.
- Double checkout: **block the second submit.** Only one order is saved.
- Rollback: **stay on Supabase and fix.** Do not add a switch back to Sanity.
- `/studio`: **do not 404.** Send staff to admin (`/admin/login` for now). Full product CMS stays T-02.
- Empty catalog after copy: **treat as failure.** Do not switch. Fix and retry.
- Cloudinary keys missing or copy fails: **fall back to Supabase Storage** for those images. All images still must land somewhere we own.
- Out of scope for T-01: full admin CMS (T-02), new email templates (T-04), funnel analytics (T-05), staging (T-06), black-and-white redesign (T-07), Vercel production (T-08), card payments.

Master plan: `docs/plans/2026-08-26-t01-supabase-replace-sanity-plan.md` — waiting for approval.

## Out of this tracker until specified

Payments, tax, and shipping carriers were not in the brief. Checkout today is **cash on delivery only**; leave card gateways out until we add a task.
