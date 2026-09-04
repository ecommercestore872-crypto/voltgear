# T-38B — Autopilot engines that can tell the truth

Date: 2026-09-05  
Status: implementing (owner: research then implement)  
Sources: existing book/dispatch routes; [PostEx Orders API](https://raw.githubusercontent.com/api-evangelist/postex/refs/heads/main/openapi/postex-orders-api-openapi.yml) (`token` header, `POST /v3/create-order`, `GET /v1/track-order/{trackingNumber}`).

## What each engine actually is

| Engine | Research | This slice |
|---|---|---|
| Dispatch | Real PostEx create-order already used by Book with PostEx. Validator exists. Nothing auto-ran. | Classify ready vs hold. Book AUTO_READY only. Persist **Auto-book** (default off). Manual Run now. Checkout + daily cron if on. |
| Rescue | Status string maps exist. PostEx track-order exists. No poll. | Track numbers we already have. If courier says delivered → mark delivered + email. Do not invent a customer portal. |
| Settlement | Reconcile function exists. No payout API. | CSV: tracking, collected COD, fee vs our orders. |
| Reorder | Fake in-memory SKU ledger. Real units already on products. | Leave as Units on hand. |
| Ads | Needs Meta/Google. | Stay catalog facts. |

## Safety

Default off. Never book BLOCKED/VERIFY, demo, or an order that already has tracking. No fake phone. Admin or CRON_SECRET only. Batch cap 8.

## Out of scope

Meta ads, payout file from PostEx, Leopards/TCS, turning Active/Shadow theater back on.
