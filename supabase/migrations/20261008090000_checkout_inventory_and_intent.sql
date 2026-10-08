-- Final checkout RPC override.
--
-- This migration intentionally comes after every historical checkout RPC
-- migration. Color/Size variants are sellable labels, not inventory buckets:
-- checkout validates the selected row but always locks and decrements the
-- parent product quantity.
-- Keep this definition last whenever checkout_place_order is changed.

CREATE OR REPLACE FUNCTION public.checkout_place_order(
    p_order_id text,
    p_customer jsonb,
    p_payment text,
    p_subtotal numeric,
    p_shipping numeric,
    p_total numeric,
    p_discount numeric,
    p_promo_code text,
    p_is_demo boolean,
    p_items jsonb,
    p_idempotency_key text DEFAULT NULL,
    p_idempotency_fingerprint text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    item record;
    v_product_id uuid;
    v_qty integer;
    v_current_stock integer;
    v_order_pk uuid;
    v_low_stock integer := 5;
    v_remaining integer;
    v_existing_pk uuid;
    v_existing_order_id text;
    v_existing_fingerprint text;
BEGIN
    -- The unique index is the concurrency authority. This fast path avoids
    -- unnecessary locks for ordinary retries; the unique-violation handler
    -- below covers two simultaneous requests with the same key.
    IF NULLIF(p_idempotency_key, '') IS NOT NULL THEN
        SELECT id, order_id, idempotency_fingerprint
          INTO v_existing_pk, v_existing_order_id, v_existing_fingerprint
        FROM public.orders
        WHERE idempotency_key = p_idempotency_key
        LIMIT 1;

        IF FOUND THEN
            IF v_existing_fingerprint IS DISTINCT FROM NULLIF(p_idempotency_fingerprint, '') THEN
                RAISE EXCEPTION 'BUSINESS_ERROR: IDEMPOTENCY_CONFLICT';
            END IF;
            RETURN jsonb_build_object(
                'ok', true,
                'order_id', v_existing_order_id,
                'internal_id', v_existing_pk,
                'replayed', true
            );
        END IF;
    END IF;

    BEGIN
        FOR item IN
            SELECT * FROM jsonb_array_elements(p_items)
            ORDER BY value->>'slug', value->>'variantKey'
        LOOP
            v_qty := (item.value->>'quantity')::integer;
            IF v_qty IS NULL OR v_qty <= 0 THEN
                RAISE EXCEPTION 'BUSINESS_ERROR: Invalid quantity % for %',
                    v_qty, item.value->>'slug';
            END IF;

            IF NULLIF(item.value->>'variantKey', '') IS NOT NULL THEN
                -- Validate the selected sellable label, then lock the parent
                -- product because Color/Size rows do not own inventory.
                SELECT p.id, p.quantity
                  INTO v_product_id, v_current_stock
                FROM public.products p
                JOIN public.product_variants pv ON pv.product_id = p.id
                WHERE p.slug = item.value->>'slug'
                  AND pv.key = item.value->>'variantKey'
                FOR UPDATE OF p;

                IF NOT FOUND THEN
                    RAISE EXCEPTION 'BUSINESS_ERROR: Variant not found for % %',
                        item.value->>'slug', item.value->>'variantKey';
                END IF;

            ELSE
                SELECT id, quantity
                  INTO v_product_id, v_current_stock
                FROM public.products
                WHERE slug = item.value->>'slug'
                FOR UPDATE;

            END IF;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'BUSINESS_ERROR: Product not found for %',
                    item.value->>'slug';
            END IF;

            -- NULL quantity is the established unlimited/unconfigured
            -- inventory convention. It is deliberately left untouched.
            IF v_current_stock IS NOT NULL THEN
                IF v_current_stock < v_qty THEN
                    RAISE EXCEPTION 'BUSINESS_ERROR: Insufficient stock for %',
                        item.value->>'slug';
                END IF;

                v_remaining := v_current_stock - v_qty;
                UPDATE public.products
                SET quantity = v_remaining,
                    stock_status = CASE
                        WHEN v_remaining = 0 THEN 'out-of-stock'
                        WHEN v_remaining <= v_low_stock THEN 'low-stock'
                        ELSE 'in-stock'
                    END
                WHERE id = v_product_id;
            END IF;
        END LOOP;

        INSERT INTO public.orders (
            order_id, customer, payment, subtotal, shipping, total, discount,
            promo_code, status, is_demo, idempotency_key, idempotency_fingerprint
        ) VALUES (
            p_order_id,
            p_customer,
            p_payment,
            p_subtotal,
            p_shipping,
            p_total,
            COALESCE(p_discount, 0),
            NULLIF(p_promo_code, ''),
            'new',
            p_is_demo,
            NULLIF(p_idempotency_key, ''),
            NULLIF(p_idempotency_fingerprint, '')
        )
        RETURNING id INTO v_order_pk;

        INSERT INTO public.order_status_history (order_id, status, note, at)
        VALUES (v_order_pk, 'new', 'Order placed', NOW());

        FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
            INSERT INTO public.order_items (
                order_id, slug, name, price, quantity, variant_key, variant_name,
                variant_sku, line_total
            ) VALUES (
                v_order_pk,
                item.value->>'slug',
                item.value->>'name',
                (item.value->>'price')::numeric,
                (item.value->>'quantity')::integer,
                NULLIF(item.value->>'variantKey', ''),
                NULLIF(item.value->>'variantName', ''),
                NULLIF(item.value->>'variantSku', ''),
                (item.value->>'lineTotal')::numeric
            );
        END LOOP;

        RETURN jsonb_build_object(
            'ok', true,
            'order_id', p_order_id,
            'internal_id', v_order_pk,
            'replayed', false
        );
    EXCEPTION
        WHEN unique_violation THEN
            -- A concurrent request may have decremented a locked inventory row
            -- before losing the idempotency race. This exception block rolls
            -- back the whole inner transaction, including that decrement.
            IF SQLERRM LIKE '%idx_orders_idempotency_key%' THEN
                SELECT id, order_id, idempotency_fingerprint
                  INTO v_existing_pk, v_existing_order_id, v_existing_fingerprint
                FROM public.orders
                WHERE idempotency_key = p_idempotency_key;

                IF v_existing_fingerprint IS DISTINCT FROM NULLIF(p_idempotency_fingerprint, '') THEN
                    RAISE EXCEPTION 'BUSINESS_ERROR: IDEMPOTENCY_CONFLICT';
                END IF;

                RETURN jsonb_build_object(
                    'ok', true,
                    'order_id', v_existing_order_id,
                    'internal_id', v_existing_pk,
                    'replayed', true
                );
            END IF;
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.cancel_order_restore_inventory(
    p_order_id text,
    p_note text
) RETURNS jsonb AS $$
DECLARE
    v_order record;
    item record;
    v_product_id uuid;
    v_current_stock integer;
    v_low_stock integer := 5;
    v_remaining integer;
BEGIN
    SELECT * INTO v_order
    FROM public.orders
    WHERE order_id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'BUSINESS_ERROR: Order not found';
    END IF;

    IF v_order.status = 'cancelled' THEN
        RETURN jsonb_build_object('ok', true, 'status', 'cancelled');
    END IF;

    IF v_order.status = 'delivered' THEN
        RAISE EXCEPTION 'BUSINESS_ERROR: Cannot cancel a delivered order';
    END IF;

    UPDATE public.orders
    SET status = 'cancelled', status_updated_at = NOW()
    WHERE id = v_order.id;

    INSERT INTO public.order_status_history (order_id, status, note, at)
    VALUES (v_order.id, 'cancelled', p_note, NOW());

    FOR item IN SELECT * FROM public.order_items WHERE order_id = v_order.id LOOP
        IF NULLIF(item.variant_key, '') IS NOT NULL THEN
            SELECT p.id, p.quantity
              INTO v_product_id, v_current_stock
            FROM public.products p
            JOIN public.product_variants pv ON pv.product_id = p.id
            WHERE p.slug = item.slug
              AND pv.key = item.variant_key
            FOR UPDATE OF p;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'BUSINESS_ERROR: Variant not found for % %',
                    item.slug, item.variant_key;
            END IF;

        ELSE
            SELECT id, quantity
              INTO v_product_id, v_current_stock
            FROM public.products
            WHERE slug = item.slug
            FOR UPDATE;

        END IF;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'BUSINESS_ERROR: Product not found for %', item.slug;
        END IF;

        IF v_current_stock IS NOT NULL THEN
            v_remaining := v_current_stock + item.quantity;
            UPDATE public.products
            SET quantity = v_remaining,
                stock_status = CASE
                    WHEN v_remaining = 0 THEN 'out-of-stock'
                    WHEN v_remaining <= v_low_stock THEN 'low-stock'
                    ELSE 'in-stock'
                END
            WHERE id = v_product_id;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('ok', true, 'status', 'cancelled');
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.checkout_place_order(
    text, jsonb, text, numeric, numeric, numeric, numeric, text, boolean, jsonb, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_place_order(
    text, jsonb, text, numeric, numeric, numeric, numeric, text, boolean, jsonb, text, text
) TO service_role;

REVOKE ALL ON FUNCTION public.cancel_order_restore_inventory(text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_order_restore_inventory(text, text)
  TO service_role;
