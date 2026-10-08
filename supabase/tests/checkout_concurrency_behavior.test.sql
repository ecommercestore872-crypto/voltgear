-- Exercise the checkout and cancellation locks from two independent database
-- sessions. This file intentionally uses committed, uniquely named fixtures so
-- both dblink sessions can observe them; all fixtures are removed at the end.
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS dblink WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(4);

INSERT INTO public.products (id, name, slug, category, price, quantity, stock_status)
VALUES ('00000000-0000-0000-0000-000000000301', 'Concurrent fixture', 'test-inventory-concurrent', 'test', 100, 2, 'low-stock');
INSERT INTO public.product_variants (id, product_id, key, name, quantity, stock_status)
VALUES ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000301', 'black|m', 'Black / M', NULL, 'in-stock');

SELECT dblink_connect('checkout_a', 'host=127.0.0.1 port=5432 dbname=postgres user=postgres password=postgres');
SELECT dblink_connect('checkout_b', 'host=127.0.0.1 port=5432 dbname=postgres user=postgres password=postgres');

SELECT dblink_send_query('checkout_a', $query$
  SELECT public.checkout_place_order(
    'TEST-CONCURRENT-A', '{}'::jsonb, 'cod', 100, 0, 100, 0, NULL, false,
    '[{"slug":"test-inventory-concurrent","quantity":1,"variantKey":"black|m"}]'::jsonb,
    'test-idem-concurrent', 'fingerprint-concurrent'
  )
$query$);
SELECT dblink_send_query('checkout_b', $query$
  SELECT public.checkout_place_order(
    'TEST-CONCURRENT-B', '{}'::jsonb, 'cod', 100, 0, 100, 0, NULL, false,
    '[{"slug":"test-inventory-concurrent","quantity":1,"variantKey":"black|m"}]'::jsonb,
    'test-idem-concurrent', 'fingerprint-concurrent'
  )
$query$);
SELECT * FROM dblink_get_result('checkout_a') AS result(payload jsonb);
SELECT * FROM dblink_get_result('checkout_b') AS result(payload jsonb);

SELECT is((SELECT count(*)::integer FROM orders WHERE idempotency_key = 'test-idem-concurrent'), 1, 'concurrent duplicate checkout creates one order');
SELECT is((SELECT quantity FROM products WHERE slug = 'test-inventory-concurrent'), 1, 'concurrent duplicate checkout decrements inventory once');

SELECT dblink_send_query(
  'checkout_a',
  format(
    'SELECT public.cancel_order_restore_inventory(%L, %L)',
    (SELECT order_id FROM orders WHERE idempotency_key = 'test-idem-concurrent'),
    'concurrent cancel A'
  )
);
SELECT dblink_send_query(
  'checkout_b',
  format(
    'SELECT public.cancel_order_restore_inventory(%L, %L)',
    (SELECT order_id FROM orders WHERE idempotency_key = 'test-idem-concurrent'),
    'concurrent cancel B'
  )
);
SELECT * FROM dblink_get_result('checkout_a') AS result(payload jsonb);
SELECT * FROM dblink_get_result('checkout_b') AS result(payload jsonb);

SELECT is((SELECT quantity FROM products WHERE slug = 'test-inventory-concurrent'), 2, 'concurrent cancellation restores inventory once');
SELECT is((SELECT count(*)::integer FROM order_status_history h JOIN orders o ON o.id = h.order_id WHERE o.idempotency_key = 'test-idem-concurrent' AND h.status = 'cancelled'), 1, 'concurrent cancellation records one transition');

SELECT dblink_disconnect('checkout_a');
SELECT dblink_disconnect('checkout_b');
DELETE FROM public.orders WHERE idempotency_key = 'test-idem-concurrent';
DELETE FROM public.products WHERE slug = 'test-inventory-concurrent';

SELECT * FROM finish();
