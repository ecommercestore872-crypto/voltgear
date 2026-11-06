\set ON_ERROR_STOP on
CREATE ROLE service_role NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL UNIQUE,
  payment text NOT NULL,
  is_demo boolean NOT NULL DEFAULT false,
  status text NOT NULL,
  total numeric NOT NULL,
  inventory_reserved boolean NOT NULL,
  postex_tracking_number text,
  postex_booking_claimed_at timestamptz,
  status_updated_at timestamptz
);
CREATE TABLE public.products (slug text PRIMARY KEY, quantity integer, stock_status text);
CREATE TABLE public.order_items (order_id uuid REFERENCES public.orders(id), slug text, quantity integer);
CREATE TABLE public.order_status_history (order_id uuid, status text, note text, at timestamptz);
INSERT INTO public.products VALUES ('widget', 5, 'low-stock');
INSERT INTO public.orders(order_id,payment,status,total,inventory_reserved)
VALUES ('QA-BOOK-1','cod','new',2399,true);
INSERT INTO public.order_items SELECT id,'widget',2 FROM public.orders WHERE order_id='QA-BOOK-1';

\i /tmp/postex-booking-state.sql

DO $$
DECLARE claim jsonb; cancel_claim jsonb; result jsonb; n integer; row_state record;
BEGIN
  IF has_function_privilege('anon','public.postex_claim_booking(text)','EXECUTE')
     OR has_function_privilege('authenticated','public.postex_complete_booking(text,uuid,text,timestamptz)','EXECUTE')
     OR NOT has_function_privilege('service_role','public.postex_claim_booking(text)','EXECUTE') THEN
    RAISE EXCEPTION 'RPC permission boundary failed';
  END IF;

  claim := public.postex_claim_booking('QA-BOOK-1');
  IF claim->>'ok' <> 'true' OR claim->>'attempt_id' IS NULL THEN RAISE EXCEPTION 'booking claim failed: %', claim; END IF;
  result := public.postex_claim_booking('QA-BOOK-1');
  IF result->>'ok' <> 'false' THEN RAISE EXCEPTION 'duplicate booking claim passed'; END IF;
  BEGIN
    PERFORM public.cancel_order_restore_inventory('QA-BOOK-1','cancel during create');
    RAISE EXCEPTION 'shop cancellation passed during booking';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'BUSINESS_ERROR: PostEx outcome%' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.admin_update_order_status('QA-BOOK-1','delivered','during create');
    RAISE EXCEPTION 'status advanced during booking';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'BUSINESS_ERROR: PostEx outcome%' THEN RAISE; END IF;
  END;
  SELECT quantity INTO n FROM public.products WHERE slug='widget';
  IF n <> 5 THEN RAISE EXCEPTION 'inventory changed during blocked cancellation'; END IF;

  result := public.postex_mark_booking_unknown('QA-BOOK-1',(claim->>'attempt_id')::uuid);
  IF result->>'ok' <> 'true' THEN RAISE EXCEPTION 'unknown booking not persisted'; END IF;
  result := public.postex_claim_booking('QA-BOOK-1');
  IF result->>'ok' <> 'false' THEN RAISE EXCEPTION 'unknown booking allowed retry'; END IF;
  result := public.postex_complete_booking('QA-BOOK-1',(claim->>'attempt_id')::uuid,'PX-123',now());
  IF result->>'ok' <> 'true' THEN RAISE EXCEPTION 'reconciled booking could not persist'; END IF;
  result := public.postex_complete_booking('QA-BOOK-1',(claim->>'attempt_id')::uuid,'PX-DUP',now());
  IF result->>'ok' <> 'false' THEN RAISE EXCEPTION 'duplicate completion passed'; END IF;

  BEGIN
    PERFORM public.cancel_order_restore_inventory('QA-BOOK-1','cancel before courier');
    RAISE EXCEPTION 'shop cancellation passed before courier cancellation';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'BUSINESS_ERROR: Cancel PostEx%' THEN RAISE; END IF;
  END;
  cancel_claim := public.postex_claim_shipment_cancellation('QA-BOOK-1','PX-123');
  IF cancel_claim->>'ok' <> 'true' THEN RAISE EXCEPTION 'courier cancel claim failed'; END IF;
  result := public.postex_claim_shipment_cancellation('QA-BOOK-1','PX-123');
  IF result->>'ok' <> 'false' THEN RAISE EXCEPTION 'duplicate courier cancel claim passed'; END IF;
  result := public.postex_mark_shipment_cancel_unknown('QA-BOOK-1',(cancel_claim->>'attempt_id')::uuid);
  IF result->>'ok' <> 'true' THEN RAISE EXCEPTION 'unknown cancellation not persisted'; END IF;
  BEGIN
    PERFORM public.cancel_order_restore_inventory('QA-BOOK-1','cancel with unknown courier outcome');
    RAISE EXCEPTION 'shop cancellation passed with unknown courier outcome';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'BUSINESS_ERROR: PostEx outcome%' THEN RAISE; END IF;
  END;
  result := public.postex_mark_shipment_cancelled('QA-BOOK-1','PX-123',(cancel_claim->>'attempt_id')::uuid);
  IF result->>'ok' <> 'true' OR result->>'replayed' <> 'false' THEN RAISE EXCEPTION 'courier cancel confirmation failed'; END IF;
  result := public.postex_mark_shipment_cancelled('QA-BOOK-1','PX-123',(cancel_claim->>'attempt_id')::uuid);
  IF result->>'ok' <> 'true' OR result->>'replayed' <> 'true' THEN RAISE EXCEPTION 'courier cancel replay failed'; END IF;
  BEGIN
    PERFORM public.admin_update_order_status('QA-BOOK-1','shipped','after courier cancellation');
    RAISE EXCEPTION 'cancelled courier shipment advanced to shipped';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'BUSINESS_ERROR: Cancelled PostEx%' THEN RAISE; END IF;
  END;
  result := public.cancel_order_restore_inventory('QA-BOOK-1','after courier');
  IF result->>'ok' <> 'true' OR result->>'replayed' <> 'false' THEN RAISE EXCEPTION 'shop cancellation failed'; END IF;
  result := public.cancel_order_restore_inventory('QA-BOOK-1','repeat');
  IF result->>'replayed' <> 'true' THEN RAISE EXCEPTION 'shop cancellation replay failed'; END IF;
  SELECT status,inventory_reserved,postex_tracking_number,postex_shipment_cancelled_at
    INTO row_state FROM public.orders WHERE order_id='QA-BOOK-1';
  SELECT quantity INTO n FROM public.products WHERE slug='widget';
  IF row_state.status <> 'cancelled' OR row_state.inventory_reserved
     OR row_state.postex_tracking_number <> 'PX-123'
     OR row_state.postex_shipment_cancelled_at IS NULL OR n <> 7 THEN
    RAISE EXCEPTION 'final status/inventory/courier history mismatch';
  END IF;
END $$;
SELECT 'PASS: claim, uncertain outcomes, courier cancellation, inventory once, permissions' AS result;
