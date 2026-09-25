# Supabase health — Buy N Try (Step 2)

**Project:** Final-store (`zeuhfqevqjkbzwdaxjuv`) — see `.env.example`.

## Dashboard (weekly)

| Area | Where | Worry when |
|------|--------|------------|
| CPU / memory | Reports → Database | Sustained >75% |
| Connections | Database → Connections / pooler | >70–80% of limit |
| Disk / size | Settings → Database | >75% of quota |
| Egress | Usage | >75% monthly |
| Slow queries | Logs / Query performance | Many >500ms |

Use thresholds in `docs/INFRASTRUCTURE-HEALTH-CHECKLIST.md` (70 / 80 / 90% rule).

## SQL sanity (SQL editor)

Row counts (watch **analytics_events** growth):

```sql
select
  (select count(*) from public.analytics_events) as events,
  (select count(*) from public.analytics_sessions) as sessions,
  (select count(*) from public.analytics_visitors) as visitors,
  (select count(*) from public.orders) as orders;
```

Retention policy (app): sessions/events **90 days**, visitors **365 days**. Daily purge via shop cron **`GET /api/flows`** (authorized with `CRON_SECRET`).

## Migrations

Apply new migrations from repo root:

```bash
npx supabase db push
```

Step 2 migration: `20260925100000_analytics_retention_indexes.sql` — indexes for cleanup and lookups.

## App-side connection discipline

- **One** cached service client per serverless instance (`packages/shared/lib/supabase/server.ts`).
- Checkout and admin writes use **service role** on the server only — never in the browser.
- Prefer ISR + short GET revalidate on read-heavy storefront queries to reduce repeated DB hits.

## Related

- `docs/modules/analytics/ANALYTICS_IMPLEMENTATION.md`
- `docs/REMEDIATION-STEPS.md` step 2
