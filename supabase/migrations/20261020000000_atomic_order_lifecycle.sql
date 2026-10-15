-- Keep order status, status history, and inventory restoration in one
-- transaction. Both functions are service-role-only application commands.

CREATE OR REPLACE FUNCTION public.cancel_order_restore_inventory(
    p_order_id text,
    p_note text
) RETURNS jsonb AS $$
DECLARE
    v_order public.orders%ROWTYPE;
    item record;
    v_remaining integer;
BEGIN
    SELECT * INTO v_order
    FROM public.orders
    WHERE order_id = trim(p_order_id)
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'BUSINESS_ERROR: Order not found';
    END IF;
    IF v_order.status = 'cancelled' THEN
        RETURN jsonb_build_object('ok', true, 'status', 'cancelled', 'replayed', true);
    END IF;
    IF v_order.status = 'delivered' THEN
        RAISE EXCEPTION 'BUSINESS_ERROR: Cannot cancel a delivered order';
    END IF;

    UPDATE public.orders
    SET status = 'cancelled', status_updated_at = now()
    WHERE id = v_order.id;

    INSERT INTO public.order_status_history (order_id, status, note, at)
    VALUES (
        v_order.id,
        'cancelled',
        NULLIF(left(trim(COALESCE(p_note, '')), 500), ''),
        now()
    );

    -- Aggregate by slug so legacy orders containing duplicate line rows lock
    -- and update each product exactly once.
    FOR item IN
        SELECT slug, sum(quantity)::integer AS quantity
        FROM public.order_items
        WHERE order_id = v_order.id
          AND slug IS NOT NULL
          AND quantity > 0
        GROUP BY slug
        ORDER BY slug
    LOOP
        UPDATE public.products
        SET quantity = CASE
                WHEN quantity IS NULL THEN NULL
                ELSE quantity + item.quantity
            END
        WHERE slug = item.slug
        RETURNING quantity INTO v_remaining;

        IF FOUND AND v_remaining IS NOT NULL THEN
            UPDATE public.products
            SET stock_status = CASE
                    WHEN v_remaining <= 0 THEN 'out-of-stock'
                    WHEN v_remaining <= 5 THEN 'low-stock'
                    ELSE 'in-stock'
                END
            WHERE slug = item.slug;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('ok', true, 'status', 'cancelled', 'replayed', false);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.admin_update_order_status(
    p_order_id text,
    p_status text,
    p_note text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    v_order public.orders%ROWTYPE;
    v_status public.orders.status%TYPE;
    v_now timestamptz := now();
BEGIN
    IF p_status NOT IN ('new', 'processing', 'shipped', 'delivered') THEN
        IF p_status = 'cancelled' THEN
            RAISE EXCEPTION 'BUSINESS_ERROR: Cancellation must use the inventory-restoring command';
        END IF;
        RAISE EXCEPTION 'BUSINESS_ERROR: Invalid order status';
    END IF;
    v_status := p_status;

    SELECT * INTO v_order
    FROM public.orders
    WHERE order_id = trim(p_order_id)
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'BUSINESS_ERROR: Order not found';
    END IF;
    IF v_order.status = 'cancelled' THEN
        RAISE EXCEPTION 'BUSINESS_ERROR: A cancelled order cannot be reopened';
    END IF;
    IF v_order.status = 'delivered' AND v_status <> 'delivered' THEN
        RAISE EXCEPTION 'BUSINESS_ERROR: A delivered order cannot move backwards';
    END IF;
    IF (CASE v_order.status
            WHEN 'new' THEN 1
            WHEN 'processing' THEN 2
            WHEN 'shipped' THEN 3
            WHEN 'delivered' THEN 4
            ELSE 0
        END) >
       (CASE v_status
            WHEN 'new' THEN 1
            WHEN 'processing' THEN 2
            WHEN 'shipped' THEN 3
            WHEN 'delivered' THEN 4
            ELSE 0
        END) THEN
        RAISE EXCEPTION 'BUSINESS_ERROR: Order status cannot move backwards';
    END IF;
    IF v_order.status = v_status THEN
        RETURN jsonb_build_object('ok', true, 'status', v_status, 'replayed', true);
    END IF;

    UPDATE public.orders
    SET status = v_status, status_updated_at = v_now
    WHERE id = v_order.id;

    INSERT INTO public.order_status_history (order_id, status, note, at)
    VALUES (
        v_order.id,
        v_status,
        NULLIF(left(trim(COALESCE(p_note, '')), 500), ''),
        v_now
    );

    RETURN jsonb_build_object('ok', true, 'status', v_status, 'replayed', false);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.cancel_order_restore_inventory(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_order_restore_inventory(text, text) TO service_role;

REVOKE ALL ON FUNCTION public.admin_update_order_status(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(text, text, text) TO service_role;
