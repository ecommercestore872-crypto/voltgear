-- Close the final database-advisor warning on the legacy inventory RPC.
-- The application calls it only from trusted server code using service_role.

ALTER FUNCTION public.checkout_decrement_inventory(
  text, jsonb, text, numeric, numeric, numeric, boolean, jsonb
) SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.checkout_decrement_inventory(
  text, jsonb, text, numeric, numeric, numeric, boolean, jsonb
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.checkout_decrement_inventory(
  text, jsonb, text, numeric, numeric, numeric, boolean, jsonb
) TO service_role;
