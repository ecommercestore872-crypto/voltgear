alter table if exists site_settings
  add column if not exists lifestyle_shop jsonb;
