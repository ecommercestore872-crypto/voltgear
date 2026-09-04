# T-36 — Chrome CMS (logo, navbar, footer)

Date: 2026-09-05  
Status: approved  
Scope: Live Gadget header/footer follow Settings. Not trust-row or announcement copy.

## Objective

The owner edits brand name, tagline, logo, navbar links, Help links, and footer Company / Care links in Settings. The live shop updates after Publish. Empty logo keeps the BNT wordmark. Empty list hides that group. Shop categories stay on `/admin/categories`.

## Approach

Four JSON lists on `site_settings`. Settings form editors. Gadget navbar/footer resolve lists with seeded defaults when the column is missing or the saved value is `null` (first deploy). An explicit empty array `[]` hides the group.

## Lists

| Key | Shop surface | Seeded defaults |
|---|---|---|
| `navLinks` | Primary links beside Shop | Offers `/products?sort=featured`, Blog `/blog` |
| `helpLinks` | Mobile Help + desktop top utility links | Track, Shipping & returns, FAQs, Support |
| `footerCompanyLinks` | Footer Company | Current Company column |
| `footerCareLinks` | Footer Care | Current Care column |

Each item: `{ label, href }`. `href` must start with `/` or `http`. Blank or invalid rows are dropped. All-invalid after drop with a non-empty submitted list → publish error.

## Logo and name

- `logo` URL set → image in header and footer
- `logo` empty → `BntWordmark`
- `brandName` / `tagline` from Settings, fallback Buy n Try / “Buy it. Try it.”

## Out of scope

Trust row, announcement CMS, page builder, Autopilot, emails, Color/Size.
