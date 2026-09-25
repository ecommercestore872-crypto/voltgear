# Vercel production — release notes

## 2026-09-25 — Remediation step 5 (T-40 E2E)

- Shared `storefront-admin-redirects.mjs` (single source for shop `/admin` redirects).
- Production smoke: `npm run smoke:t40` — redirects, revalidate 401 gate, no `/api/admin` on shop.
- See `docs/modules/deploy/T40_VERIFICATION.md`.

## 2026-09-25 — Remediation step 3 (images)

- Custom Cloudinary loader on storefront; reduced Next `deviceSizes`; tighter product/hero widths.

## 2026-09-25 — Remediation step 1 (cached routes)

- ISR/cache for `llms.txt`, `ads.txt`, TikTok catalog CSV, and `/api/settings` to cut function work and Supabase reads on crawlers and cart config fetches.

## 2026-09-25 — Shop Vercel hardening (T-41)

- Lean **voltgear** deploy: admin order/IndexNow APIs moved off buyntryy; sitemap cached; analytics DB cleanup runs on daily `/api/flows` cron instead of every page hit.
- Production: **https://buyntryy.com** (project **voltgear**, Hassaan Pro). Enable Vercel **usage alerts** for CPU, Edge, Image, and bandwidth.

## 2026-08-26 — Shop live on Vercel (T-08)

- Production URL: https://voltgear-coral.vercel.app. Same Supabase catalog and Cloudinary images as local. `/studio` redirects to admin. Preview `/home2` and `/product2` stay `noindex`. Deploy from this machine with `npx vercel --prod --yes` (GitHub auto-deploy is not connected).
