# E-Commerce Store — Electronics Accessories

A deploy-ready e-commerce storefront for an electronics accessories brand
(smartwatches, power banks, chargers/adapters, earbuds & handsfree), built with:

- **Next.js 14** (App Router, RSC, ISR)
- **Tailwind CSS** + **shadcn/ui** components
- **Sanity.io** as headless CMS (products, hero, testimonials, pages, site settings)
- **Cloudinary** for image hosting with AI background removal on upload
- **Vercel-ready** — deploy with zero config

## Design system (CMS-driven)

Two complete themes ship in `app/globals.css` as CSS custom properties,
swappable from **Sanity Studio → Site Settings** — no code changes needed:

| Theme              | Look                                    |
| ------------------ | --------------------------------------- |
| `dark` (default)   | Dark premium — deep navy-black surfaces, electric-blue accents |
| `light`            | Light minimal — white surfaces, black accents |

- **Colors** — `primaryColor` / `secondaryColor` (hex) override `--primary`,
  `--ring` and `--secondary` at runtime. Text-on-color contrast is computed
  automatically (white or near-black, whichever is readable).
- **Typography** — headings use a strong techy sans (`Space Grotesk` or
  `Sora`), body uses a readable sans (`Inter` or `Manrope`). Picked from
  CMS via `headingFont` / `bodyFont`.
- **Branding** — brand name, tagline, logo, SEO title/description all come
  from the `siteSettings` document.
- **Previewing** — append `?theme=light` or `?theme=dark` to any page URL
  to preview a theme (instant, no flash). The floating toggle button in
  dev mode does the same; set `SHOW_THEME_TOGGLE=true` to enable it in
  production.

## Getting started

This repo is a **monorepo**. Production deploys **`apps/storefront`** (shop) and **`apps/admin`** (dashboard). Shared UI and logic live in **`packages/shared`**. Root `app/`, `lib/`, and `components/` are legacy copies — do not edit them for shop fixes (see `docs/CODEBASE-HYGIENE.md`).

```bash
npm install
cp .env.example .env.local   # fill in your credentials
npm run dev                  # shop → http://localhost:3000
npm run dev:admin            # admin → http://localhost:3001
npm run ci                   # tests + lint + both production builds
```

Sanity Studio (legacy local tree only) was at **`http://localhost:3000/studio`** when using the old root app layout.

## Content model (Sanity)

| Document         | Purpose                                                              |
| ---------------- | -------------------------------------------------------------------- |
| `product`        | Name, slug, category, price, images, description, stock, rating…     |
| `heroSection`    | Headline, subheadline, bg image/video, CTAs, stat badges             |
| `testimonial`    | Customer name, photo, review text, rating, verified flag             |
| `page`           | Dynamic pages (About, Contact, blog posts) via content blocks        |
| `siteSettings`   | Brand name, logo, colors, contact info, social links, SEO            |
| `order`          | Customer orders placed through checkout (for fulfillment + email flows) |
| `reviewSubmission` | Customer reviews awaiting moderation (verified-purchase flag)     |
| `emailEvent`     | Queued email automations (order confirmation, post-purchase, abandoned cart, win-back) |

Pages in Sanity with **Page Type = Blog Post** appear under `/blog`.
Other pages are served at their slug (e.g. `/about`, `/contact`).

### Market-ready demo content (for client demos)

Want to show a fully populated store without building content by hand? One
command seeds a complete, client-ready catalog:

```bash
# .env.local needs: NEXT_PUBLIC_SANITY_PROJECT_ID + SANITY_API_TOKEN (write token)
node scripts/seed-demo.mjs
```

It creates and connects everything:

- **Site settings** — VoltGear branding, dark theme, contact info, socials,
  free-shipping threshold ($50), return policy, warranty, SEO.
- **Hero section** — headline, subheadline, background photo, CTAs and trust
  stats, wired to a featured product.
- **16 products** across all 4 categories — each with real photos (auto-
  uploaded to Sanity from Unsplash, deduped so re-runs don't duplicate),
  descriptions, key features, specifications, ratings and customer reviews.
- **8 testimonials**, **4 blog guides**, and the **6 trust/legal pages**.
- **Demo orders + queued emails** — so Sanity Studio's Orders, Review
  Submissions and Email Flow Queue are populated for the demo too.

Re-running is safe (everything upserts by stable ID). Everything remains
editable afterwards in Sanity Studio, and the site reflects changes within
~60 seconds.

### One-time setup: seed the trust & legal pages

The store ships with 6 pre-written pages (About Us, Contact, Privacy
Policy, Terms of Service, Shipping & Returns, FAQ) — AdSense-required
and good for customer trust. Seed them into your Sanity project once:

```bash
# .env.local needs: NEXT_PUBLIC_SANITY_PROJECT_ID + SANITY_API_TOKEN (write token)
node scripts/seed-pages.mjs
```

Re-running is safe (upserts by slug). After seeding, every page is
editable in Sanity Studio → Pages, including the FAQ accordion and the
Contact page's embedded contact form (submissions go to your
`SLACK_WEBHOOK_URL` / `WEBHOOK_URL` if set, otherwise logged).

The footer links to all of these pages automatically.

### Writing a blog post (long-form, SEO-ready)

The `page` document's **Content Blocks** are the body of your post.
Mix and match these blocks — they render in order:

| Block               | Use it for                                                       |
| ------------------- | ---------------------------------------------------------------- |
| Heading (h2/h3/h4)  | Section and sub-section titles (pick a level per heading)        |
| Paragraph           | Body copy — write real, original paragraphs here                 |
| List                | Bulleted or numbered lists (buying checklists, spec comparisons) |
| Callout / Tip Box   | Pro tips, warnings, key takeaways — visually highlighted         |
| Related Products    | Product cards inline in the post, linking back to the store      |
| FAQ Items           | Expandable question/answer accordion (FAQ page)                  |
| Image               | Inline images/diagrams                                           |
| Quote               | Pull quotes or expert opinions                                   |
| Call to Action      | Button linking to a product or page                              |
| Contact Form        | Embedded contact form                                            |

Also fill in **Author**, **Published At**, **Cover Image**, **Excerpt**
(shows in the blog list + search results) and **SEO Keywords**.

Each post automatically gets an author byline with publish date and
reading time, breadcrumbs, Open Graph tags and Article structured data
(JSON-LD) for better search ranking. Posts are statically generated and
revalidated every 5 minutes.

### Managing products without a developer

Everything below happens in Sanity Studio (`/studio`) — no code deploys needed.
Changes propagate to the site within ~60 seconds (ISR revalidation):

1. **Add a product** → Products → Create new → name, slug (auto), category,
   price, stock status, rating, images.
2. **Images** → either upload directly to Sanity (`images`), or paste
   Cloudinary public IDs/URLs (`cloudinaryImages`) — Cloudinary ones render
   auto-optimized (`f_auto`, `q_auto`, responsive widths).
3. **Reviews** → the `reviews` array on the product powers the Reviews tab
   (with rating breakdown); `rating` + `reviewCount` drive the stars on
   cards. Review counts are clickable and deep-link to the Reviews tab.
4. **Edit/delete** any product at any time — cards, category pages,
   related-products carousel and search all update automatically.

## Checkout, orders & email automation

**Checkout** is a 3-step flow (Cart → Details → Confirm) with guest
checkout and Cash on Delivery. Shipping is free above the threshold set in
**Sanity Studio → Site Settings → Free Shipping Threshold** — the cart
drawer shows a live "X away from free shipping" progress bar, a proven AOV
driver.

**Placing an order** (`POST /api/checkout`) persists an `order` document
(the blueprint for future fulfillment/analytics) and immediately:

1. Sends an **order confirmation email** to the customer (Resend — see
   `.env.example`).
2. Queues a **post-purchase email** (review request) 5 days later.

Payment methods are a single registry in `app/checkout/page.tsx`; to add a
gateway, add an entry there + a case in `app/api/checkout/route.ts`.

### Email flows (`/api/flows`)

Run this endpoint on a schedule (Vercel Cron via `vercel.json`, or any
external cron/UptimeRobot):

- **Abandoned cart** — captured when a visitor who typed their email on the
  Details step leaves without ordering; email fires 3 hours later.
- **Post-purchase** — review request 5 days after an order.
- **Win-back** — customers with no order in the last 90 days get a
  "we miss you" email (re-checked every run, deduped).

Each run sends every queued event whose time has come, then reports a JSON
summary. Without `RESEND_API_KEY`, emails are logged to the server console
instead — flows remain testable end-to-end.

## Customer reviews

The Reviews tab has a **submit-a-review form**. Submissions land in
**Sanity Studio → Review Submissions** for moderation:

1. Open the submission; it's auto-flagged **Verified purchase** when the
   submitter's email matches a stored order for that product.
2. Set status **Approved** (or Rejected), then paste the details into the
   product's `reviews` array (name, rating, date, comment, `verified: true`
   to show the "Verified purchase" badge).

Submissions are deduped per email + product, so the same person can't spam.

## Analytics (GA4-ready)

Events are pushed to `window.dataLayer` in GA4 ecommerce format. They fire
from the UI regardless of whether GA4 is installed; add
`NEXT_PUBLIC_GA_MEASUREMENT_ID` to load gtag (and
`NEXT_PUBLIC_CLARITY_ID` for Microsoft Clarity heatmaps):

- `view_item` — product detail page view
- `add_to_cart` — Add to Cart clicks (with quantity)
- `begin_checkout` — entering the Review & Confirm step
- `purchase` — successful order (with `transaction_id`)
- `search` — search form submissions (with `search_term`)

Source of truth for all events: `lib/analytics.ts`.

## Cloudinary upload API

`POST /api/upload` accepts a multipart form:

- `file` — the image
- `removeBackground` — `"true"` to run Cloudinary's AI background removal
- `folder` — optional target folder

```bash
curl -F "file=@product.png" -F "removeBackground=true" http://localhost:3000/api/upload
```

## SEO & performance (built in)

- **`app/sitemap.xml`** and **`app/robots.txt`** — auto-generated from Sanity
  (products, categories, pages) and served at `/sitemap.xml` + `/robots.txt`.
  Set `NEXT_PUBLIC_SITE_URL` to your domain so URLs/canonicals are correct.
- **Per-page metadata** — every product, category, blog post and CMS page
  pulls its unique title/description from its Sanity fields, with Open Graph
  + Twitter cards. Checkout and search are `noindex`.
- **Structured data** — products emit schema.org `Product` (offers, brand,
  availability, price validity) with `AggregateRating` and per-review
  `Review` blocks; blog posts emit `Article`. See
  `/product/[slug]/page.tsx` and `/blog/[slug]/page.tsx`.
- **Images** — all images use `next/image` (WebP, responsive `sizes`,
  lazy loading below the fold, eager + `priority` for the LCP hero and
  product gallery). CMS assets are projected with intrinsic dimensions so
  layout never shifts. Configured via `images.remotePatterns` for
  `cdn.sanity.io` and Cloudinary.
- **JavaScript** — the cart drawer (Radix dialog) is `next/dynamic` +
  `ssr: false` so ~40KB of dialog JS loads only when the cart opens.
  Fonts are self-hosted via `next/font` (no FOIT/CLS). Hero video loads
  only when scrolled into view.

Run `npx lighthouse http://localhost:3000 --preset=mobile` to verify.

### Responsive regression test

`scripts/responsive-test.mjs` audits every route at 375 / 768 / 1280 / 1536px
(mobile, tablet, laptop, large desktop) against two hard rules:

1. **No horizontal scroll** anywhere (checks `scrollWidth` vs viewport).
2. **Every touch target ≥ 44×44px** (buttons, links, inputs, selects).

It also opens the cart drawer and mobile nav and re-checks both. It drives
your installed Edge/Chrome (Playwright `channel: "msedge"`), takes full-page
screenshots to `D:/Development/Temp/opencode/shots`, and prints offenders
with their class names:

```bash
npm run build && npm run start -- -p 3001
node scripts/responsive-test.mjs   # in a second terminal
```

The site currently passes 0-overflow / 0-undersized-targets on all routes.

## Deploy to Vercel

1. Push this repo to GitHub and import it at vercel.com (Next.js is auto-detected).
2. Add all variables from `.env.example` to Project → Settings → Environment Variables.
3. Deploy. Sanity Studio is available at `your-app.vercel.app/studio`.

**Tip:** connect the Sanity "Deploy Hooks" (or `vercel/rebuild` hook) to
revalidate pages when content changes.

## Project structure

```
app/                  # App Router pages & API routes
  product/[slug]/     # Product detail
  products/[category] # Category listings
  blog/               # Blog list + posts
  studio/             # Embedded Sanity Studio
  api/upload/         # Cloudinary upload (AI bg removal)
  api/contact/        # Contact form endpoint
  api/checkout/       # Order placement (persists order + emails)
  api/abandoned-cart/ # Abandoned-cart capture (3h email)
  api/flows/          # Email automation runner (cron)
  api/reviews/        # Review submission + verified-purchase check
  api/settings/       # Public site config for the client (free-shipping bar)
components/
  ui/                 # shadcn/ui primitives
  cart/               # Cart context + drawer (localStorage)
  product/            # ProductCard, AddToCart, ratings, rich text
  layout/             # Navbar, Footer
  sections/           # Hero, testimonials, content blocks, contact form
sanity/schemas/       # Sanity document schemas
lib/sanity/           # Client + GROQ queries + image helpers
lib/email.ts          # Email provider abstraction (Resend)
lib/order-store.ts    # Order + email-event persistence
lib/analytics.ts      # GA4 ecommerce event helpers
lib/site-config.ts    # useSiteConfig() hook for client components
lib/types.ts          # Shared TypeScript types
```
