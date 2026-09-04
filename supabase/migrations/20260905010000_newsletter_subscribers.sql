-- Footer / popup newsletter list. Service role only.

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_normalized text not null unique,
  source text not null default 'footer',
  created_at timestamptz not null default now()
);

create index if not exists newsletter_subscribers_created_idx
  on public.newsletter_subscribers (created_at desc);

alter table public.newsletter_subscribers enable row level security;
