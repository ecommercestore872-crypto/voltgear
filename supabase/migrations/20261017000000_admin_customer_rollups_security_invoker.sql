-- Supabase lint: run view as querying role (not definer) so RLS on orders applies consistently.

ALTER VIEW public.admin_customer_rollups SET (security_invoker = true);
