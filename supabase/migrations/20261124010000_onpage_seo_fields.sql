-- On-page SEO fields. Additive only; existing rows and behavior are unchanged (all NULL / empty = fall back).

alter table public.categories
  add column if not exists seo_title text,
  add column if not exists meta_description text,
  add column if not exists seo_h1 text,
  add column if not exists seo_intro text,
  add column if not exists guide_text text,
  add column if not exists faq jsonb not null default '[]'::jsonb;

alter table public.products
  add column if not exists seo_title text;

create table if not exists public.city_seo (
  slug text primary key,
  intro text,
  updated_at timestamptz not null default now()
);

alter table public.city_seo enable row level security;
