-- Minimal additive columns used by actual catalog/checkout/moderation RPCs.
-- Core tables are loaded from the unchanged 20260826140000_init_store.sql.
ALTER TABLE products
  ADD COLUMN status text NOT NULL DEFAULT 'published',
  ADD COLUMN draft jsonb,
  ADD COLUMN quantity integer CHECK (quantity >= 0),
  ADD COLUMN cost_price numeric,
  ADD COLUMN is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN free_shipping boolean DEFAULT false,
  ADD COLUMN color_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN size_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN color_options jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN size_options jsonb NOT NULL DEFAULT '[]';
ALTER TABLE product_variants ADD COLUMN quantity integer CHECK (quantity >= 0);
ALTER TABLE product_reviews ADD COLUMN reply text;
ALTER TABLE review_submissions ADD COLUMN reply text, ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE orders
  ADD COLUMN is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN discount numeric NOT NULL DEFAULT 0,
  ADD COLUMN promo_code text,
  ADD COLUMN idempotency_key text,
  ADD COLUMN idempotency_fingerprint text;
CREATE UNIQUE INDEX idx_orders_idempotency_key ON orders(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE TABLE promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text UNIQUE,
  active boolean NOT NULL DEFAULT true, starts_at timestamptz, ends_at timestamptz,
  first_order_only boolean NOT NULL DEFAULT false, usage_count integer NOT NULL DEFAULT 0,
  max_usage integer, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE contact_submissions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), is_demo boolean NOT NULL DEFAULT false);
