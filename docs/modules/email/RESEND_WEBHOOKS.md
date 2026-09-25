# Resend bounces & complaints (remediation step 6)

## Webhook endpoint (admin app)

| Field | Value |
|-------|--------|
| URL | `https://voltgear-admin.vercel.app/api/webhooks/resend` (or your admin production host) |
| Events | `email.bounced`, `email.complained` |
| Env | `RESEND_WEBHOOK_SECRET` — signing secret from Resend (starts with `whsec_`) |

Set the same secret on the **admin** Vercel project. Shop (**voltgear**) does not need the webhook URL; suppressions live in Supabase and apply to all sends via `lib/email.ts`.

## Dashboard

1. [Resend → Webhooks](https://resend.com/webhooks) → Add endpoint.
2. Paste admin URL above; select bounce + complaint events.
3. Copy signing secret → Vercel admin env `RESEND_WEBHOOK_SECRET` → redeploy admin.

## Monitoring

- **Resend:** Audiences / logs — bounce & complaint rates (see `docs/INFRASTRUCTURE-HEALTH-CHECKLIST.md` §4).
- **Vercel admin logs:** filter `[resend-webhook]`.
- **Shop logs:** `[email]` with `outcome: skipped_suppressed` or `send_failed`.
- **Checkout:** `[checkout-slo]` includes `emailOutcome` (`ok`, `partial`, `failed`, `exception`).

## Order checkout rule

After the order row exists, checkout **always** returns `200` with `orderId` even if Resend fails. Failures are noted on the order and logged — never a 500 to the shopper for email alone.

## Database

Migration `20260925220000_email_suppressions.sql` — run `npx supabase db push` on live.
