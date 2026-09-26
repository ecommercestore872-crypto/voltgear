-- Remove first-party analytics tables and admin analytics settings (2026-09).

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_analytics_session_id_fkey;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_analytics_visitor_id_fkey;

ALTER TABLE public.orders DROP COLUMN IF EXISTS analytics_session_id;
ALTER TABLE public.orders DROP COLUMN IF EXISTS analytics_visitor_id;

DROP TABLE IF EXISTS public.analytics_events CASCADE;
DROP TABLE IF EXISTS public.analytics_sessions CASCADE;
DROP TABLE IF EXISTS public.analytics_visitors CASCADE;
DROP TABLE IF EXISTS public.analytics_saved_reports CASCADE;

ALTER TABLE public.site_settings DROP COLUMN IF EXISTS analytics_ad_spend;
