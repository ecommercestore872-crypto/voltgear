# Security audit — remediation step 8

Scope: **voltgear** (shop) + shared Supabase + **admin** app.

## Automated (CI / local)

```bash
npm run audit:security
npm test   # includes security-audit-rules + security-shop-api tests
```

Checks:

- Every `public.*` table in migrations has `enable row level security`
- `.env.example` `NEXT_PUBLIC_*` keys match allowlist (no secrets in browser bundle names)
- Shop APIs: checkout/contact rate limits, revalidate admin auth, flows cron auth, analytics/newsletter/upload limiters

## RLS

- All app data: **RLS on**, no anon insert/select policies on orders/admin tables
- Access via **service role** on server only (`getServiceClient({ admin: true })`)
- Storage: public read only for product images bucket (see init migration)

After schema changes: `npm run audit:security` before merge.

## Public env (`NEXT_PUBLIC_*`)

| OK in browser | Never prefix with `NEXT_PUBLIC_` |
|---------------|----------------------------------|
| Supabase URL + **anon** key | `SUPABASE_SERVICE_ROLE_KEY` |
| Site URL, Cloudinary cloud name + upload **preset** | `ADMIN_TOKEN`, `CRON_SECRET`, `RESEND_API_KEY` |
| GA / Clarity / TikTok / Meta **pixel IDs** (public by design) | Webhook secrets, API access tokens |

Allowlist: `packages/shared/lib/security-audit-rules.ts` → `PUBLIC_NEXT_ENV_ALLOWLIST`.

## Rate limits (shop POST)

| Route | Guard |
|-------|--------|
| `/api/checkout` | IP + email buckets (`checkout-guard`) |
| `/api/contact` | `takePublicPostLimit(contact)` |
| `/api/reviews`, `/api/promo/validate`, `/api/abandoned-cart` | `takePublicPostLimit` |
| `/api/analytics/event` | Ingest rate limit + origin rules |
| `/api/newsletter`, `/api/upload` | Dedicated limiters |
| `/api/orders/.../cancel` | IP limit (`takeOrderCancelLimit`) |
| `/api/deals/quote` | IP limit (`takeDealQuoteLimit`) |

Admin: login + forgot-password limiters.

## Manual quarterly

- Supabase dashboard → **Database** → confirm RLS enabled on new tables
- Vercel env: no `NEXT_PUBLIC_` on secrets; rotate `ADMIN_TOKEN` if leaked
- Review Observability for checkout/contact 429 spikes vs abuse

## Related

- `docs/agent/security-model.md`
- `docs/INFRASTRUCTURE-HEALTH-CHECKLIST.md` § security
