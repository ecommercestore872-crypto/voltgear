\set ON_ERROR_STOP on

DO $$
BEGIN
  IF (SELECT count(*) FROM public.orders WHERE idempotency_key = 'test-idem-concurrent') <> 1 THEN
    RAISE EXCEPTION 'concurrent duplicate checkout did not create exactly one order';
  END IF;
  IF (SELECT quantity FROM public.products WHERE slug = 'test-inventory-concurrent') <> 1 THEN
    RAISE EXCEPTION 'concurrent duplicate checkout did not decrement inventory exactly once';
  END IF;
END;
$$;

-- Two cancellation clients run after the placement assertions. Both target the
-- public order id selected by the idempotency winner.
