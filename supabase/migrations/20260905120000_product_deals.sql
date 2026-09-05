-- Named product pair deals. Discount is always % off the cheaper item.
-- Browser never decides the amount; checkout re-applies these rows.

create table if not exists public.product_deals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug_a text not null,
  slug_b text not null,
  percent_off numeric not null check (percent_off >= 1 and percent_off <= 40),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_deals_active_idx on public.product_deals (active);

alter table public.product_deals enable row level security;
