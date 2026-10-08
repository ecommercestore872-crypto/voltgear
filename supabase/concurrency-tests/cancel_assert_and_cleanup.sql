\set ON_ERROR_STOP on

DO $$
BEGIN
  IF (SELECT quantity FROM public.products WHERE slug = 'test-inventory-concurrent') <> 2 THEN
    RAISE EXCEPTION 'concurrent cancellation restored inventory more or less than once';
  END IF;
  IF (
    SELECT count(*)
    FROM public.order_status_history h
    JOIN public.orders o ON o.id = h.order_id
    WHERE o.idempotency_key = 'test-idem-concurrent' AND h.status = 'cancelled'
  ) <> 1 THEN
    RAISE EXCEPTION 'concurrent cancellation did not record exactly one transition';
  END IF;
END;
$$;

DELETE FROM public.orders WHERE idempotency_key = 'test-idem-concurrent';
DELETE FROM public.products WHERE slug = 'test-inventory-concurrent';
