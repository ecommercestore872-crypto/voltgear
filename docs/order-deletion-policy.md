# Admin order deletion policy

The admin API requires a signed, named admin session, an approved browser origin, and the exact public order ID. Ordinary orders and any shipped or delivered order require the additional `DELETE ORDER` confirmation. The database RPC is restricted to `service_role`; the checks also run inside its transaction.

| Order state | Result |
| --- | --- |
| Practice or ordinary `new`/`processing`, including archived | Eligible when payment is COD, no active courier booking remains, and Meta Purchase delivery is complete or absent. An unfulfilled outstanding stock reservation is restored once. |
| Cancelled, including archived | Eligible when the courier was never booked or its cancellation is confirmed. Stock is restored only if the reservation flag is still set and no shipped or delivered history exists. |
| Shipped or courier booking/cancellation in progress or uncertain | Blocked until delivery or confirmed courier cancellation and reconciliation. |
| Delivered COD | Eligible with additional confirmation. The operational row is removed; stock is never restored. Restricted order, item, status, courier, and financial evidence remains. |
| Non-COD payment, unfinished Meta Purchase reporting, conflicting delivered courier evidence, unknown status, or missing itemized/stock data | Blocked pending reconciliation. |

Deletion does not contact PostEx, issue refunds, change settlements, or modify external order sheets. Delivered Meta outbox rows remain attached to the public order ID; unfinished outbox rows block deletion. Sent email event metadata is retained; unsent order emails are removed. The deletion audit records the public order ID, named actor, time, and outcome without customer PII. A restricted evidence table keeps the order snapshot and dependent records, and a tombstone prevents reuse of public order IDs, internal IDs, and checkout idempotency keys.

The evidence tables have RLS enabled, are accessible only to the server service role, and reject updates or deletes. Evidence is retained without automatic expiry until an approved legal and business retention schedule exists. The application has no separate payment or settlement ledger; COD fulfillment evidence is preserved here, but any external courier or accounting records remain external and must be reconciled before an administrator uses deletion.

Apply both `20261113000000_safe_all_order_deletion.sql` and `20261113000001_deletion_dashboard_metrics.sql` before deploying the admin app. The second migration keeps historical dashboard totals while operational queues use live orders. The old two-argument RPC remains during rollout but cannot delete ordinary orders because it lacks the extra confirmation. Neither migration is applied to production by this PR.

Local verification: start isolated Supabase, apply both migrations locally, then pipe `supabase/tests/safe_all_order_deletion.sql` to local `psql -v ON_ERROR_STOP=1`. Its fixtures and assertions run under `service_role` inside `BEGIN`/`ROLLBACK`.
