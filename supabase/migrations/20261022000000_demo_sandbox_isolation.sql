-- Practice activity is deliberately separated from live commerce state.
-- Demo checkout records remain useful for UI training, but never reserve
-- inventory, consume promotions, emit marketing data, or pollute live CRM.

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS inventory_reserved boolean NOT NULL DEFAULT true;

-- Historical cancelled orders were already restored by the cancellation
-- command, so they must not be restored a second time during later cleanup.
UPDATE public.orders
SET inventory_reserved = false
WHERE status = 'cancelled' AND inventory_reserved IS TRUE;

COMMENT ON COLUMN public.orders.inventory_reserved IS
  'True only while this order owns inventory that cancellation/deletion must restore.';

CREATE OR REPLACE FUNCTION public.checkout_place_demo_order(
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
    v_order_pk uuid;
    v_existing_pk uuid;
    v_existing_order_id text;
    v_existing_fg text;
    v_qty integer;
    v_stock integer;
    v_normalized_promo text;
BEGIN
    IF NOT COALESCE(p_is_demo, false) THEN
        RAISE EXCEPTION 'BUSINESS_ERROR: Demo checkout requires a practice session';
    END IF;

    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        PERFORM pg_advisory_xact_lock(
            hashtextextended('demo-checkout:' || p_idempotency_key, 0)
        );
        SELECT id, order_id, idempotency_fingerprint
          INTO v_existing_pk, v_existing_order_id, v_existing_fg
        FROM public.orders
        WHERE idempotency_key = p_idempotency_key
        LIMIT 1;
        IF FOUND THEN
            IF v_existing_fg IS DISTINCT FROM p_idempotency_fingerprint THEN
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

    IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'BUSINESS_ERROR: Practice order has no items';
    END IF;

    -- Revalidate references and current availability without locking or
    -- mutating live stock. The application has already resolved authority for
    -- price and totals; this closes the missing/deleted-product race.
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_qty := (item.value->>'quantity')::integer;
        IF v_qty IS NULL OR v_qty <= 0 OR v_qty > 99 THEN
            RAISE EXCEPTION 'BUSINESS_ERROR: Invalid quantity for %', item.value->>'slug';
        END IF;

        SELECT quantity INTO v_stock
        FROM public.products
        WHERE slug = item.value->>'slug'
          AND status = 'published';
        IF NOT FOUND THEN
            RAISE EXCEPTION 'BUSINESS_ERROR: Product not found for %', item.value->>'slug';
        END IF;
        IF v_stock IS NOT NULL AND v_stock < v_qty THEN
            RAISE EXCEPTION 'BUSINESS_ERROR: Insufficient stock for %', item.value->>'slug';
        END IF;

        IF COALESCE(item.value->>'variantKey', '') <> '' AND NOT EXISTS (
            SELECT 1
            FROM public.products p
            JOIN public.product_variants pv ON pv.product_id = p.id
            WHERE p.slug = item.value->>'slug'
              AND pv.key = item.value->>'variantKey'
        ) THEN
            RAISE EXCEPTION 'BUSINESS_ERROR: Variant not found for % %',
                item.value->>'slug', item.value->>'variantKey';
        END IF;
    END LOOP;

    v_normalized_promo := upper(regexp_replace(
        trim(COALESCE(p_promo_code, '')), '\s+', '', 'g'
    ));

    INSERT INTO public.orders (
        order_id, customer, payment, subtotal, shipping, total, discount,
        promo_code, status, is_demo, inventory_reserved,
        idempotency_key, idempotency_fingerprint
    ) VALUES (
        p_order_id, p_customer, p_payment, p_subtotal, p_shipping, p_total,
        COALESCE(p_discount, 0), NULLIF(v_normalized_promo, ''), 'new', true,
        false, NULLIF(p_idempotency_key, ''), NULLIF(p_idempotency_fingerprint, '')
    ) RETURNING id INTO v_order_pk;

    INSERT INTO public.order_status_history (order_id, status, note, at)
    VALUES (v_order_pk, 'new', 'Practice order placed (no live inventory reserved)', now());

    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.order_items (
            order_id, slug, name, price, quantity, variant_key,
            variant_name, variant_sku, line_total
        ) VALUES (
            v_order_pk, item.value->>'slug', item.value->>'name',
            (item.value->>'price')::numeric, (item.value->>'quantity')::integer,
            NULLIF(item.value->>'variantKey', ''), NULLIF(item.value->>'variantName', ''),
            NULLIF(item.value->>'variantSku', ''), (item.value->>'lineTotal')::numeric
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
        IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
            SELECT id, order_id, idempotency_fingerprint
              INTO v_existing_pk, v_existing_order_id, v_existing_fg
            FROM public.orders
            WHERE idempotency_key = p_idempotency_key;
            IF FOUND THEN
                IF v_existing_fg IS DISTINCT FROM p_idempotency_fingerprint THEN
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
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp;

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
    SET status = 'cancelled',
        status_updated_at = now(),
        inventory_reserved = false
    WHERE id = v_order.id;

    INSERT INTO public.order_status_history (order_id, status, note, at)
    VALUES (
        v_order.id, 'cancelled',
        NULLIF(left(trim(COALESCE(p_note, '')), 500), ''), now()
    );

    IF v_order.inventory_reserved THEN
        FOR item IN
            SELECT slug, sum(quantity)::integer AS quantity
            FROM public.order_items
            WHERE order_id = v_order.id AND slug IS NOT NULL AND quantity > 0
            GROUP BY slug
            ORDER BY slug
        LOOP
            UPDATE public.products
            SET quantity = CASE WHEN quantity IS NULL THEN NULL ELSE quantity + item.quantity END
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
    END IF;

    RETURN jsonb_build_object('ok', true, 'status', 'cancelled', 'replayed', false);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.admin_delete_demo_order(p_order_id text)
RETURNS jsonb AS $$
DECLARE
    v_order public.orders%ROWTYPE;
    item record;
    v_remaining integer;
BEGIN
    SELECT * INTO v_order FROM public.orders
    WHERE order_id = trim(p_order_id) FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'BUSINESS_ERROR: Order not found'; END IF;
    IF NOT COALESCE(v_order.is_demo, false) THEN
        RAISE EXCEPTION 'BUSINESS_ERROR: Live orders must be retained';
    END IF;

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
    RETURN jsonb_build_object('ok', true, 'order_id', v_order.order_id);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.admin_purge_demo_data()
RETURNS jsonb AS $$
DECLARE
    v_review_submissions integer := 0;
    v_reviews integer := 0;
    v_orders integer := 0;
    v_email_events integer := 0;
    v_contacts integer := 0;
    v_testimonials integer := 0;
    v_pages integer := 0;
    v_products integer := 0;
    item record;
BEGIN
    FOR item IN
        SELECT oi.slug, sum(oi.quantity)::integer AS quantity
        FROM public.orders o
        JOIN public.order_items oi ON oi.order_id = o.id
        WHERE o.is_demo IS TRUE AND o.inventory_reserved IS TRUE
          AND oi.slug IS NOT NULL AND oi.quantity > 0
        GROUP BY oi.slug ORDER BY oi.slug
    LOOP
        UPDATE public.products
        SET quantity = CASE WHEN quantity IS NULL THEN NULL ELSE quantity + item.quantity END
        WHERE slug = item.slug;
    END LOOP;

    UPDATE public.products SET stock_status = CASE
        WHEN quantity <= 0 THEN 'out-of-stock'
        WHEN quantity <= 5 THEN 'low-stock'
        ELSE 'in-stock' END
    WHERE quantity IS NOT NULL AND slug IN (
        SELECT DISTINCT oi.slug FROM public.orders o
        JOIN public.order_items oi ON oi.order_id = o.id
        WHERE o.is_demo IS TRUE AND o.inventory_reserved IS TRUE
    );

    DELETE FROM public.email_events e USING public.orders o
    WHERE o.is_demo IS TRUE AND e.data->>'orderId' = o.order_id;
    GET DIAGNOSTICS v_email_events = ROW_COUNT;
    DELETE FROM public.review_submissions WHERE is_demo IS TRUE;
    GET DIAGNOSTICS v_review_submissions = ROW_COUNT;
    DELETE FROM public.product_reviews WHERE is_demo IS TRUE;
    GET DIAGNOSTICS v_reviews = ROW_COUNT;
    DELETE FROM public.contact_submissions WHERE is_demo IS TRUE;
    GET DIAGNOSTICS v_contacts = ROW_COUNT;
    DELETE FROM public.orders WHERE is_demo IS TRUE;
    GET DIAGNOSTICS v_orders = ROW_COUNT;
    DELETE FROM public.testimonials WHERE is_demo IS TRUE;
    GET DIAGNOSTICS v_testimonials = ROW_COUNT;
    DELETE FROM public.pages WHERE is_demo IS TRUE;
    GET DIAGNOSTICS v_pages = ROW_COUNT;
    DELETE FROM public.products WHERE is_demo IS TRUE;
    GET DIAGNOSTICS v_products = ROW_COUNT;

    RETURN jsonb_build_object('ok', true, 'deleted', jsonb_build_object(
        'review_submissions', v_review_submissions,
        'reviews', v_reviews,
        'orders', v_orders,
        'email_events', v_email_events,
        'contact_submissions', v_contacts,
        'testimonials', v_testimonials,
        'pages', v_pages,
        'products', v_products
    ));
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.checkout_place_demo_order(
    text, jsonb, text, numeric, numeric, numeric, numeric, text, boolean,
    jsonb, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_place_demo_order(
    text, jsonb, text, numeric, numeric, numeric, numeric, text, boolean,
    jsonb, text, text
) TO service_role;

REVOKE ALL ON FUNCTION public.cancel_order_restore_inventory(text, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_order_restore_inventory(text, text)
TO service_role;

REVOKE ALL ON FUNCTION public.admin_delete_demo_order(text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_demo_order(text) TO service_role;

REVOKE ALL ON FUNCTION public.admin_purge_demo_data()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_purge_demo_data() TO service_role;
