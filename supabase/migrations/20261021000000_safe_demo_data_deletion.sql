-- Live commerce orders are retained. Destructive deletion is limited to demo
-- data and is performed atomically, including inventory repair and queued
-- email cleanup.

CREATE OR REPLACE FUNCTION public.admin_delete_demo_order(
    p_order_id text
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
    IF NOT COALESCE(v_order.is_demo, false) THEN
        RAISE EXCEPTION 'BUSINESS_ERROR: Live orders must be retained';
    END IF;

    -- A demo order that was not cancelled still has inventory reserved by the
    -- checkout transaction. Restore it before deleting the audit rows.
    IF v_order.status <> 'cancelled' THEN
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
    END IF;

    DELETE FROM public.email_events
    WHERE data->>'orderId' = v_order.order_id;

    -- order_items and order_status_history cascade from this delete.
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
    v_testimonials integer := 0;
    v_pages integer := 0;
    v_products integer := 0;
    item record;
BEGIN
    -- Repair stock reserved by every non-cancelled demo order before removing
    -- the orders. Grouping locks products in slug order to avoid deadlocks.
    FOR item IN
        SELECT oi.slug, sum(oi.quantity)::integer AS quantity
        FROM public.orders o
        JOIN public.order_items oi ON oi.order_id = o.id
        WHERE o.is_demo IS TRUE
          AND o.status <> 'cancelled'
          AND oi.slug IS NOT NULL
          AND oi.quantity > 0
        GROUP BY oi.slug
        ORDER BY oi.slug
    LOOP
        UPDATE public.products
        SET quantity = CASE
                WHEN quantity IS NULL THEN NULL
                ELSE quantity + item.quantity
            END
        WHERE slug = item.slug;
    END LOOP;

    UPDATE public.products
    SET stock_status = CASE
            WHEN quantity <= 0 THEN 'out-of-stock'
            WHEN quantity <= 5 THEN 'low-stock'
            ELSE 'in-stock'
        END
    WHERE quantity IS NOT NULL
      AND slug IN (
          SELECT DISTINCT oi.slug
          FROM public.orders o
          JOIN public.order_items oi ON oi.order_id = o.id
          WHERE o.is_demo IS TRUE AND o.status <> 'cancelled'
      );

    DELETE FROM public.email_events e
    USING public.orders o
    WHERE o.is_demo IS TRUE AND e.data->>'orderId' = o.order_id;
    GET DIAGNOSTICS v_email_events = ROW_COUNT;

    DELETE FROM public.review_submissions WHERE is_demo IS TRUE;
    GET DIAGNOSTICS v_review_submissions = ROW_COUNT;
    DELETE FROM public.product_reviews WHERE is_demo IS TRUE;
    GET DIAGNOSTICS v_reviews = ROW_COUNT;
    DELETE FROM public.orders WHERE is_demo IS TRUE;
    GET DIAGNOSTICS v_orders = ROW_COUNT;
    DELETE FROM public.testimonials WHERE is_demo IS TRUE;
    GET DIAGNOSTICS v_testimonials = ROW_COUNT;
    DELETE FROM public.pages WHERE is_demo IS TRUE;
    GET DIAGNOSTICS v_pages = ROW_COUNT;
    DELETE FROM public.products WHERE is_demo IS TRUE;
    GET DIAGNOSTICS v_products = ROW_COUNT;

    RETURN jsonb_build_object(
        'ok', true,
        'deleted', jsonb_build_object(
            'review_submissions', v_review_submissions,
            'reviews', v_reviews,
            'orders', v_orders,
            'email_events', v_email_events,
            'testimonials', v_testimonials,
            'pages', v_pages,
            'products', v_products
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.admin_delete_demo_order(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_demo_order(text) TO service_role;

REVOKE ALL ON FUNCTION public.admin_purge_demo_data() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_purge_demo_data() TO service_role;

-- Keep the customer directory consistent when the same Pakistani mobile is
-- entered as 03…, 3…, +92…, or 0092…. Latest contact details win.
CREATE OR REPLACE VIEW public.admin_customer_rollups
WITH (security_invoker = true) AS
WITH base AS (
    SELECT
        o.order_id,
        o.created_at,
        NULLIF(lower(btrim(o.customer->>'email')), '') AS email,
        NULLIF(btrim(o.customer->>'name'), '') AS name,
        regexp_replace(COALESCE(o.customer->>'phone', ''), '[^0-9]', '', 'g') AS phone_digits
    FROM public.orders o
    WHERE COALESCE(o.is_demo, false) = false
), normalized AS (
    SELECT
        *,
        CASE
            WHEN length(phone_digits) = 10 AND phone_digits LIKE '3%' THEN '+92' || phone_digits
            WHEN length(phone_digits) = 11 AND phone_digits LIKE '03%' THEN '+92' || substr(phone_digits, 2)
            WHEN length(phone_digits) = 12 AND phone_digits LIKE '923%' THEN '+' || phone_digits
            WHEN length(phone_digits) = 13 AND phone_digits LIKE '00923%' THEN '+' || substr(phone_digits, 3)
            ELSE NULL
        END AS normalized_phone
    FROM base
)
SELECT
    COALESCE(email, normalized_phone, order_id) AS customer_key,
    max(created_at) AS last_order_at,
    count(*)::integer AS order_count,
    (array_agg(order_id ORDER BY created_at DESC))[1] AS last_order_id,
    (array_agg(COALESCE(name, '—') ORDER BY created_at DESC))[1] AS name,
    (array_agg(email ORDER BY created_at DESC)
        FILTER (WHERE email IS NOT NULL))[1] AS email,
    (array_agg(normalized_phone ORDER BY created_at DESC)
        FILTER (WHERE normalized_phone IS NOT NULL))[1] AS phone
FROM normalized
GROUP BY 1;

COMMENT ON VIEW public.admin_customer_rollups IS
  'Admin CRM: one row per normalized email, Pakistani mobile, or order-id fallback.';
