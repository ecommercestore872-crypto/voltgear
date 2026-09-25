# Checkout SLO — Buy N Try

**Endpoint:** `POST /api/checkout` (shop **voltgear** only).

## Targets

| Metric | Target | Alert |
|--------|--------|-------|
| **p95 latency** | < 3s | > 4s sustained in Vercel Observability |
| **5xx rate** | < 0.5% | > 1% |
| **Duplicate orders** | 0 per idempotency key | DB unique `idempotency_key` + fingerprint |

## Guarantees (code)

- Prices/stock from server (`resolveCheckout` + `checkout_place_order` RPC).
- **Idempotency:** header `Idempotency-Key` or body `idempotencyKey` (8–128 chars); Postgres unique index; fingerprint mismatch → conflict.
- **Rate limit:** 12 attempts / IP / min; 5 / email / min.
- **Email failure** does not fail HTTP success after order is stored (`notifyNewOrderEmails` + optional admin note).

## Logs

Filter Vercel logs: **`[checkout-slo]`** — JSON with `outcome`, `status`, `durationMs` (no email/phone).

| outcome | Meaning |
|---------|---------|
| `success` | New order created |
| `replayed` | Idempotent replay |
| `validation` | 400 client/validation |
| `rate_limit` | 429 |
| `price_changed` | 409 |
| `create_failed` | 500 order persist |
| `server_error` | 500 unexpected |

## Tests

- `packages/shared/lib/checkout-guard.test.ts` — idempotency key + rate limit
- `packages/shared/lib/checkout-observability.test.ts` — SLO log shape
- `packages/shared/lib/email-rules.test.ts` — `orderEmailFailureNote`
- DB: `supabase/migrations/20260919051542_checkout_idempotency.sql`

## Related

- `docs/INFRASTRUCTURE-HEALTH-CHECKLIST.md` § Checkout
- `docs/REMEDIATION-STEPS.md` step 4
