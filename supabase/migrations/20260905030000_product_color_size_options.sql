-- Color / Size option lists on the product. Checkout decrements product units only.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS color_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS size_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS color_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS size_options jsonb NOT NULL DEFAULT '[]'::jsonb;

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
    p_items jsonb
) RETURNS jsonb AS $$
DECLARE
    item record;
    v_product_id uuid;
    v_variant_id uuid;
    v_qty integer;
    v_current_stock integer;
    v_order_pk uuid;
    v_low_stock integer;
    v_remaining integer;
BEGIN
    v_low_stock := 5;

    FOR item IN SELECT * FROM jsonb_array_elements(p_items) ORDER BY value->>'slug', value->>'variantKey' LOOP
        v_qty := (item.value->>'quantity')::integer;
        IF v_qty IS NULL OR v_qty <= 0 THEN
            RAISE EXCEPTION 'BUSINESS_ERROR: Invalid quantity % for %', v_qty, item.value->>'slug';
        END IF;

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

    INSERT INTO orders (order_id, customer, payment, subtotal, shipping, total, discount, promo_code, status, is_demo)
    VALUES (
      p_order_id,
      p_customer,
      p_payment,
      p_subtotal,
      p_shipping,
      p_total,
      NULLIF(p_discount, 0),
      NULLIF(p_promo_code, ''),
      'new',
      p_is_demo
    )
    RETURNING id INTO v_order_pk;

    INSERT INTO order_status_history (order_id, status, note, at)
    VALUES (v_order_pk, 'new', 'Order placed', NOW());

    FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        INSERT INTO order_items (order_id, slug, name, price, quantity, variant_key, variant_name, variant_sku, line_total)
        VALUES (
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

    RETURN jsonb_build_object('ok', true, 'order_id', p_order_id, 'internal_id', v_order_pk);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

REVOKE ALL ON FUNCTION checkout_place_order FROM PUBLIC;
REVOKE ALL ON FUNCTION checkout_place_order FROM anon;
REVOKE ALL ON FUNCTION checkout_place_order FROM authenticated;
GRANT EXECUTE ON FUNCTION checkout_place_order TO service_role;
