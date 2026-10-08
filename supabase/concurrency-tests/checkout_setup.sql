\set ON_ERROR_STOP on

DELETE FROM public.orders WHERE idempotency_key = 'test-idem-concurrent';
DELETE FROM public.products WHERE slug = 'test-inventory-concurrent';

INSERT INTO public.products (id, name, slug, category, price, quantity, stock_status)
VALUES ('00000000-0000-0000-0000-000000000301', 'Concurrent fixture', 'test-inventory-concurrent', 'test', 100, 2, 'low-stock');
INSERT INTO public.product_variants (id, product_id, key, name, quantity, stock_status)
VALUES ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000301', 'black|m', 'Black / M', NULL, 'in-stock');
