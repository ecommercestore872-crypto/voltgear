# T-42 — Scale & perfection (design)

**Shop:** Vercel **`voltgear`** · **https://buyntryy.com** · **`apps/storefront`**  
**Admin:** **`voltgear-admin`** · **`apps/admin`**  
**Database:** Supabase **Final-store** (`zeuhfqevqjkbzwdaxjuv`)

## Objective

Move the store from “works for today’s traffic” to **predictable at high traffic and high order volume**, without sacrificing COD checkout trust, admin usability, or Vercel/Supabase cost control.

“Perfection” here is **measurable**, not cosmetic:

| Dimension | North star |
|-----------|------------|
| **Shopper** | Checkout p95 **&lt; 3s**, no duplicate orders, stock honest, mobile funnel usable under ad load |
| **Platform** | Catalog **ISR/cache-first**; checkout/admin writes **bounded DB**; usage **&lt; 70%** on Vercel CPU & Supabase CPU until you deliberately upgrade tier |
| **Ops** | Admin usable at **10k+** orders; email/flows reliable; DR tested; weekly metrics ritual |
| **Growth** | SEO + PDP performance support paid traffic; Purchase events ≈ orders (within known gap) |

## Non-goals

- Multi-region Kubernetes, microservices split, or replacing Supabase/Next.js
- Re-enabling removed analytics/autopilot surfaces unless explicitly re-scoped
- “100 Lighthouse on mobile” as a gate (target **practical** LCP and conversion instead)

## Principles

1. **Finish remediation before new features** — `docs/REMEDIATION-STEPS.md` Step **0** (alerts) is mandatory.
2. **Never load unbounded order rows** in cron, CRM, or search — SQL aggregates + pagination + date windows.
3. **Checkout stays authoritative** — prices/stock/idempotency in Postgres RPC; email async.
4. **Shop lean, admin heavy** — no admin-only APIs on shop (T-40/T-41).
5. **One slice = deploy + verify** — each phase ends with smoke + checklist metrics.

## Dependencies

- T-40 shop/admin split (verified)
- T-41 hardening (in progress)
- Existing: `checkout_place_order`, idempotency, `listAdminOrdersPage`, dashboard RPC

## Success

Roadmap plan `docs/superpowers/plans/2026-09-26-t42-scale-perfection-roadmap.md` executed phase-by-phase with exit criteria met and `dev-priorities.md` **T-42** updated per phase.
