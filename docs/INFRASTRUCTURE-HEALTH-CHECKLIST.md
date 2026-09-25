# Buy N Try — infrastructure health checklist

Practical warning thresholds for **voltgear** / **buyntryy.com** (shop). Percentages are **operational guides**, not always hard provider caps.

**Scope:** Production shop on Vercel project **`voltgear`**. Admin and Supabase are shared; monitor both when shop metrics look fine but the site feels slow.

---

## Simple rule for any monthly quota

| Usage level | Meaning | Action |
|---|---|---|
| **0–50%** | Healthy | Normal |
| **50–70%** | Watch | Check trend |
| **70–85%** | Warning | Optimize now |
| **85–95%** | High risk | Immediate action |
| **95%+** | Critical | Expect throttling / overage / impact |

**Buy N Try warning rule:** don’t wait for 95%. Treat **70% = investigate**, **80% = optimize immediately**, **90% = critical** — especially **Vercel Active CPU**, **Supabase DB capacity**, and **image usage**.

---

## 1. Vercel (check first)

Use **Usage** + **Observability** (routes, cache hits, bots, function duration, errors).

| Metric | Healthy | Worry when | Common causes |
|---|---:|---:|---|
| **Active CPU / Compute** | <60% quota | >75% | Dynamic SSR, heavy APIs, DB waits |
| **Function duration** | Public GET <1s; checkout <3s | p95 >3–5s | Supabase / API latency |
| **Function errors** | <0.5% | >1% | API failures, DB limits |
| **Edge / CDN requests** | Stable with traffic | Unexplained spike | Bots, prefetch, polling |
| **Fast Data Transfer** | <60% quota | >75% | Large HTML, images, video |
| **Image transformations** | Stable | Rapid daily growth | Too many widths / formats / SKUs |
| **ISR writes / revalidations** | Low | Large spikes | Excessive `revalidatePath` / tags |
| **Cache hit rate** | High on public pages | Low or falling | Pages unnecessarily dynamic |
| **Build / deploy usage** | Normal | Many builds/day | Constant pushes / previews |
| **403 / WAF** | Mostly bots | Real users blocked | Rule misconfiguration |

**Images:** fewer `next/image` variants and longer cache lifetimes reduce transformation work.

**Safety:** Enable **Spend Management / usage alerts** (e.g. 50%, 75%, 100% of spend threshold). Reduce unnecessary prefetch/polling where it inflates Edge volume.

**Project:** Only **`voltgear`** for shop production metrics.

---

## 2. Supabase

Shop can look fine on Vercel while the database is the bottleneck.

| Metric | Healthy | Worry when |
|---|---:|---:|
| **Database CPU** | <60% sustained | >75% sustained |
| **Memory** | Headroom | >80% sustained |
| **DB connections** | Well below limit | >70–80% of pool |
| **Slow queries** | Rare | Repeated >500ms–1s |
| **Database size** | <60% quota | >75% |
| **Disk utilization** | <70% | >85% |
| **Egress** | <60% monthly | >75% |
| **Storage** | <60% quota | >75% |
| **Edge Function errors** | ~0% | >1% |
| **API 5xx** | ~0% | Repeated bursts |

**Buy N Try focus:** Supavisor pooling → active connections → slow queries → **checkout RPC latency** → **analytics table growth** (T-15 first-party data).

Live project (see `.env.example`): **Final-store** Supabase — not legacy paused projects.

---

## 3. Product images / media

| Item | Target |
|---|---|
| Product thumbnail | Prefer <100 KB |
| PDP image | ~100–300 KB |
| Hero | <400–500 KB |
| Formats | WebP / AVIF where practical |
| `sizes` | Correct on responsive images |
| Below fold | Lazy loaded |
| LCP / hero | Not lazy loaded |
| Video | No eager huge downloads |

Limit unnecessary `next/image` size variants (product × width × format → Vercel Image Transformations).

---

## 4. Resend (transactional email)

Monitor: order-confirmation success, failures, suppressions, bounce, complaint rate.

| Bounce rate | Status |
|---|---|
| <1% | Green |
| 1–2% | Watch |
| 2–4% | Warning |
| ≥4% | Critical (provider acceptable-use ~4% ceiling) |

Complaint rate: stay **well below 0.08%** (provider guidance).

**Rule:** Email failure must **never** make an already-created order appear failed to the shopper.

---

## 5. TikTok / Meta / first-party analytics (weekly)

| Check | Expect |
|---|---|
| TikTok PageView → Purchase funnel | Events flowing |
| Browser + CAPI | Deduped where configured |
| Purchase currency | PKR |
| Purchase value | Matches order total |
| `content_id` | Matches catalog |
| Meta Pixel | Active |
| First-party `/api/analytics/event` | No error spikes in logs |
| UTM → order | Preserved where designed |

**Sanity:** Admin order count ≈ Purchase events (allow ad blockers, non-TikTok traffic). Large mismatch = investigate.

---

## 6. Checkout (continuous)

Alert if:

- Checkout API p95 > **3–4s**
- Checkout 5xx > **1%**
- Validation errors spike
- Orders stop despite traffic
- Duplicate orders
- Negative stock
- Promo / phone validation spikes
- UI stuck on “Processing…”

**Keep:** server-authoritative prices, atomic stock, idempotency, one logical order per checkout attempt.

---

## 7. Bots / abuse

Observability: requests by path, country, UA, bot status.

Suspicious: hammering `/api/*`, checkout POST floods, search scraping, mass 404s, random image widths, full-catalog scrapers.

Do **not** disable WAF to “reduce 403s” if it blocks synthetic bursts.

---

## 8. Cache health

| Surface | Expectation |
|---|---|
| Home / categories / catalog | High cache / ISR hit rate |
| Cart / checkout / account | Never shared-cache private state |

Watch: falling hit rate, rising DB reads, revalidate storms, stale prices (checkout must still revalidate price/stock server-side).

Shop ISR TTLs: `packages/shared/lib/storefront-cache.ts` (`STOREFRONT_CATALOG_REVALIDATE`, etc.).

---

## 9. Backups & DR

| Frequency | Action |
|---|---|
| Daily | Supabase project healthy |
| Weekly | Backup status |
| Monthly | Export critical orders/products; verify env secrets |
| Quarterly | Test restore in safe environment |

Consider **PITR** when order volume justifies it. Untested backups are unproven.

---

## 10. Security (periodic audit)

**Vercel:** no secrets in `NEXT_PUBLIC_*`; prod vs preview env separation.

**Supabase:** service role server-only; RLS on private data; no anonymous order/admin reads.

**Store:** server price/coupon validation; checkout rate limits; idempotency; admin auth; no PII in URLs/logs.

---

## Daily “10 numbers” dashboard

| # | Metric |
|---|---|
| 1 | Vercel Active CPU |
| 2 | Vercel Image Transformations |
| 3 | Vercel Edge / CDN Requests |
| 4 | Vercel Fast Data Transfer |
| 5 | Vercel function errors + p95 duration |
| 6 | Supabase CPU |
| 7 | Supabase DB connections |
| 8 | Supabase DB size + egress |
| 9 | Checkout success / error rate |
| 10 | Orders vs TikTok/Meta Purchase events |

---

## Related docs

- `docs/OPERATING-MODEL.md` — how we ship features and deploy **voltgear**
- `docs/modules/deploy/DEPLOY_IMPLEMENTATION.md` — Vercel projects, env, alerts
- `docs/superpowers/specs/2026-09-25-t41-vercel-shop-hardening-design.md` — usage reduction program
