# Apply Supabase migrations (Final-store)

Run from repo root when linked to production or staging:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

**Recent shop/admin relevant:**

| Migration | Purpose |
|-----------|---------|
| `20261017000000_admin_customer_rollups_security_invoker.sql` | `admin_customer_rollups` uses `security_invoker` (Supabase lint) |
| `20261015000000_orders_postex_tracking_number.sql` | PostEx tracking column (when shipping that feature) |
| `20261016000000_orders_postex_booking_claimed_at.sql` | PostEx booking claim timestamp |

Dashboard alternative: SQL Editor → paste migration file contents → run.

After push, confirm in Database → Views → `admin_customer_rollups` → security invoker enabled.
