# Email — release notes

## 2026-09-25 — Bounce/complaint webhook + checkout-safe sends (step 6)

- Admin `POST /api/webhooks/resend` records bounces/complaints in `email_suppressions`; sends skip suppressed addresses.
- Checkout wraps email + post-purchase enqueue in try/catch; `[checkout-slo]` logs `emailOutcome`.
- Setup: `docs/modules/email/RESEND_WEBHOOKS.md`.

## 2026-09-05 — Distinct admin new-order mail (T-34)

- Customer confirmation is no longer BCC’d to the owner.
- Owner gets a separate “New customer order” email at `ORDER_NOTIFY_EMAIL`.
- Visible brand fallback is Buy n Try (`SHOPPER_BRAND`), not VoltGear.

## 2026-08-26 — Order email templates (T-04)

- Customers get a light, phone-first email for confirmed, packing, shipped, delivered, and cancelled orders, with a Track button.
- New orders BCC `ORDER_NOTIFY_EMAIL` (when set) so you see confirmations. Status emails go to the customer only. Abandoned cart, win-back, and review-request emails are unchanged.
