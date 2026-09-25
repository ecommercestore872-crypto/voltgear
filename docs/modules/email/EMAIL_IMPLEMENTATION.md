# Transactional email implementation

Resend sends store emails. T-04 replaced the five **order** templates. Marketing templates (abandoned cart, win-back, review request) still use the older dark HTML.

## Who gets what

- **Customer:** confirmation at checkout; processing / shipped / delivered / cancelled when you change status in `/admin/orders`.
- **You:** BCC on confirmation only, if `ORDER_NOTIFY_EMAIL` is set. That address is also Reply-To, so “reply to this email” reaches you.
- **`new` status:** no email (confirmation already went out).

## Env

| Variable | Role |
|---|---|
| `RESEND_API_KEY` | Send via Resend. If missing, the message is logged in the server console |
| `FROM_EMAIL` | From header (usually a no-reply address) |
| `ORDER_NOTIFY_EMAIL` | BCC + Reply-To for confirmations. Status emails are not BCC’d |
| `BRAND_NAME` | Name in the template |
| `NEXT_PUBLIC_SITE_URL` | Base for `/track?orderId=&email=` |

Add `ORDER_NOTIFY_EMAIL` to `.env.local` (your inbox). It is listed in `.env.example`.

## Templates

Light order shell (`lib/email-rules.ts`): white card, dark text.

- **Confirmed:** items, cash on delivery, delivery address (city, postal, phone), Track
- **Processing / shipped / delivered / cancelled:** headline, order ID, optional admin note, Track. No phone or address

The optional note from the admin status form is where a tracking number goes. There is no courier API.

## Key files

| Path | Role |
|---|---|
| `lib/email-rules.ts` | Builders + BCC helper (unit-tested) |
| `lib/email.ts` | Resend `deliver()`, marketing templates, send wrappers |
| `app/api/checkout/route.ts` | Sends confirmation (passes address) |
| `app/api/orders/[orderId]/status/route.ts` | Sends status email (not `new`) |
| `app/api/flows/route.ts` | Abandoned / win-back / review (unchanged HTML) |

## Bounces & complaints

Webhook + suppressions: **`docs/modules/email/RESEND_WEBHOOKS.md`**. Suppressed addresses are skipped on send; checkout success is independent of email delivery.

## Out of this module

Admin email CMS, courier APIs, T-07 storefront look, T-05 analytics, switching off Resend.
