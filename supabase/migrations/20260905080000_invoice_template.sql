ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS invoice_template jsonb;
