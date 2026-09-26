# T-42 — Scale & perfection roadmap (implementation plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Work **one phase at a time**; do not start Phase N+1 until Phase N exit criteria are checked off.

**Goal:** Step-by-step hardening of buyntryy.com for **large traffic**, **large order volume**, and **operational excellence**, with clear exit criteria each phase.

**Architecture:** Keep **Next.js ISR storefront + Supabase RPC checkout**; push reads to cache/CDN/Cloudinary; push admin/cron to **bounded SQL**; async email/flows; observability via Vercel + `[checkout-slo]` + checklist metrics.

**Tech stack:** Next.js (storefront/admin), Supabase Postgres, Vercel, Cloudinary, Resend, Clarity/pixels (env-gated).

## Global constraints

- Production shop deploys only on Vercel project **`voltgear`**; domain **`https://buyntryy.com`**.
- No secrets in git; service role **server-only**.
- `npm test` + `npm run build:storefront` (or Vercel build) green before claiming phase done.
- User-facing ship: smoke `/`, one PDP, checkout path, `/track`, `/sitemap.xml` per `docs/OPERATING-MODEL.md`.

**Design spec:** `docs/superpowers/specs/2026-09-26-t42-scale-perfection-design.md`  
**Metrics:** `docs/INFRASTRUCTURE-HEALTH-CHECKLIST.md`  
**Quick fixes already coded:** `docs/REMEDIATION-STEPS.md`

---

## How to use this plan

| Rhythm | Action |
|--------|--------|
| **Daily** (5 min) | Glance checkout errors + Vercel function errors |
| **Weekly** (30 min) | Checklist **10 numbers** + `npm run sanity:purchases` |
| **Monthly** | `npm run export:dr`; Supabase size/slow queries; review phase checklist |
| **Per phase** | Merge to `main`, deploy shop + admin as needed, record in module `RELEASE_NOTES.md` |

Update **`docs/dev-priorities.md`** T-42 status when each phase completes.

---

## Phase 0 — Operate (foundation)

**Purpose:** You cannot optimize what you do not measure.  
**Owner:** You (dashboard) + verify deploys.

### Exit criteria

- [ ] Vercel **usage/spend alerts** on **voltgear** at 50% / 75% / 100% (`REMEDIATION-STEPS` Step **0**)
- [ ] Same for **voltgear-admin** if admin CPU matters
- [ ] Weekly doc: baseline snapshot of checklist **10 numbers** (date + values in a note or spreadsheet)
- [ ] `npm run smoke:t40` passes on production after any deploy
- [ ] `npx supabase db push` applied on **Final-store** (migrations = remote)

### Verification

- Vercel → Usage / Observability: note p95 for `/api/checkout` and cache hit rate on `/`
- Filter logs: `[checkout-slo]` — no sustained `create_failed` spikes

**Do not start Phase 1 until Step 0 alerts exist.**

---

## Phase 1 — Close the remediation loop

**Purpose:** Lock in fixes already built (cache, checkout SLO, email webhook, RLS).

### Exit criteria

- [ ] All `REMEDIATION-STEPS` rows **0–9** checked (Step 0 = alerts; 1–8 = code + deploy; 9 = DR export scheduled)
- [ ] Resend webhook live on **admin**; suppressions table receiving events
- [ ] `npm run audit:security` clean (or documented exceptions)
- [ ] Document Resend + `CRON_SECRET` + `NEXT_PUBLIC_CLARITY_ID` in Vercel env checklist (`docs/modules/deploy/DEPLOY_IMPLEMENTATION.md`)

### Verification

- `npm run sanity:purchases`
- `npm run export:dr` (dry run OK on staging machine)

---

## Phase 2 — Order & DB scale (critical path)

**Purpose:** Remove **O(all orders)** patterns before order count hurts cron and CRM.

### Problem (today)

`getLightweightOrders()` in `packages/shared/lib/db/store.ts` selects **every** order with no `LIMIT`, used by:

- `apps/storefront/app/api/flows/route.ts` (cron)
- `packages/shared/lib/db/customer-list.ts` (via order-store)
- `packages/shared/lib/message-store.ts`
- Legacy `app/` admin paths (ensure nothing production-critical still uses them)

Admin **orders UI** already uses `listAdminOrdersPage` — good.

### Task 2A: Bounded flows cron

**Files:**

- Modify: `packages/shared/lib/db/store.ts` — add e.g. `listOrdersForFlows({ sinceDays, limit })`
- Modify: `apps/storefront/app/api/flows/route.ts` — use bounded query (win-back only needs recent delivered/cancelled window)
- Test: `packages/shared/lib/db/flows-orders.test.ts` (new) — limit/window enforced

**Exit:** Cron completes in stable time with 10k orders in DB (measure once in SQL editor or staging).

### Task 2B: Customer CRM in SQL

**Files:**

- Modify: `packages/shared/lib/db/customer-list.ts` — aggregate by phone/email in Postgres (GROUP BY), not in-memory full scan
- Optional migration: index on `(customer->>'phone')` or generated column if query plan needs it
- Test: customer list rules test with mocked rows / SQL fixture

**Exit:** `/admin/customers` loads without loading full order table.

### Task 2C: Admin search stays bounded

**Files:**

- Confirm: `apps/admin/app/api/admin/search/route.ts` uses `searchAdminOrdersByTerm` only
- Delete or guard legacy `app/api/admin/search` if still deployed anywhere

**Exit:** Cmd+K search uses indexed/limited queries only.

### Task 2D: Indexes & health SQL

**Files:**

- Migration: `supabase/migrations/YYYYMMDD_order_scale_indexes.sql` — `orders(created_at desc)`, `orders(status)`, partial indexes if needed for pending/shipped stale
- Docs: append query examples to `docs/modules/database/SUPABASE_HEALTH.md`

**Exit:** No recurring slow queries &gt; 500ms on orders list/search in Supabase dashboard.

### Phase 2 verification

- [x] `npm test` (after 2A/2B code)
- [ ] Manual: trigger `/api/flows` with `CRON_SECRET` — 200, bounded duration in logs
- [ ] Supabase: ensure migration `20260926210000_admin_customer_rollups.sql` applied on Final-store

---

## Phase 3 — T-41 complete (Vercel & bandwidth)

**Purpose:** Shop survives ad spikes without CPU/transformation blowups.

**Spec:** `docs/superpowers/specs/2026-09-25-t41-vercel-shop-hardening-design.md`

### Exit criteria

- [ ] Phase 0 Vercel alerts **and** post-deploy Usage compared to baseline
- [ ] Shop has **no** admin-only API routes (404 on shop)
- [ ] Analytics cleanup **only** on daily cron (`/api/flows`), not hot path
- [ ] Image discipline: Cloudinary loader, card pad, hero/PLP `sizes` audited; Vercel Image Transformations flat or down week-over-week
- [ ] `STOREFRONT_CATALOG_REVALIDATE` (`packages/shared/lib/storefront-cache.ts`) validated — no stale price on checkout (checkout still server-resolves)

### Verification

- Vercel Observability: catalog routes high cache hit; `/api/checkout` dynamic only
- Document baseline vs after in T-41 release note

---

## Phase 4 — Checkout & email at volume

**Purpose:** Peak hour (flash sale / viral ad) without duplicates, oversells, or email backlog.

### Exit criteria

- [ ] Checkout SLO: p95 **&lt; 3s**, 5xx **&lt; 0.5%** for 7 days (`CHECKOUT_SLO.md`)
- [ ] Load sanity: repeated checkout with same **Idempotency-Key** returns replay, not duplicate (manual or automated)
- [ ] `email_events` queue drained reliably by cron; failed sends visible in admin
- [ ] Stock: concurrent checkout test on low-stock SKU — RPC rejects second order
- [ ] Rate limits tuned if false positives (document in `checkout-guard`)

### Optional tasks

- Move heavy post-order work (analytics, optional webhooks) fully async
- Alert on `create_failed` / `server_error` log rate

### Verification

- Vercel log filter `[checkout-slo]` weekly export
- Admin: test order + confirm email + suppression path

---

## Phase 5 — Conversion funnel (traffic that buys)

**Purpose:** Ad traffic is expensive; fix drop-off on home → PDP → checkout.

### Exit criteria

- [ ] Mobile lab LCP trend documented (before/after); target **practical** LCP &lt; 4s on PDP/home on 4G, not vanity 100 score
- [ ] Clarity (`NEXT_PUBLIC_CLARITY_ID`) — review 10 sessions/week for checkout abandon
- [ ] COD checkout: phone/city rules + assist bar validated on real devices
- [ ] Purchase sanity: weekly `npm run sanity:purchases` within agreed tolerance

### Work streams (parallel OK after Phase 3)

- Hero/LCP, defer third parties, category image weight
- PDP sticky CTA + deferred below-fold (already started — measure)
- Strip marketing params (shipped) — verify Google Shopping landings

**Spec overlap:** T-16/T-32 storefront; perf pass in T-39

---

## Phase 6 — Fulfillment & admin ops

**Purpose:** Humans are the bottleneck after ~50+ orders/day unless tooling scales.

### Exit criteria

- [ ] Order list + detail + status update &lt; 2s perceived at 10k orders
- [ ] Dashboard RPC (`admin-order-dashboard-sql`) only — no full-table scans on `/admin`
- [ ] COD follow-up (WhatsApp/shipped stale) still accurate with bounded pending lists
- [ ] Courier/post workflow defined: T-38 engines or manual SOP in `docs/modules/orders/`
- [ ] Bulk export for accounting (orders CSV by date range) — add if missing

### Verification

- Time `/admin/orders?page=1` and search by order id
- Run dashboard with synthetic large order count on staging (future: staging DB)

---

## Phase 7 — Resilience & environments

**Purpose:** One bad deploy or Supabase incident must not end the business.

### Exit criteria

- [ ] **PITR** enabled on Supabase when order revenue justifies cost
- [ ] Quarterly restore drill completed (`docs/modules/database/DR_RESTORE.md`)
- [ ] Monthly `npm run export:dr` automated reminder
- [ ] **Staging Supabase project** (or read replica) for risky migrations — document in `docs/staging-supabase-setup.md` and stop using `is_demo` as only isolation for schema tests
- [ ] Preview deployments use **non-prod** env vars (no prod service role on PR previews)

### Verification

- Restore drill log dated
- Migration tested on staging before prod push

---

## Phase 8 — SEO & continuous improvement

**Purpose:** Organic + paid compound; perfection is a loop, not a finish line.

### Exit criteria

- [ ] T-39 SEO waves executed per `docs/plans/2026-09-21-seo-ranking-master-plan.md` (approved slices only)
- [ ] Quarterly security: `npm run audit:security` + RLS review
- [ ] Quarterly dependency / Next.js security patches
- [ ] Retrospective: update this roadmap — new phase if catalog &gt; X SKUs or orders &gt; Y/month

---

## Master checklist (copy to your tracker)

| Phase | Name | Status |
|-------|------|--------|
| 0 | Operate (alerts + baselines) | ⬜ |
| 1 | Remediation loop closed | ⬜ |
| 2 | Order & DB scale | 🟡 2A/2B shipped locally — verify cron + db push |
| 3 | T-41 Vercel/bandwidth complete | ⬜ |
| 4 | Checkout & email at volume | ⬜ |
| 5 | Conversion funnel | ⬜ |
| 6 | Fulfillment & admin ops | ⬜ |
| 7 | Resilience & staging | ⬜ |
| 8 | SEO & continuous loop | ⬜ |

---

## Suggested execution order (strict)

```
Phase 0 → 1 → 2 → 3 → 4
                    ↓
              5 (parallel with late 3)
                    ↓
                  6 → 7 → 8 (ongoing)
```

**Next actionable slice for an agent:** **Phase 2A** (bounded `/api/flows` orders query).

---

## Related docs

- `docs/OPERATING-MODEL.md`
- `docs/INFRASTRUCTURE-HEALTH-CHECKLIST.md`
- `docs/REMEDIATION-STEPS.md`
- `docs/modules/orders/CHECKOUT_SLO.md`
- `docs/modules/admin/BACKEND_ARCHITECTURE.md`
- `docs/superpowers/specs/2026-09-25-t41-vercel-shop-hardening-design.md`
