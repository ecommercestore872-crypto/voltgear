-- Order-side admin home metrics in one DB round trip (Asia/Karachi business day).

CREATE OR REPLACE FUNCTION public.admin_order_dashboard_metrics(p_now timestamptz DEFAULT now())
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  WITH bounds AS (
    SELECT
      (date_trunc('day', p_now AT TIME ZONE 'Asia/Karachi') AT TIME ZONE 'Asia/Karachi') AS day_start,
      p_now - interval '30 days' AS month_start,
      (date_trunc('day', p_now AT TIME ZONE 'Asia/Karachi') AT TIME ZONE 'Asia/Karachi')
        - interval '3 days' AS stale_before
  ),
  live AS (
    SELECT o.*
    FROM public.orders o
    WHERE coalesce(o.is_demo, false) = false
  ),
  today_created AS (
    SELECT l.*
    FROM live l, bounds b
    WHERE l.created_at >= b.day_start
  ),
  month_created AS (
    SELECT l.*
    FROM live l, bounds b
    WHERE l.created_at >= b.month_start
  ),
  pending AS (
    SELECT l.*
    FROM live l
    WHERE l.status IN ('new', 'processing')
  ),
  shipped AS (
    SELECT l.*
    FROM live l
    WHERE l.status = 'shipped'
  ),
  shipped_stale AS (
    SELECT s.*
    FROM shipped s, bounds b
    WHERE coalesce(s.status_updated_at, s.created_at) < b.stale_before
  ),
  status_today AS (
    SELECT l.*
    FROM live l, bounds b
    WHERE l.status_updated_at >= b.day_start
      AND l.status IN ('delivered', 'cancelled')
  )
  SELECT jsonb_build_object(
    'practiceOrderCount', (SELECT count(*)::int FROM public.orders WHERE is_demo IS TRUE),
    'todayOrderCount', (SELECT count(*)::int FROM today_created),
    'todayRevenue', (
      SELECT coalesce(sum(total), 0)
      FROM today_created
      WHERE status IS DISTINCT FROM 'cancelled'
    ),
    'monthOrderCount', (SELECT count(*)::int FROM month_created),
    'monthRevenue', (
      SELECT coalesce(sum(total), 0)
      FROM month_created
      WHERE status IS DISTINCT FROM 'cancelled'
    ),
    'monthDeliveredRevenue', (
      SELECT coalesce(sum(total), 0)
      FROM month_created
      WHERE status = 'delivered'
    ),
    'monthCancelledRevenue', (
      SELECT coalesce(sum(total), 0)
      FROM month_created
      WHERE status = 'cancelled'
    ),
    'pendingCount', (SELECT count(*)::int FROM pending),
    'shippedWaitingCount', (SELECT count(*)::int FROM shipped),
    'deliveredTodayCount', (
      SELECT count(*)::int FROM status_today WHERE status = 'delivered'
    ),
    'cancelledTodayCount', (
      SELECT count(*)::int FROM status_today WHERE status = 'cancelled'
    ),
    'pendingOrders', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'orderId', p.order_id,
        'customerName', coalesce(nullif(btrim(p.customer->>'name'), ''), ''),
        'phone', coalesce(nullif(btrim(p.customer->>'phone'), ''), ''),
        'status', coalesce(p.status, 'new'),
        'total', coalesce(p.total, 0)
      ) ORDER BY p.created_at DESC)
      FROM (SELECT * FROM pending ORDER BY created_at DESC LIMIT 8) p
    ), '[]'::jsonb),
    'shippedStaleOrders', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'orderId', s.order_id,
        'customerName', coalesce(nullif(btrim(s.customer->>'name'), ''), ''),
        'phone', coalesce(nullif(btrim(s.customer->>'phone'), ''), ''),
        'daysShipped', greatest(
          0,
          (
            (timezone('Asia/Karachi', p_now))::date
            - (timezone('Asia/Karachi', coalesce(s.status_updated_at, s.created_at)))::date
          )
        )
      ) ORDER BY coalesce(s.status_updated_at, s.created_at) ASC)
      FROM (SELECT * FROM shipped_stale ORDER BY coalesce(status_updated_at, created_at) ASC LIMIT 8) s
    ), '[]'::jsonb)
  );
$$;

COMMENT ON FUNCTION public.admin_order_dashboard_metrics IS
  'Admin home: order KPIs and top queues (single query). Product/review tiles stay in app code.';
