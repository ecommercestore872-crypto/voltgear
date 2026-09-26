# Resend bounces & complaints (remediation step 6)

## Webhook endpoint (admin app)

| Field | Value |
|-------|--------|
| URL | `https://buyntryy.com/api/webhooks/resend` (proxied to admin app) |
| Events | `email.bounced`, `email.complained` |
| Env | `RESEND_WEBHOOK_SECRET` — signing secret from Resend (starts with `whsec_`) |

Set the same secret on the **admin** Vercel project. Shop (**voltgear**) does not need the webhook URL; suppressions live in Supabase and apply to all sends via `lib/email.ts`.

## Dashboard

1. [Resend → Webhooks](https://resend.com/webhooks) → Add endpoint.
2. Paste admin URL above; select bounce + complaint events.
3. Copy signing secret → Vercel admin env `RESEND_WEBHOOK_SECRET` → redeploy admin.

## CLI (repo)

| Command | Purpose |
|---------|---------|
| `npm run resend:health` | Probe `buyntryy.com` webhook + Resend API (needs full API key for webhook list) |
| `npm run resend:webhook-setup` | Create/update webhook via API (full-access key) |
| `npm run resend:backfill-suppressions` | Copy recent Resend bounces into Supabase (full-access key) |

**Send-only API keys** (Resend default for “Sending access”) cannot list emails or webhooks. Use the dashboard for webhooks; create a **Full access** key in [API keys](https://resend.com/api-keys) only if you want the scripts above.

Opening the webhook URL in a browser uses **GET** and should return JSON `{ ok, configured }` after admin deploy. Resend always uses **POST**.

## Monitoring

- **Resend:** Audiences / logs — bounce & complaint rates (see `docs/INFRASTRUCTURE-HEALTH-CHECKLIST.md` §4).
- **Vercel admin logs:** filter `[resend-webhook]`.
- **Shop logs:** `[email]` with `outcome: skipped_suppressed` or `send_failed`.
- **Checkout:** `[checkout-slo]` includes `emailOutcome` (`ok`, `partial`, `failed`, `exception`).

## Order checkout rule

After the order row exists, checkout **always** returns `200` with `orderId` even if Resend fails. Failures are noted on the order and logged — never a 500 to the shopper for email alone.

## Database

Migration `20260925220000_email_suppressions.sql` — run `npx supabase db push` on live.
