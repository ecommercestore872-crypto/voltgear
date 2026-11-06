\set ON_ERROR_STOP on

CREATE ROLE service_role NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL,
  total numeric NOT NULL,
  inventory_reserved integer NOT NULL,
  postex_tracking_number text
);

INSERT INTO public.orders (order_id, status, total, inventory_reserved, postex_tracking_number)
VALUES ('QA-ARCHIVE-1', 'processing', 2399, 2, 'QA-POSTEX-ONLY');

\i /tmp/bnt-admin-order-archiving.sql

DO $$
DECLARE
  result jsonb;
  row_state record;
BEGIN
  IF has_function_privilege('anon', 'public.admin_set_order_archived(text,boolean)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.admin_set_order_archived(text,boolean)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.admin_set_order_archived(text,boolean)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Archive RPC permission boundary failed';
  END IF;

  result := public.admin_set_order_archived('QA-ARCHIVE-1', true);
  IF result <> '{"ok":true,"archived":true,"replayed":false}'::jsonb THEN
    RAISE EXCEPTION 'First archive failed: %', result;
  END IF;
  result := public.admin_set_order_archived('QA-ARCHIVE-1', true);
  IF result <> '{"ok":true,"archived":true,"replayed":true}'::jsonb THEN
    RAISE EXCEPTION 'Archive replay failed: %', result;
  END IF;
  SELECT archived_at, status, total, inventory_reserved, postex_tracking_number
    INTO row_state FROM public.orders WHERE order_id = 'QA-ARCHIVE-1';
  IF row_state.archived_at IS NULL OR row_state.status <> 'processing'
     OR row_state.total <> 2399 OR row_state.inventory_reserved <> 2
     OR row_state.postex_tracking_number <> 'QA-POSTEX-ONLY' THEN
    RAISE EXCEPTION 'Archive modified fulfillment, inventory, courier or financial fields';
  END IF;

  result := public.admin_set_order_archived('QA-ARCHIVE-1', false);
  IF result <> '{"ok":true,"archived":false,"replayed":false}'::jsonb THEN
    RAISE EXCEPTION 'Unarchive failed: %', result;
  END IF;
  result := public.admin_set_order_archived('QA-ARCHIVE-1', false);
  IF result <> '{"ok":true,"archived":false,"replayed":true}'::jsonb THEN
    RAISE EXCEPTION 'Unarchive replay failed: %', result;
  END IF;

  UPDATE public.orders SET status = 'cancelled', inventory_reserved = 0
    WHERE order_id = 'QA-ARCHIVE-1';
  result := public.admin_set_order_archived('QA-ARCHIVE-1', true);
  SELECT archived_at, status, inventory_reserved, postex_tracking_number
    INTO row_state FROM public.orders WHERE order_id = 'QA-ARCHIVE-1';
  IF row_state.archived_at IS NULL OR row_state.status <> 'cancelled'
     OR row_state.inventory_reserved <> 0
     OR row_state.postex_tracking_number <> 'QA-POSTEX-ONLY' THEN
    RAISE EXCEPTION 'Archive conflicted with cancelled state or courier reference';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'orders_admin_active_created_idx')
     OR NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'orders_admin_archived_created_idx') THEN
    RAISE EXCEPTION 'Archive indexes missing';
  END IF;
END $$;

SELECT 'PASS: archive, replay, unarchive, field preservation, cancelled-state compatibility, permissions, indexes' AS result;
