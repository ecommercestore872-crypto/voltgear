# Mobile funnel QA (iPhone + Android)

Run after checkout/cart/PDP changes. Production: **buyntryy.com** (VoltGear storefront).

## Devices

- **iPhone** — Safari (primary)
- **Android** — Chrome (primary)
- Optional: Instagram / TikTok in-app browser if ads drive traffic

## Path (≈15 min per device)

| Step | Pass criteria |
|------|----------------|
| Home | Loads fast; hero + categories tappable; no horizontal scroll trap |
| Category / PLP | Grid readable; filters work; product cards open PDP |
| PDP | Gallery, variants, **Order with COD** / add to cart; sticky CTA not obscured |
| Cart | Qty ± works; totals + shipping note; **Proceed to checkout** visible |
| Checkout | Name / phone / city (+ address if required); **order box** shows items, delivery, total |
| Place order | Success page; order id; track / invoice links |
| Track | Order # + phone from checkout; status or friendly error |

## Touch / layout bar

- Primary actions ≥ **44px** height
- Inputs **16px** font (no iOS zoom on focus)
- Fixed bars respect **safe-area**; no content hidden under dock/footer
- `prefers-reduced-motion`: no blocking animations

## Automated pre-check (from repo)

```bash
npm run smoke:t40
```

Confirms live funnel routes return 200, revalidate is gated, and admin routing matches production (same-origin or split).

## Sign-off

Record date, device, and tester initials in your release notes when this checklist is green.
