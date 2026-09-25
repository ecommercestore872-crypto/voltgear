# Orders — release notes

## 2026-09-25 — Checkout SLO (remediation step 4)

- `POST /api/checkout` emits `[checkout-slo]` JSON logs (duration, outcome, status; no PII). Targets: p95 ≤ 3s, alert ≥ 4s.
- Idempotent replay returns full order totals from DB. Unit tests for idempotency key, cache, rate limit, and SLO helpers in CI.
- See `docs/modules/orders/CHECKOUT_SLO.md`.

## 2026-09-01 — T-20 Shopper self-cancel

- Customers can cancel from `/track` within 24 hours while status is new or processing.
- Same cancelled email as admin; history note: “Cancelled by customer”.

## 2026-08-26 — Admin orders and shopper tracking (T-03)

- Staff can pack from **Orders** in `/admin`: compact table, search by ID / name / email, then a full COD detail with contact, address, items, and timeline.
- Any status (`new`, `processing`, `shipped`, `delivered`, `cancelled`) can be set with an optional note. Existing status emails still send; new templates stay T-04.
- `/track` still needs order ID + checkout email. After a match it shows a status headline, vertical timeline, items, and totals. Phone and address stay off that page. A wrong lookup does not reveal whether the order ID exists.
