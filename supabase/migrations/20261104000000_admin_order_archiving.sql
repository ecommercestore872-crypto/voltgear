-- Archive is an admin view state only. Fulfillment, inventory, courier and
-- financial records remain untouched and available by order ID.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS orders_admin_active_created_idx
  ON public.orders (created_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS orders_admin_archived_created_idx
  ON public.orders (created_at DESC)
  WHERE archived_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.admin_set_order_archived(
  p_order_id text,
  p_archived boolean
) RETURNS jsonb AS $$
DECLARE
  v_id uuid;
  v_archived_at timestamptz;
BEGIN
  IF p_archived IS NULL THEN
    RAISE EXCEPTION 'BUSINESS_ERROR: Archived state is required';
  END IF;

  SELECT id, archived_at INTO v_id, v_archived_at
  FROM public.orders
  WHERE order_id = btrim(p_order_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BUSINESS_ERROR: Order not found';
  END IF;

  IF (v_archived_at IS NOT NULL) = p_archived THEN
    RETURN jsonb_build_object(
      'ok', true, 'archived', p_archived, 'replayed', true
    );
  END IF;

  UPDATE public.orders
  SET archived_at = CASE WHEN p_archived THEN now() ELSE NULL END
  WHERE id = v_id;

  RETURN jsonb_build_object(
    'ok', true, 'archived', p_archived, 'replayed', false
  );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.admin_set_order_archived(text, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_order_archived(text, boolean)
  TO service_role;
