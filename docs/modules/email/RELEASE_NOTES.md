# Email — release notes

## 2026-09-05 — Distinct admin new-order mail (T-34)

- Customer confirmation is no longer BCC’d to the owner.
- Owner gets a separate “New customer order” email at `ORDER_NOTIFY_EMAIL`.
- Visible brand fallback is Buy n Try (`SHOPPER_BRAND`), not VoltGear.

## 2026-08-26 — Order email templates (T-04)

- Customers get a light, phone-first email for confirmed, packing, shipped, delivered, and cancelled orders, with a Track button.
- New orders BCC `ORDER_NOTIFY_EMAIL` (when set) so you see confirmations. Status emails go to the customer only. Abandoned cart, win-back, and review-request emails are unchanged.
