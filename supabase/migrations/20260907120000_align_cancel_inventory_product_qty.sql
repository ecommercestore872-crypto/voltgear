-- Align cancel restore with checkout_place_order:
-- place always decrements products.quantity; cancel must restore the same shelf.

CREATE OR REPLACE FUNCTION cancel_order_restore_inventory(
    p_order_id text,
    p_note text
) RETURNS jsonb AS $$
DECLARE
    v_order record;
    item record;
    v_current_stock integer;
    v_low_stock integer := 5;
    v_remaining integer;
BEGIN
    SELECT * INTO v_order FROM orders WHERE order_id = p_order_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'BUSINESS_ERROR: Order not found';
    END IF;

    IF v_order.status = 'cancelled' THEN
        RETURN jsonb_build_object('ok', true, 'status', 'cancelled');
    END IF;

    IF v_order.status = 'delivered' THEN
        RAISE EXCEPTION 'BUSINESS_ERROR: Cannot cancel a delivered order';
    END IF;

    UPDATE orders SET status = 'cancelled', status_updated_at = NOW() WHERE id = v_order.id;
    INSERT INTO order_status_history (order_id, status, note, at)
    VALUES (v_order.id, 'cancelled', p_note, NOW());

    -- Always restore product-level quantity (matches checkout_place_order).
    FOR item IN SELECT * FROM order_items WHERE order_id = v_order.id LOOP
        UPDATE products
        SET quantity = CASE
              WHEN quantity IS NULL THEN NULL
              ELSE quantity + item.quantity
            END
        WHERE slug = item.slug;

        SELECT quantity INTO v_current_stock FROM products WHERE slug = item.slug;
        IF v_current_stock IS NOT NULL THEN
            v_remaining := v_current_stock;
            UPDATE products
            SET stock_status = CASE
                  WHEN v_remaining = 0 THEN 'out-of-stock'
                  WHEN v_remaining <= v_low_stock THEN 'low-stock'
                  ELSE 'in-stock'
                END
            WHERE slug = item.slug;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('ok', true, 'status', 'cancelled');
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

REVOKE ALL ON FUNCTION cancel_order_restore_inventory FROM PUBLIC;
REVOKE ALL ON FUNCTION cancel_order_restore_inventory FROM anon;
REVOKE ALL ON FUNCTION cancel_order_restore_inventory FROM authenticated;
GRANT EXECUTE ON FUNCTION cancel_order_restore_inventory TO service_role;
