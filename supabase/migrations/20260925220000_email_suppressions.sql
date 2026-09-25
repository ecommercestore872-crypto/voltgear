-- Resend bounce/complaint suppressions (service role only).

create table if not exists public.email_suppressions (
  id uuid primary key default gen_random_uuid(),
  email_normalized text not null unique,
  reason text not null check (reason in ('bounce', 'complaint')),
  source text not null default 'resend_webhook',
  created_at timestamptz not null default now(),
  last_event_at timestamptz not null default now()
);

create index if not exists email_suppressions_reason_idx
  on public.email_suppressions (reason, last_event_at desc);

alter table public.email_suppressions enable row level security;
