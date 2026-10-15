-- Redeem promo codes in the same transaction that creates the order.
-- This prevents concurrent checkouts from exceeding max_usage and ensures an
-- idempotent replay never consumes a code twice.

CREATE OR REPLACE FUNCTION checkout_place_order(
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
    v_variant_id uuid;
    v_qty integer;
    v_current_stock integer;
    v_order_pk uuid;
    v_low_stock integer := 5;
    v_remaining integer;
    v_existing_pk uuid;
    v_existing_order_id text;
    v_existing_fg text;
    v_promo_id uuid;
    v_promo_active boolean;
    v_promo_starts_at timestamptz;
    v_promo_ends_at timestamptz;
    v_promo_first_order_only boolean;
    v_promo_usage_count integer;
    v_promo_max_usage integer;
    v_normalized_promo text;
    v_customer_email text;
BEGIN
    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        -- Serialize equal keys before their first lookup so a concurrent retry
        -- observes the committed order instead of failing promo/stock checks.
        PERFORM pg_advisory_xact_lock(
            hashtextextended('checkout:' || p_idempotency_key, 0)
        );
    END IF;

    -- A replay returns before promo locking/incrementing and stock mutation.
    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        SELECT id, order_id, idempotency_fingerprint
          INTO v_existing_pk, v_existing_order_id, v_existing_fg
        FROM orders
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

    v_normalized_promo := upper(regexp_replace(trim(COALESCE(p_promo_code, '')), '\s+', '', 'g'));
    v_customer_email := lower(trim(COALESCE(p_customer->>'email', '')));

    -- Lock the promo row for the entire order transaction. Concurrent uses of
    -- a capped code are serialized before checking usage_count.
    IF v_normalized_promo <> '' THEN
        SELECT id, active, starts_at, ends_at, first_order_only, usage_count, max_usage
          INTO v_promo_id, v_promo_active, v_promo_starts_at, v_promo_ends_at,
               v_promo_first_order_only, v_promo_usage_count, v_promo_max_usage
        FROM promo_codes
        WHERE code = v_normalized_promo
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'BUSINESS_ERROR: That promo code is not valid.';
        END IF;
        IF NOT v_promo_active THEN
            RAISE EXCEPTION 'BUSINESS_ERROR: This code is not active.';
        END IF;
        IF v_promo_starts_at IS NOT NULL AND now() < v_promo_starts_at THEN
            RAISE EXCEPTION 'BUSINESS_ERROR: This code is not valid yet.';
        END IF;
        IF v_promo_ends_at IS NOT NULL AND now() > v_promo_ends_at THEN
            RAISE EXCEPTION 'BUSINESS_ERROR: This code has expired.';
        END IF;
        IF v_promo_max_usage IS NOT NULL
           AND v_promo_max_usage > 0
           AND v_promo_usage_count >= v_promo_max_usage THEN
            RAISE EXCEPTION 'BUSINESS_ERROR: This code has reached its usage limit.';
        END IF;

        IF v_promo_first_order_only THEN
            IF v_customer_email = '' THEN
                RAISE EXCEPTION 'BUSINESS_ERROR: Email is required for this promo code.';
            END IF;
            -- Serialize first-order decisions for the same email even when no
            -- prior row exists yet (a row lock alone cannot protect that gap).
            PERFORM pg_advisory_xact_lock(hashtextextended(v_customer_email, 0));
            IF EXISTS (
                SELECT 1
                FROM orders
                WHERE lower(trim(customer->>'email')) = v_customer_email
                  AND COALESCE(is_demo, false) = false
                  AND status <> 'cancelled'
            ) THEN
                RAISE EXCEPTION 'BUSINESS_ERROR: This code is for first orders only.';
            END IF;
        END IF;
    END IF;

    BEGIN
        FOR item IN SELECT * FROM jsonb_array_elements(p_items) ORDER BY value->>'slug', value->>'variantKey' LOOP
            v_qty := (item.value->>'quantity')::integer;
            IF v_qty IS NULL OR v_qty <= 0 THEN
                RAISE EXCEPTION 'BUSINESS_ERROR: Invalid quantity % for %', v_qty, item.value->>'slug';
            END IF;

            v_variant_id := NULL;
            IF item.value->>'variantKey' IS NOT NULL AND item.value->>'variantKey' <> '' THEN
                SELECT pv.id INTO v_variant_id
                FROM products p
                JOIN product_variants pv ON p.id = pv.product_id
                WHERE p.slug = item.value->>'slug' AND pv.key = item.value->>'variantKey'
                FOR UPDATE;
                IF NOT FOUND THEN
                    RAISE EXCEPTION 'BUSINESS_ERROR: Variant not found for % %', item.value->>'slug', item.value->>'variantKey';
                END IF;
            END IF;

            SELECT id, quantity INTO v_product_id, v_current_stock
            FROM products
            WHERE slug = item.value->>'slug'
            FOR UPDATE;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'BUSINESS_ERROR: Product not found for %', item.value->>'slug';
            END IF;

            IF v_current_stock IS NOT NULL THEN
                IF v_current_stock < v_qty THEN
                    RAISE EXCEPTION 'BUSINESS_ERROR: Insufficient stock for %', item.value->>'slug';
                END IF;
                v_remaining := v_current_stock - v_qty;
                UPDATE products
                SET quantity = v_remaining,
                    stock_status = CASE
                        WHEN v_remaining = 0 THEN 'out-of-stock'
                        WHEN v_remaining <= v_low_stock THEN 'low-stock'
                        ELSE 'in-stock'
                    END
                WHERE id = v_product_id;
            END IF;
        END LOOP;

        INSERT INTO orders (
            order_id, customer, payment, subtotal, shipping, total, discount,
            promo_code, status, is_demo, idempotency_key, idempotency_fingerprint
        ) VALUES (
            p_order_id, p_customer, p_payment, p_subtotal, p_shipping, p_total,
            COALESCE(p_discount, 0), NULLIF(v_normalized_promo, ''), 'new',
            p_is_demo, NULLIF(p_idempotency_key, ''), NULLIF(p_idempotency_fingerprint, '')
        ) RETURNING id INTO v_order_pk;

        INSERT INTO order_status_history (order_id, status, note, at)
        VALUES (v_order_pk, 'new', 'Order placed', now());

        FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
            INSERT INTO order_items (
                order_id, slug, name, price, quantity, variant_key,
                variant_name, variant_sku, line_total
            ) VALUES (
                v_order_pk, item.value->>'slug', item.value->>'name',
                (item.value->>'price')::numeric, (item.value->>'quantity')::integer,
                NULLIF(item.value->>'variantKey', ''), NULLIF(item.value->>'variantName', ''),
                NULLIF(item.value->>'variantSku', ''), (item.value->>'lineTotal')::numeric
            );
        END LOOP;

        IF v_promo_id IS NOT NULL AND NOT p_is_demo THEN
            UPDATE promo_codes
            SET usage_count = usage_count + 1, updated_at = now()
            WHERE id = v_promo_id;
        END IF;

        RETURN jsonb_build_object(
            'ok', true,
            'order_id', p_order_id,
            'internal_id', v_order_pk,
            'replayed', false
        );
    EXCEPTION
        WHEN unique_violation THEN
            IF SQLERRM LIKE '%idx_orders_idempotency_key%' THEN
                SELECT id, order_id, idempotency_fingerprint
                  INTO v_existing_pk, v_existing_order_id, v_existing_fg
                FROM orders
                WHERE idempotency_key = p_idempotency_key;
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
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION checkout_place_order(text, jsonb, text, numeric, numeric, numeric, numeric, text, boolean, jsonb, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION checkout_place_order(text, jsonb, text, numeric, numeric, numeric, numeric, text, boolean, jsonb, text, text) FROM anon;
REVOKE ALL ON FUNCTION checkout_place_order(text, jsonb, text, numeric, numeric, numeric, numeric, text, boolean, jsonb, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION checkout_place_order(text, jsonb, text, numeric, numeric, numeric, numeric, text, boolean, jsonb, text, text) TO service_role;
