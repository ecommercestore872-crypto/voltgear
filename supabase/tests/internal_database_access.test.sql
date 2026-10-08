-- Run on an isolated/local database after applying migrations: supabase test db.
-- Permission checks never retrieve customer records or advance order numbers.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;
SELECT plan(16);

SELECT ok(
  (SELECT 'security_invoker=true' = ANY (reloptions)
   FROM pg_class WHERE oid = 'public.admin_customer_rollups'::regclass),
  'Customer rollups enforce the querying role');
SELECT ok(NOT has_table_privilege('anon', 'public.admin_customer_rollups', 'SELECT'),
  'Visitors cannot read customer rollups');
SELECT ok(NOT has_table_privilege('authenticated', 'public.admin_customer_rollups', 'SELECT'),
  'Signed-in browser users cannot read customer rollups');
SELECT ok(has_table_privilege('service_role', 'public.admin_customer_rollups', 'SELECT'),
  'The server retains customer-rollup access');

SELECT ok(NOT has_function_privilege('anon', 'public.next_order_public_number()', 'EXECUTE'),
  'Visitors cannot allocate order numbers');
SELECT ok(NOT has_function_privilege('authenticated', 'public.next_order_public_number()', 'EXECUTE'),
  'Signed-in browser users cannot allocate order numbers');
SELECT ok(has_function_privilege('service_role', 'public.next_order_public_number()', 'EXECUTE'),
  'The server retains order-number allocation');

SELECT ok(NOT has_function_privilege('anon', 'public.admin_order_dashboard_metrics(timestamptz)', 'EXECUTE'),
  'Visitors cannot call admin order metrics');
SELECT ok(NOT has_function_privilege('authenticated', 'public.admin_order_dashboard_metrics(timestamptz)', 'EXECUTE'),
  'Signed-in browser users cannot call admin order metrics');
SELECT ok(has_function_privilege('service_role', 'public.admin_order_dashboard_metrics(timestamptz)', 'EXECUTE'),
  'The server retains admin order metrics');

SELECT ok(NOT EXISTS (
  SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
    AND (has_function_privilege('anon', p.oid, 'EXECUTE')
      OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))
), 'Optional RLS event helper is not executable by browser roles');

SELECT ok(NOT EXISTS (
  SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN ('checkout_place_order', 'checkout_decrement_inventory', 'cancel_order_restore_inventory')
    AND (has_function_privilege('anon', p.oid, 'EXECUTE')
      OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
      OR NOT has_function_privilege('service_role', p.oid, 'EXECUTE'))
), 'All checkout and inventory overloads remain server-only');

SELECT ok(NOT EXISTS (
  SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN ('get_low_stock_threshold', 'checkout_place_order',
      'checkout_decrement_inventory', 'cancel_order_restore_inventory',
      'next_order_public_number', 'admin_order_dashboard_metrics')
    AND NOT COALESCE('search_path=public, pg_temp' = ANY(p.proconfig), false)
), 'Internal functions pin their search path and search temporary objects last');

SET LOCAL ROLE anon;
SELECT throws_ok('SELECT * FROM public.admin_customer_rollups LIMIT 0', '42501', NULL,
  'A real visitor query is denied even without retrieving rows');
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT throws_ok('SELECT * FROM public.admin_customer_rollups LIMIT 0', '42501', NULL,
  'A real signed-in browser query is denied');
RESET ROLE;

SELECT ok(NOT EXISTS (
  SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN ('checkout_place_order', 'checkout_decrement_inventory', 'cancel_order_restore_inventory')
    AND p.prosecdef
), 'Checkout and inventory are not changed into privileged definer functions');

SELECT * FROM finish();
ROLLBACK;
