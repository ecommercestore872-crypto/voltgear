-- Admin list/search: faster order id + customer contact lookups.

CREATE INDEX IF NOT EXISTS orders_order_id_lower_idx
  ON public.orders (lower(order_id));

CREATE INDEX IF NOT EXISTS orders_status_created_at_idx
  ON public.orders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS orders_customer_phone_idx
  ON public.orders ((customer->>'phone'));
