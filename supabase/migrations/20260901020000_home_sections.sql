-- T-10: home section order + visibility on live Biometic home
alter table public.site_settings
  add column if not exists home_sections jsonb;
