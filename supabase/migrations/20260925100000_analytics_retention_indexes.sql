-- Step 2 remediation: faster analytics retention deletes and session lookups.

create index if not exists analytics_sessions_last_activity_at_idx
  on public.analytics_sessions (last_activity_at);

create index if not exists analytics_sessions_visitor_id_idx
  on public.analytics_sessions (visitor_id);

create index if not exists analytics_visitors_last_seen_at_idx
  on public.analytics_visitors (last_seen_at);

create index if not exists analytics_events_occurred_at_idx
  on public.analytics_events (occurred_at);
