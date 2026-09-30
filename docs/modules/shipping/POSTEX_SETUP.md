# PostEx integration (Buy n Try / VoltGear admin)

Manual COD booking only — checkout never calls PostEx. Staff book from **Admin → Orders → [order]**.

Official API base: `https://api.postex.pk/services/integration/api/order`  
Auth: HTTP header `token: <merchant API token>` on every request.

References: [PostEx Orders API (OpenAPI)](https://raw.githubusercontent.com/api-evangelist/postex/refs/heads/main/openapi/postex-orders-api-openapi.yml), [Reference API (cities & pickup)](https://raw.githubusercontent.com/api-evangelist/postex/refs/heads/main/openapi/postex-reference-api-openapi.yml).

---

## 1. PostEx merchant account (you do this in PostEx’s dashboard)

1. Register at [postex.pk](https://postex.pk) as a merchant (COD / logistics).
2. Complete KYC and add your **pickup / warehouse address** in the PostEx merchant app or web dashboard.
3. Open **API / Integration** (wording varies) and copy the **API token**. Treat it like a password.
4. Note your **pickup address code** (from pickup address list — often a short code like `001`).

Support: info@postex.pk if token or pickup codes are missing.

---

## 2. Environment variables (admin Vercel project only)

Set on **voltgear-admin** (not the public shop unless you duplicate for local dev):

| Variable | Required | Purpose |
|----------|----------|---------|
| `POSTEX_API_TOKEN` | Yes | Merchant token header |
| `POSTEX_PICKUP_ADDRESS_CODE` | Yes | Pickup code from `get-merchant-address` |
| `POSTEX_API_BASE_URL` | No | Default `https://api.postex.pk` |

Never commit tokens. Never expose `POSTEX_API_TOKEN` to the browser (`NEXT_PUBLIC_*`).

Local admin dev: add the same keys to `apps/admin/.env.local`.

---

## 3. Database migrations

On Supabase **Final-store**:

```bash
npx supabase db push
```

Or run SQL for:

- `20261015000000_orders_postex_tracking_number.sql`
- `20261016000000_orders_postex_booking_claimed_at.sql`

---

## 4. Verify from admin UI

1. Deploy admin with env vars.
2. **Settings → PostEx shipping** → **Test PostEx API** (operational city count).
3. **List pickup addresses** → confirm code matches `POSTEX_PICKUP_ADDRESS_CODE`.
4. Open a real COD order with valid **03xxxxxxxxx** phone and a city PostEx serves.
5. **Validate for PostEx** (dry run) → **Book with PostEx** → tracking saved, status → `processing`.
6. **Print PostEx Airway Bill** (PDF from PostEx).
7. After dispatch updates in PostEx, **Sync status from PostEx** maps courier status to shop status.

If book fails after a timeout, use **Reconcile with PostEx** before retrying (DB claim prevents duplicate bookings).

---

## 5. CLI smoke test (optional)

With `POSTEX_API_TOKEN` in the environment:

```bash
npm run postex:smoke
```

---

## 6. API routes (admin-auth only)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/postex/connectivity` | Token + operational cities |
| GET | `/api/admin/postex/pickup-address` | Pickup codes |
| GET | `/api/admin/postex/order-payload/[orderId]` | Dry-run payload |
| POST | `/api/admin/postex/book` | Create shipment (v3 create-order) |
| GET | `/api/admin/postex/reconcile/[orderId]` | Match order ref in PostEx list |
| POST | `/api/admin/postex/sync-status/[orderId]` | Track + update order status (includes pickup/delivery dates in JSON) |
| PUT | `/api/admin/postex/cancel/[orderId]` | Cancel shipment on PostEx (`v1/cancel-order`) |
| GET | `/api/admin/postex/airway-bill/[orderId]` | Invoice PDF |
| GET | `/api/admin/postex/track/[orderId]` | Safe track preview (status, dates, history) |

---

## 7. Order field rules (booking validation)

- `orderId` → PostEx `orderRefNumber` (e.g. `BNT-1032`)
- `total` → `invoicePayment` (PKR, COD amount)
- Customer name, address (≥5 chars), phone `03XXXXXXXXX`
- City must match PostEx **operational city** list (case-insensitive)
- `POSTEX_PICKUP_ADDRESS_CODE` must be set

---

## 8. What we intentionally do not do

- Auto-book on checkout (avoids duplicate / junk shipments)
- Store PostEx token in Supabase or CMS
- Customer-facing PostEx credentials

Auto-book remains a future, explicit product decision (see T-38 specs).
