# Gadget storefront preview — release notes

## 2026-09-01 — Homepage sections layout (T-10)

- Admin → **Home layout** show/hide + reorder below-hero bands on live `/`. Stored in `site_settings.home_sections`. Hero stays fixed at top.

## 2026-09-01 — Craft system: motion, type, icons (T-19)

- Preview gets shared craft tokens (motion durations/easing, type scale, hover-lift), home section reveals, sharper Buy now trust microcopy from real settings, upgraded category glyphs, and consistent icon stroke. Live `/` unchanged.

## 2026-09-01 — Biometic /home2 redesign (T-16)

- Preview home uses Biometic **cream / forest** theme (cream canvas `#F5F1E8`, forest CTA/sections `#1F3626`, sage accents, Fraunces + DM Sans), admin-managed product hero slides, COD/shipping/returns trust strip, shop-by-type tiles, ranked bestsellers, and a forest proof section. Live `/` is unchanged. Requires `hero_slides` migration applied and at least one published slide + testimonial.

## 2026-08-26 — Gadget preview at `/home2` and `/product2` (T-07)

- Compare a bolder electronics-shop layout against the live store without changing `/` or `/product/[slug]`. Open `/home2` and `/product2/[slug]` for the new nav, hero, buy box, and footer. Add to cart still uses the existing cart drawer. Preview URLs are `noindex` and robots-disallowed. Decision: keep both URL sets; do not switch `/`.
