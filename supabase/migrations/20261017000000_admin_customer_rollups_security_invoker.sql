-- Customer aggregates and internal RPCs are used through getServiceClient(),
-- after authorization in the application. Browser roles must not call them.
-- Preserve server access and existing function bodies / inventory behavior.

ALTER VIEW public.admin_customer_rollups SET (security_invoker = true);
REVOKE ALL PRIVILEGES ON TABLE public.admin_customer_rollups
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.admin_customer_rollups TO service_role;

DO $$
DECLARE
  internal_function record;
BEGIN
  -- Cover every overload, including older checkout signatures on upgraded DBs.
  FOR internal_function IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'next_order_public_number',
        'checkout_decrement_inventory',
        'cancel_order_restore_inventory',
        'checkout_place_order',
        'admin_order_dashboard_metrics'
      )
  LOOP
    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      internal_function.signature
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %s TO service_role',
      internal_function.signature
    );
    -- pg_catalog is implicitly searched first; temporary objects last.
    EXECUTE format(
      'ALTER FUNCTION %s SET search_path = public, pg_temp',
      internal_function.signature
    );
  END LOOP;

  ALTER FUNCTION public.get_low_stock_threshold()
    SET search_path = public, pg_temp;

  -- Supabase may install this event-trigger helper outside app migrations.
  -- Revoking client execution does not disable its DDL event trigger.
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    REVOKE ALL PRIVILEGES ON FUNCTION public.rls_auto_enable()
      FROM PUBLIC, anon, authenticated;
  END IF;
END;
$$;
