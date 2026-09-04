ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS nav_links jsonb,
  ADD COLUMN IF NOT EXISTS help_links jsonb,
  ADD COLUMN IF NOT EXISTS footer_company_links jsonb,
  ADD COLUMN IF NOT EXISTS footer_care_links jsonb;
