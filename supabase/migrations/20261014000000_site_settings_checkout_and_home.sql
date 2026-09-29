ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS max_cod_amount numeric,
  ADD COLUMN IF NOT EXISTS whatsapp_confirm_flow boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS home_trust_headline text,
  ADD COLUMN IF NOT EXISTS home_trust_accent text,
  ADD COLUMN IF NOT EXISTS topbar_accent text,
  ADD COLUMN IF NOT EXISTS nav_shop_all_text text,
  ADD COLUMN IF NOT EXISTS home_featured_product_slug text,
  ADD COLUMN IF NOT EXISTS home_featured_custom_image text,
  ADD COLUMN IF NOT EXISTS home_featured_product_description text;
