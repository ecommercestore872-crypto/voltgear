-- Per-product sale price with an optional end time. Additive; existing rows unaffected.
alter table public.products
  add column if not exists sale_price numeric,
  add column if not exists sale_ends_at timestamptz;
