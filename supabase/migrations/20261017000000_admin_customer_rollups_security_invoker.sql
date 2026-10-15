-- Supabase lint: run view as querying role (not definer) so RLS on orders applies consistently.

ALTER VIEW public.admin_customer_rollups SET (security_invoker = true);

-- This view and the admin dashboard RPC expose customer/order data. Keep both
-- callable only by the server-side service role, even if Data API defaults
-- change or a role received an explicit grant in the past.
REVOKE ALL ON TABLE public.admin_customer_rollups FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.admin_customer_rollups TO service_role;

ALTER FUNCTION public.admin_order_dashboard_metrics(timestamptz)
  SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.admin_order_dashboard_metrics(timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_order_dashboard_metrics(timestamptz)
  TO service_role;

-- Inventory and order-number helpers are internal implementation details.
-- Explicit grants avoid relying on mutable project default privileges.
ALTER FUNCTION public.get_low_stock_threshold()
  SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.get_low_stock_threshold()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_low_stock_threshold() TO service_role;

REVOKE ALL ON FUNCTION public.next_order_public_number()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_order_public_number() TO service_role;

-- Some projects contain Supabase's legacy event-trigger helper even though it
-- was not created by this repository. Harden it when present without making
-- fresh environments fail the migration.
DO $$
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    EXECUTE
      'REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated';
  END IF;
END;
$$;
