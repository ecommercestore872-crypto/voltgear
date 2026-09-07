-- Optional redemption cap for promo codes (null = unlimited).
alter table public.promo_codes
  add column if not exists max_usage integer;

comment on column public.promo_codes.max_usage is
  'Max redemptions; null means unlimited. Enforced at checkout against usage_count.';
