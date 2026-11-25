-- Owner request: any order (real or practice) can be deleted from admin.
-- Replaces admin_delete_order only; admin_delete_demo_order / admin_purge_demo_data stay demo-only.
-- Still blocked: an order with a live courier shipment (cancel the PostEx booking first).
CREATE OR REPLACE FUNCTION public.admin_delete_order(
    p_order_id text,
    p_admin_user_id uuid
)
RETURNS jsonb AS $$
DECLARE
    v_order public.orders%ROWTYPE;
    item record;
    v_remaining integer;
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

    IF v_order.postex_booking_claimed_at IS NOT NULL
       OR v_order.postex_booking_state IN ('in_progress', 'unknown')
       OR (NULLIF(trim(v_order.postex_tracking_number), '') IS NOT NULL
           AND v_order.postex_shipment_cancelled_at IS NULL
           AND v_order.status <> 'delivered') THEN
        INSERT INTO public.order_deletion_log (order_id, admin_user_id, order_was_demo, outcome, reason)
        VALUES (v_order.order_id, p_admin_user_id, COALESCE(v_order.is_demo, false), 'rejected', 'courier_active');
        RETURN jsonb_build_object('ok', false, 'error', 'This order has an active courier shipment. Cancel the PostEx shipment first, then delete it');
    END IF;

    BEGIN
        IF v_order.inventory_reserved THEN
            FOR item IN
                SELECT slug, sum(quantity)::integer AS quantity
                FROM public.order_items
                WHERE order_id = v_order.id AND slug IS NOT NULL AND quantity > 0
                GROUP BY slug ORDER BY slug
            LOOP
                UPDATE public.products
                SET quantity = CASE WHEN quantity IS NULL THEN NULL ELSE quantity + item.quantity END
                WHERE slug = item.slug RETURNING quantity INTO v_remaining;
                IF FOUND AND v_remaining IS NOT NULL THEN
                    UPDATE public.products SET stock_status = CASE
                        WHEN v_remaining <= 0 THEN 'out-of-stock'
                        WHEN v_remaining <= 5 THEN 'low-stock'
                        ELSE 'in-stock' END
                    WHERE slug = item.slug;
                END IF;
            END LOOP;
        END IF;

        DELETE FROM public.email_events WHERE data->>'orderId' = v_order.order_id;
        DELETE FROM public.orders WHERE id = v_order.id;
        INSERT INTO public.order_deletion_log (order_id, admin_user_id, order_was_demo, outcome)
        VALUES (v_order.order_id, p_admin_user_id, COALESCE(v_order.is_demo, false), 'deleted');
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO public.order_deletion_log (order_id, admin_user_id, order_was_demo, outcome, reason)
        VALUES (v_order.order_id, p_admin_user_id, COALESCE(v_order.is_demo, false), 'rejected', 'deletion_failed');
        RETURN jsonb_build_object('ok', false, 'error', 'Could not safely delete this order');
    END;

    RETURN jsonb_build_object('ok', true, 'order_id', v_order.order_id);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.admin_delete_order(text, uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_order(text, uuid) TO service_role;
