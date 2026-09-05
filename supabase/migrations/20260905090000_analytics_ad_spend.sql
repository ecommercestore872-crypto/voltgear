ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS analytics_ad_spend jsonb;
