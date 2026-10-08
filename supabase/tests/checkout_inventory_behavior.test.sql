-- Behavioral regression coverage. This runs against the migrated Supabase
-- database in CI; it exercises the RPCs with real product/order rows.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(15);

INSERT INTO public.products (id, name, slug, category, price, quantity, stock_status)
VALUES
  ('00000000-0000-0000-0000-000000000101', 'Variant fixture', 'test-inventory-variant', 'test', 100, 3, 'low-stock'),
  ('00000000-0000-0000-0000-000000000102', 'Simple fixture', 'test-inventory-simple', 'test', 100, 2, 'low-stock'),
  ('00000000-0000-0000-0000-000000000103', 'Unlimited fixture', 'test-inventory-null', 'test', 100, NULL, 'in-stock');
INSERT INTO public.product_variants (id, product_id, key, name, quantity, stock_status)
VALUES ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'blue|m', 'Blue / M', NULL, 'in-stock');

SELECT checkout_place_order(
  'TEST-VARIANT-001',
  '{"name":"Test","email":"test@example.com"}'::jsonb, 'cod', 100, 0, 100, 0, NULL,
  false,
  '[{"slug":"test-inventory-variant","name":"Variant fixture","price":100,"quantity":1,"variantKey":"blue|m","lineTotal":100}]'::jsonb,
  'test-idem-variant', 'fingerprint-variant'
);
SELECT is((SELECT quantity FROM products WHERE slug = 'test-inventory-variant'), 2, 'variant checkout decrements parent product quantity');
SELECT is((SELECT quantity FROM product_variants WHERE key = 'blue|m'), NULL, 'variant label quantity remains NULL');
SELECT is((SELECT stock_status FROM products WHERE slug = 'test-inventory-variant'), 'low-stock', 'variant checkout preserves low-stock transition');

SELECT cancel_order_restore_inventory('TEST-VARIANT-001', 'test cancellation');
SELECT is((SELECT quantity FROM products WHERE slug = 'test-inventory-variant'), 3, 'variant cancellation restores parent quantity');
SELECT is((SELECT quantity FROM product_variants WHERE key = 'blue|m'), NULL, 'variant cancellation does not restore label quantity');

SELECT checkout_place_order(
  'TEST-SIMPLE-001', '{"name":"Test","email":"test@example.com"}'::jsonb, 'cod', 100, 0, 100, 0, NULL,
  false,
  '[{"slug":"test-inventory-simple","name":"Simple fixture","price":100,"quantity":2,"lineTotal":200}]'::jsonb,
  'test-idem-simple', 'fingerprint-simple'
);
SELECT is((SELECT quantity FROM products WHERE slug = 'test-inventory-simple'), 0, 'non-variant checkout decrements parent quantity');
SELECT is((SELECT stock_status FROM products WHERE slug = 'test-inventory-simple'), 'out-of-stock', 'purchase sets out-of-stock at zero');
SELECT cancel_order_restore_inventory('TEST-SIMPLE-001', 'test cancellation');
SELECT is((SELECT quantity FROM products WHERE slug = 'test-inventory-simple'), 2, 'non-variant cancellation restores parent quantity');
SELECT is((SELECT stock_status FROM products WHERE slug = 'test-inventory-simple'), 'low-stock', 'cancellation recalculates low-stock');

SELECT throws_ok(
  $$SELECT checkout_place_order('TEST-INSUFFICIENT-001', '{}'::jsonb, 'cod', 100, 0, 100, 0, NULL, false, '[{"slug":"test-inventory-simple","quantity":3}]'::jsonb, 'test-idem-insufficient', 'fingerprint-insufficient')$$,
  'BUSINESS_ERROR: Insufficient stock for test-inventory-simple',
  'insufficient parent stock is rejected atomically'
);
SELECT is((SELECT quantity FROM products WHERE slug = 'test-inventory-simple'), 2, 'insufficient stock leaves quantity unchanged');

SELECT checkout_place_order(
  'TEST-NULL-001', '{}'::jsonb, 'cod', 100, 0, 100, 0, NULL, false,
  '[{"slug":"test-inventory-null","quantity":1}]'::jsonb, 'test-idem-null', 'fingerprint-null'
);
SELECT is((SELECT quantity FROM products WHERE slug = 'test-inventory-null'), NULL, 'NULL quantity remains unconfigured and untouched');

SELECT checkout_place_order(
  'TEST-IDEM-001', '{}'::jsonb, 'cod', 100, 0, 100, 0, NULL, false,
  '[{"slug":"test-inventory-variant","quantity":1,"variantKey":"blue|m"}]'::jsonb, 'test-idem-retry', 'fingerprint-retry'
);
SELECT checkout_place_order(
  'TEST-IDEM-002', '{}'::jsonb, 'cod', 100, 0, 100, 0, NULL, false,
  '[{"slug":"test-inventory-variant","quantity":1,"variantKey":"blue|m"}]'::jsonb, 'test-idem-retry', 'fingerprint-retry'
);
SELECT is((SELECT count(*)::integer FROM orders WHERE idempotency_key = 'test-idem-retry'), 1, 'exact retry creates one order');
SELECT is((SELECT quantity FROM products WHERE slug = 'test-inventory-variant'), 2, 'exact retry decrements inventory once');

SELECT * FROM finish();
ROLLBACK;
