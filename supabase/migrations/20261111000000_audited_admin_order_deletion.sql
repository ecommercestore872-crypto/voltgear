-- Prepared locally. Apply only after reviewing the admin deletion policy.
-- All work below runs in one RPC transaction; an audit failure rolls back deletion.
CREATE TABLE IF NOT EXISTS public.order_deletion_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id text NOT NULL,
    admin_user_id uuid NOT NULL,
    deletion_time timestamptz NOT NULL DEFAULT now(),
    order_was_demo boolean,
    outcome text NOT NULL CHECK (outcome IN ('deleted', 'rejected')),
    reason text
);

ALTER TABLE public.order_deletion_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_deletion_log FROM PUBLIC, anon, authenticated;
GRANT INSERT, SELECT ON public.order_deletion_log TO service_role;

CREATE OR REPLACE FUNCTION public.admin_delete_order(
    p_order_id text,
    p_admin_user_id uuid
)
RETURNS jsonb AS $$
DECLARE
    v_order public.orders%ROWTYPE;
BEGIN
    IF p_admin_user_id IS NULL THEN
        RAISE EXCEPTION 'BUSINESS_ERROR: A named admin session is required';
    END IF;

    SELECT * INTO v_order FROM public.orders
    WHERE order_id = trim(p_order_id) FOR UPDATE;
    IF NOT FOUND THEN
        INSERT INTO public.order_deletion_log (order_id, admin_user_id, outcome, reason)
        VALUES (trim(p_order_id), p_admin_user_id, 'rejected', 'not_found');
        RETURN jsonb_build_object('ok', false, 'error', 'Order not found');
    END IF;

    -- COD and cancellation do not prove that a financial record is disposable.
    IF NOT COALESCE(v_order.is_demo, false) THEN
        INSERT INTO public.order_deletion_log (order_id, admin_user_id, order_was_demo, outcome, reason)
        VALUES (v_order.order_id, p_admin_user_id, false, 'rejected', 'live_order');
        RETURN jsonb_build_object('ok', false, 'error', 'Live orders must be retained; use an approved archive or anonymization process');
    END IF;
    IF v_order.status IN ('shipped', 'delivered')
       OR NULLIF(trim(v_order.postex_tracking_number), '') IS NOT NULL
       OR v_order.postex_booking_claimed_at IS NOT NULL THEN
        INSERT INTO public.order_deletion_log (order_id, admin_user_id, order_was_demo, outcome, reason)
        VALUES (v_order.order_id, p_admin_user_id, true, 'rejected', 'fulfillment_started');
        RETURN jsonb_build_object('ok', false, 'error', 'A shipped or courier-booked order cannot be deleted');
    END IF;

    -- Existing function repairs reserved inventory and removes queued emails.
    PERFORM public.admin_delete_demo_order(v_order.order_id);
    INSERT INTO public.order_deletion_log (order_id, admin_user_id, order_was_demo, outcome)
    VALUES (v_order.order_id, p_admin_user_id, true, 'deleted');

    RETURN jsonb_build_object('ok', true, 'order_id', v_order.order_id);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.admin_delete_order(text, uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_order(text, uuid) TO service_role;
