# Database / Supabase — release notes

## 2026-09-25 — Remediation step 2 (analytics retention)

- Indexes on analytics `last_activity_at`, `last_seen_at`, `occurred_at`, and `visitor_id` for faster daily cleanup.
- Stronger daily purge batches (events/sessions) so tables do not grow without bound.
- Health runbook: `SUPABASE_HEALTH.md` — apply migration with `npx supabase db push`.
