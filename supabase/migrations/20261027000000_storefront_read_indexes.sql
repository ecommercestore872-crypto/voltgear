-- Keep high-traffic storefront reads on ordered indexes as the catalog grows.
-- These are read-path indexes only; they do not alter product data or RLS.

CREATE INDEX IF NOT EXISTS products_storefront_featured_created_idx
  ON public.products (status, is_demo, featured DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS products_storefront_category_featured_created_idx
  ON public.products (status, is_demo, category, featured DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS products_storefront_category_price_idx
  ON public.products (status, is_demo, category, price);

CREATE INDEX IF NOT EXISTS categories_active_sort_idx
  ON public.categories (active, sort_order);
