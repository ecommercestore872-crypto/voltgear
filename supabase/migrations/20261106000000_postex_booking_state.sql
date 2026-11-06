-- One row lock coordinates booking, courier cancellation and shop cancellation.
-- Provider calls happen outside the transaction; uncertain outcomes keep their claim.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS postex_booking_state text NOT NULL DEFAULT 'not_requested',
  ADD COLUMN IF NOT EXISTS postex_booking_attempt_id uuid,
  ADD COLUMN IF NOT EXISTS postex_cancel_state text NOT NULL DEFAULT 'not_requested',
  ADD COLUMN IF NOT EXISTS postex_cancel_attempt_id uuid,
  ADD COLUMN IF NOT EXISTS postex_shipment_cancelled_at timestamptz;

UPDATE public.orders SET postex_booking_state = CASE
  WHEN postex_tracking_number IS NOT NULL THEN 'confirmed'
  WHEN postex_booking_claimed_at IS NOT NULL THEN 'unknown'
  ELSE 'not_requested' END
WHERE postex_booking_state = 'not_requested';

ALTER TABLE public.orders
  ADD CONSTRAINT orders_postex_booking_state_check CHECK
    (postex_booking_state IN ('not_requested','in_progress','unknown','confirmed','rejected')),
  ADD CONSTRAINT orders_postex_cancel_state_check CHECK
    (postex_cancel_state IN ('not_requested','in_progress','unknown','confirmed'));

CREATE OR REPLACE FUNCTION public.postex_claim_booking(p_order_id text)
RETURNS jsonb AS $$
DECLARE v_order public.orders%ROWTYPE; v_attempt uuid := gen_random_uuid();
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE order_id = trim(p_order_id) FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF v_order.payment <> 'cod' OR COALESCE(v_order.is_demo, false)
     OR v_order.status NOT IN ('new','processing')
     OR v_order.postex_tracking_number IS NOT NULL
     OR v_order.postex_booking_claimed_at IS NOT NULL
     OR v_order.postex_booking_state NOT IN ('not_requested','rejected')
     OR v_order.postex_cancel_state <> 'not_requested' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'conflict');
  END IF;
  UPDATE public.orders SET postex_booking_state = 'in_progress',
    postex_booking_attempt_id = v_attempt,
    postex_booking_claimed_at = clock_timestamp()
  WHERE id = v_order.id;
  RETURN jsonb_build_object('ok', true, 'attempt_id', v_attempt);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.postex_mark_booking_unknown(p_order_id text, p_attempt_id uuid)
RETURNS jsonb AS $$
DECLARE v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE order_id = trim(p_order_id) FOR UPDATE;
  IF NOT FOUND OR v_order.postex_booking_attempt_id IS DISTINCT FROM p_attempt_id
     OR v_order.postex_booking_state NOT IN ('in_progress','unknown')
     OR v_order.postex_tracking_number IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'conflict');
  END IF;
  UPDATE public.orders SET postex_booking_state = 'unknown' WHERE id = v_order.id;
  RETURN jsonb_build_object('ok', true, 'replayed', v_order.postex_booking_state = 'unknown');
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.postex_release_booking_preflight(p_order_id text, p_attempt_id uuid)
RETURNS jsonb AS $$
DECLARE v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE order_id = trim(p_order_id) FOR UPDATE;
  IF NOT FOUND OR v_order.postex_booking_attempt_id IS DISTINCT FROM p_attempt_id
     OR v_order.postex_booking_state <> 'in_progress'
     OR v_order.postex_tracking_number IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'conflict');
  END IF;
  UPDATE public.orders SET postex_booking_state = 'rejected',
    postex_booking_claimed_at = NULL WHERE id = v_order.id;
  RETURN jsonb_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.postex_complete_booking(
  p_order_id text, p_attempt_id uuid, p_tracking_number text, p_completed_at timestamptz
) RETURNS jsonb AS $$
DECLARE v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE order_id = trim(p_order_id) FOR UPDATE;
  IF NOT FOUND OR v_order.postex_booking_attempt_id IS DISTINCT FROM p_attempt_id
     OR v_order.postex_booking_state NOT IN ('in_progress','unknown')
     OR v_order.postex_booking_claimed_at IS NULL
     OR v_order.postex_tracking_number IS NOT NULL
     OR v_order.postex_cancel_state <> 'not_requested'
     OR v_order.status NOT IN ('new','processing')
     OR NULLIF(trim(COALESCE(p_tracking_number,'')), '') IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'conflict');
  END IF;
  UPDATE public.orders SET postex_tracking_number = trim(p_tracking_number),
    postex_booking_state = 'confirmed', postex_booking_claimed_at = NULL,
    status = 'processing', status_updated_at = p_completed_at
  WHERE id = v_order.id;
  RETURN jsonb_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.postex_claim_shipment_cancellation(p_order_id text, p_tracking_number text)
RETURNS jsonb AS $$
DECLARE v_order public.orders%ROWTYPE; v_attempt uuid := gen_random_uuid();
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE order_id = trim(p_order_id) FOR UPDATE;
  IF NOT FOUND OR v_order.postex_tracking_number IS DISTINCT FROM trim(p_tracking_number)
     OR v_order.postex_booking_state <> 'confirmed'
     OR v_order.postex_cancel_state <> 'not_requested'
     OR v_order.status NOT IN ('new','processing') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'conflict');
  END IF;
  UPDATE public.orders SET postex_cancel_state = 'in_progress',
    postex_cancel_attempt_id = v_attempt WHERE id = v_order.id;
  RETURN jsonb_build_object('ok', true, 'attempt_id', v_attempt);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.postex_mark_shipment_cancel_unknown(p_order_id text, p_attempt_id uuid)
RETURNS jsonb AS $$
DECLARE v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE order_id = trim(p_order_id) FOR UPDATE;
  IF NOT FOUND OR v_order.postex_cancel_attempt_id IS DISTINCT FROM p_attempt_id
     OR v_order.postex_cancel_state NOT IN ('in_progress','unknown') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'conflict');
  END IF;
  UPDATE public.orders SET postex_cancel_state = 'unknown' WHERE id = v_order.id;
  RETURN jsonb_build_object('ok', true, 'replayed', v_order.postex_cancel_state = 'unknown');
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.postex_mark_shipment_cancelled(
  p_order_id text, p_tracking_number text, p_attempt_id uuid
) RETURNS jsonb AS $$
DECLARE v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE order_id = trim(p_order_id) FOR UPDATE;
  IF NOT FOUND OR v_order.postex_tracking_number IS DISTINCT FROM trim(p_tracking_number)
     OR v_order.postex_cancel_attempt_id IS DISTINCT FROM p_attempt_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'conflict');
  END IF;
  IF v_order.postex_cancel_state = 'confirmed' AND v_order.postex_shipment_cancelled_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'replayed', true);
  END IF;
  IF v_order.postex_cancel_state NOT IN ('in_progress','unknown')
     OR v_order.status NOT IN ('new','processing') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'conflict');
  END IF;
  UPDATE public.orders SET postex_cancel_state = 'confirmed',
    postex_shipment_cancelled_at = clock_timestamp() WHERE id = v_order.id;
  RETURN jsonb_build_object('ok', true, 'replayed', false);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp;

-- Replace current inventory-restoring command without altering its once-only logic.
CREATE OR REPLACE FUNCTION public.cancel_order_restore_inventory(p_order_id text, p_note text)
RETURNS jsonb AS $$
DECLARE v_order public.orders%ROWTYPE; item record; v_remaining integer;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE order_id = trim(p_order_id) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BUSINESS_ERROR: Order not found'; END IF;
  IF v_order.status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', true, 'status', 'cancelled', 'replayed', true);
  END IF;
  IF v_order.status = 'delivered' THEN
    RAISE EXCEPTION 'BUSINESS_ERROR: Cannot cancel a delivered order';
  END IF;
  IF v_order.postex_booking_claimed_at IS NOT NULL
     OR v_order.postex_booking_state IN ('in_progress','unknown')
     OR v_order.postex_cancel_state IN ('in_progress','unknown') THEN
    RAISE EXCEPTION 'BUSINESS_ERROR: PostEx outcome requires reconciliation before shop cancellation';
  END IF;
  IF v_order.postex_tracking_number IS NOT NULL
     AND v_order.postex_shipment_cancelled_at IS NULL THEN
    RAISE EXCEPTION 'BUSINESS_ERROR: Cancel PostEx shipment before shop order';
  END IF;
  UPDATE public.orders SET status = 'cancelled', status_updated_at = now(),
    inventory_reserved = false WHERE id = v_order.id;
  INSERT INTO public.order_status_history(order_id,status,note,at)
  VALUES(v_order.id,'cancelled',NULLIF(left(trim(COALESCE(p_note,'')),500),''),now());
  IF v_order.inventory_reserved THEN
    FOR item IN SELECT slug, sum(quantity)::integer AS quantity FROM public.order_items
      WHERE order_id = v_order.id AND slug IS NOT NULL AND quantity > 0
      GROUP BY slug ORDER BY slug
    LOOP
      UPDATE public.products SET quantity = CASE WHEN quantity IS NULL THEN NULL ELSE quantity + item.quantity END
      WHERE slug = item.slug RETURNING quantity INTO v_remaining;
      IF FOUND AND v_remaining IS NOT NULL THEN
        UPDATE public.products SET stock_status = CASE
          WHEN v_remaining <= 0 THEN 'out-of-stock'
          WHEN v_remaining <= 5 THEN 'low-stock'
          ELSE 'in-stock' END WHERE slug = item.slug;
      END IF;
    END LOOP;
  END IF;
  RETURN jsonb_build_object('ok', true, 'status', 'cancelled', 'replayed', false);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp;

-- Manual status updates cannot race an unresolved provider create/cancel call.
CREATE OR REPLACE FUNCTION public.admin_update_order_status(
  p_order_id text, p_status text, p_note text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE v_order public.orders%ROWTYPE; v_status public.orders.status%TYPE;
BEGIN
  IF p_status NOT IN ('new','processing','shipped','delivered') THEN
    IF p_status = 'cancelled' THEN
      RAISE EXCEPTION 'BUSINESS_ERROR: Cancellation must use the inventory-restoring command';
    END IF;
    RAISE EXCEPTION 'BUSINESS_ERROR: Invalid order status';
  END IF;
  v_status := p_status;
  SELECT * INTO v_order FROM public.orders WHERE order_id = trim(p_order_id) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BUSINESS_ERROR: Order not found'; END IF;
  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'BUSINESS_ERROR: A cancelled order cannot be reopened';
  END IF;
  IF v_order.postex_booking_state IN ('in_progress','unknown')
     OR v_order.postex_cancel_state IN ('in_progress','unknown') THEN
    RAISE EXCEPTION 'BUSINESS_ERROR: PostEx outcome requires reconciliation before status change';
  END IF;
  IF v_order.postex_cancel_state = 'confirmed' AND v_status IN ('shipped','delivered') THEN
    RAISE EXCEPTION 'BUSINESS_ERROR: Cancelled PostEx shipment cannot advance to shipped or delivered';
  END IF;
  IF v_order.status = 'delivered' AND v_status <> 'delivered' THEN
    RAISE EXCEPTION 'BUSINESS_ERROR: A delivered order cannot move backwards';
  END IF;
  IF (CASE v_order.status WHEN 'new' THEN 1 WHEN 'processing' THEN 2
       WHEN 'shipped' THEN 3 WHEN 'delivered' THEN 4 ELSE 0 END) >
     (CASE v_status WHEN 'new' THEN 1 WHEN 'processing' THEN 2
       WHEN 'shipped' THEN 3 WHEN 'delivered' THEN 4 ELSE 0 END) THEN
    RAISE EXCEPTION 'BUSINESS_ERROR: Order status cannot move backwards';
  END IF;
  IF v_order.status = v_status THEN
    RETURN jsonb_build_object('ok', true, 'status', v_status, 'replayed', true);
  END IF;
  UPDATE public.orders SET status = v_status, status_updated_at = now() WHERE id = v_order.id;
  INSERT INTO public.order_status_history(order_id,status,note,at)
  VALUES(v_order.id,v_status,NULLIF(left(trim(COALESCE(p_note,'')),500),''),now());
  RETURN jsonb_build_object('ok', true, 'status', v_status, 'replayed', false);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp;

DO $$ DECLARE f text; BEGIN
  FOREACH f IN ARRAY ARRAY[
    'postex_claim_booking(text)',
    'postex_mark_booking_unknown(text,uuid)',
    'postex_release_booking_preflight(text,uuid)',
    'postex_complete_booking(text,uuid,text,timestamptz)',
    'postex_claim_shipment_cancellation(text,text)',
    'postex_mark_shipment_cancel_unknown(text,uuid)',
    'postex_mark_shipment_cancelled(text,text,uuid)',
    'cancel_order_restore_inventory(text,text)',
    'admin_update_order_status(text,text,text)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', f);
  END LOOP;
END $$;
