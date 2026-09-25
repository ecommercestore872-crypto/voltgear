# Backups & disaster recovery — step 9

**Project:** Final-store (`zeuhfqevqjkbzwdaxjuv`) — production catalog + orders.

## Two layers

| Layer | What | Who |
|-------|------|-----|
| **Supabase** | Daily backups (dashboard) | Supabase Pro/plan — confirm under **Database → Backups** |
| **Monthly export** | Critical tables JSON in repo `backups/YYYY-MM/` | You — `npm run export:dr` |

Supabase backups are the **restore** path for full DB. Monthly export is a **portable copy** of commerce-critical rows (orders, products, promos, settings) for audit and partial recovery.

## Monthly (first week of month)

1. From repo root with `.env.local` (service role):
   ```bash
   npm run export:dr
   npm run verify:dr
   ```
2. Copy `backups/YYYY-MM/` to encrypted off-site storage (OneDrive/USB — **not** git).
3. In Supabase dashboard: confirm **latest backup** timestamp < 24h.

Exports contain **order PII** (customer JSON). Treat like financial data.

## Quarterly restore drill (≈1 hour)

Goal: prove you can recover **something** — not necessarily production.

1. **Option A — Supabase branch / new project (preferred)**  
   - Dashboard → restore backup to a **new** project or branch.  
   - Point a **preview** Vercel env at it; smoke login admin + one product page.

2. **Option B — Local sanity only**  
   - Run `npm run verify:dr` on last month’s export.  
   - Spot-check: `orders.json` row count ≈ admin order count for that month.

3. Log result in your ops note: date, option used, pass/fail, issues.

## When production is down

1. Check [Supabase status](https://status.supabase.com) and Vercel status.
2. If DB corruption/loss: Supabase **restore backup** (accept data loss window since backup).
3. Redeploy **voltgear** + **admin** from `main` (env unchanged).
4. Re-run `npm run smoke:t40` on buyntryy.com.

## PITR

Enable **Point-in-Time Recovery** when order volume or revenue justifies add-on cost. Until then, daily backup + monthly export meets step 9.

## Related

- `docs/INFRASTRUCTURE-HEALTH-CHECKLIST.md` §9  
- `packages/shared/lib/dr-export-rules.ts` — table list
