# Admin CMS implementation

Staff editor for this Next.js store. Replaces Sanity Studio. Orders live at `/admin/orders` (T-03; see `docs/modules/orders/`). **Home** (`/admin`) is the daily snapshot (T-13). Internal commerce analytics (admin UI, `/api/analytics/event`, Supabase analytics tables) were removed in 2026-09; product **cost price** remains on products for deal margin checks only.

## Who uses it

One person. Password is `ADMIN_TOKEN` in `.env.local` (falls back to `REVALIDATION_TOKEN`). Sign in at `/admin/login`. After login you land on **Home**. `/studio` still redirects to login.

## How drafts work

Each editable row has `status` (`draft` | `published` | `unpublished`) and a `draft` JSON column.

- **Save** writes `draft` only. Live columns do not change. The shop is not refreshed.
- **Publish** copies `draft` onto live columns (and product child rows: images, variants, reviews), sets `status = published`, clears `draft`, revalidates shop paths.
- **Unpublish** sets `status = unpublished`. Live data is kept. The shop hides it.
- Shop queries in `lib/db/store.ts` only load `status = published`.
- Existing catalog was backfilled to published (migration `20260826150000_cms_draft_publish.sql`).

Hero and site settings are singletons with the same Save/Publish rule. Unpublish is hidden on settings because the store still needs brand/contact data.

## Product editor

`/admin/products` is a short form: name, photos, video link (TikTok / Instagram / MP4), cover photo, price, old price, **Category** (required; names from Shop types, slug stored), short summary, full details, availability, show on homepage. Extra fields (FAQ, variants, specs, and so on) stay in the database and are merged on save so they are not wiped.

Shop types are edited at `/admin/categories`. They need the `categories` table (migration `20260827010000_shop_types.sql`). You cannot delete a type while products still use it. Renaming changes the name shoppers see; the URL stays. The product form does not use a hardcoded type list. Save draft and publish both reject an empty or unknown category. Publishing a category change refreshes the old and new `/products/...` pages.

New products start as drafts. First save needs a name (the web address is filled in for you) and a real category. Publish also needs a price of zero or more.

## Home (overview)

`/admin` shows six tiles for the Pakistan calendar day (`Asia/Karachi`): today’s orders (including cancelled), today’s money (cancelled excluded), pending (New + Processing, any day), delivered today, cancelled today, and low/sold-out published products. Demo/practice orders are omitted from the numbers. Tiles and the Needs you list link to filtered Orders/Products or Reviews. Counting rules live in `lib/db/dashboard-rules.ts`.

## Review submissions

`/admin/reviews` lists shopper submissions. Approve appends the review to live `product_reviews` **and** to `draft.reviews` if a product draft exists, so a later Publish cannot wipe it. Reject sets submission status to rejected.

## Auth and writes

- Login sets an httpOnly cookie (`vg_admin`) and the existing sessionStorage Bearer token.
- `middleware.ts` blocks `/admin/*` except login when the cookie is missing.
- Admin APIs require cookie or `Authorization: Bearer`.
- All writes use the server service-role client (`lib/db/admin-store.ts`). The browser never holds the service role key.
- `/api/store/products` is `no-store` so catalog widgets do not lag behind Publish.

## Media

`POST /api/admin/upload` (admin only): Cloudinary first; Supabase Storage bucket `product-images` if Cloudinary fails. Shopper review photo upload stays on `/api/upload`. Product photos should be square **2048 × 2048**. The shop never stretches a smaller file to look bigger (Cloudinary `c_limit`). Uploads under 800 × 800 show a warning, not a block.

## Key files

| Path | Role |
|---|---|
| `app/admin/page.tsx` | Home snapshot |
| `app/admin/*` | Staff pages |
| `app/api/admin/*` | Authenticated writes |
| `components/admin/*` | Shell, publish bar, forms, order list/detail |
| `lib/db/dashboard-rules.ts` | Home counting (tested) |
| `lib/db/publish.ts` | Draft/publish rules (unit-tested) |
| `lib/db/admin-store.ts` | Admin reads/writes |
| `lib/admin.ts` | Password + cookie guard |

## Storefront-only scope (2026-09)

Admin nav is grouped for daily shop control: **Home / Orders**, **Catalog**, **Storefront** (hero, home layout, sections, testimonials), **Merchandising** (discounts, deals), **Content** (reviews, blog, pages), **Comms** (inbox, customers, newsletter, messaging), **Settings** (brand, order emails, email sending, invoice). **Analytics** and **Autopilot** UIs were removed; PostEx booking stays on the order detail page (`POST /api/admin/postex/book`).

## Out of this module

Orders/tracking (see `docs/modules/orders/`), emails (T-04), staging (T-06), storefront redesign and video players (T-07), Vercel (T-08), staff accounts, card payments.
