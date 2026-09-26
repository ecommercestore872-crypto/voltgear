-- Admin customers directory: aggregate in SQL instead of loading all orders in Node.

CREATE OR REPLACE VIEW public.admin_customer_rollups AS
SELECT
  COALESCE(
    NULLIF(lower(btrim(o.customer->>'email')), ''),
    NULLIF(btrim(o.customer->>'phone'), ''),
    o.order_id
  ) AS customer_key,
  max(o.created_at) AS last_order_at,
  count(*)::integer AS order_count,
  (array_agg(o.order_id ORDER BY o.created_at DESC))[1] AS last_order_id,
  (
    array_agg(
      COALESCE(NULLIF(btrim(o.customer->>'name'), ''), '—')
      ORDER BY o.created_at DESC
    )
  )[1] AS name,
  max(NULLIF(btrim(o.customer->>'email'), '')) AS email,
  max(NULLIF(btrim(o.customer->>'phone'), '')) AS phone
FROM public.orders o
WHERE coalesce(o.is_demo, false) = false
GROUP BY 1;

COMMENT ON VIEW public.admin_customer_rollups IS
  'Admin CRM: one row per customer key (email, phone, or order id fallback).';
