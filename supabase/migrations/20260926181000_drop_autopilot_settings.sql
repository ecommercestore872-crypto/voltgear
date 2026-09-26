-- Autopilot admin UI removed; drop unused settings blob.

ALTER TABLE public.site_settings DROP COLUMN IF EXISTS autopilot;
