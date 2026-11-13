-- Run against an isolated local database with psql -v ON_ERROR_STOP=1.
-- Every fixture and assertion is rolled back, including temporary evidence.
BEGIN;
SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_id uuid;
  v_actor uuid := gen_random_uuid();
  v_result jsonb;
  v_qty integer;
  v_before jsonb;
  v_after jsonb;
  v_case text;
  v_status text;
  v_demo boolean;
BEGIN
  IF has_function_privilege('service_role', 'public.purge_expired_order_deletion_records(integer)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.purge_expired_order_deletion_records(integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Retention disposal is available outside the DBA role';
  END IF;
  IF has_function_privilege('anon', 'public.admin_delete_order(text,uuid,text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.admin_delete_order(text,uuid,text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.admin_delete_order(text,uuid)', 'EXECUTE')
     OR has_function_privilege('service_role', 'public.admin_delete_demo_order(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Deletion RPC is exposed to shoppers';
  END IF;
  BEGIN
    PERFORM public.admin_delete_order('delete-test-practice', NULL, NULL);
    RAISE EXCEPTION 'Unnamed actor was accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Unnamed actor was accepted' THEN RAISE; END IF;
  END;

  INSERT INTO public.products(name, slug, category, quantity, stock_status)
  VALUES ('Deletion test product', 'delete-test-product', 'test', 100, 'in-stock');

  FOREACH v_case IN ARRAY ARRAY[
    'practice','practice-reserved','ordinary','cancelled','archived','shipped','delivered',
    'reporting','payment','courier-cancelled','courier-cancelled-shipped',
    'courier-conflict','missing-evidence','bad-inventory'
  ] LOOP
    v_status := CASE v_case WHEN 'cancelled' THEN 'cancelled'
                 WHEN 'shipped' THEN 'shipped' WHEN 'delivered' THEN 'delivered'
                 WHEN 'missing-evidence' THEN 'delivered'
                 WHEN 'courier-cancelled' THEN 'cancelled'
                 WHEN 'courier-cancelled-shipped' THEN 'cancelled' ELSE 'new' END;
    v_demo := v_case IN ('practice','practice-reserved');
    INSERT INTO public.orders(order_id, customer, payment, subtotal, total, status,
      is_demo, inventory_reserved, archived_at, idempotency_key,
      postex_booking_state, postex_cancel_state, postex_tracking_number)
    VALUES ('delete-test-' || v_case, '{"name":"Test Customer","phone":"03000000000"}'::jsonb,
      CASE WHEN v_case = 'payment' THEN 'card' ELSE 'cod' END,
      50, 50, v_status, v_demo, v_case NOT IN ('cancelled','practice'),
      CASE WHEN v_case = 'archived' THEN now() ELSE NULL END,
      'delete-idem-' || v_case,
      CASE WHEN v_case IN ('shipped','delivered','courier-cancelled','courier-cancelled-shipped','courier-conflict') THEN 'confirmed'
           ELSE 'not_requested' END,
      CASE WHEN v_case IN ('courier-cancelled','courier-cancelled-shipped','courier-conflict') THEN 'confirmed' ELSE 'not_requested' END,
      CASE WHEN v_case IN ('shipped','delivered','courier-cancelled','courier-cancelled-shipped','courier-conflict') THEN 'PX-' || v_case
           ELSE NULL END)
    RETURNING id INTO v_id;
    IF v_case <> 'missing-evidence' THEN
      INSERT INTO public.order_items(order_id, slug, name, price, quantity, line_total)
      VALUES (v_id, CASE WHEN v_case = 'bad-inventory' THEN 'missing-product'
                         ELSE 'delete-test-product' END, 'Test item', 50, 1, 50);
    END IF;
    IF v_case = 'bad-inventory' THEN
      INSERT INTO public.order_items(order_id, slug, name, price, quantity, line_total)
      VALUES (v_id, 'delete-test-product', 'Valid item first', 50, 1, 50);
    END IF;
    INSERT INTO public.order_status_history(order_id, status, note)
    VALUES (v_id, v_status, 'Test status');
    IF v_case IN ('shipped','delivered','courier-cancelled-shipped','courier-conflict') THEN
      INSERT INTO public.postex_tracking_events(order_id, tracking_number,
        provider_status, normalized_status, fingerprint)
      VALUES (v_id, 'PX-' || v_case, 'test-provider-state',
        CASE WHEN v_case = 'courier-cancelled-shipped' THEN 'shipped'
             WHEN v_case = 'courier-conflict' THEN 'delivered' ELSE v_status END, v_case);
    END IF;
    IF v_case IN ('reporting','delivered') THEN
      INSERT INTO public.meta_purchase_outbox(order_pk, order_id, event_time, payload, status)
      VALUES (v_id, 'delete-test-' || v_case, now(), '{}'::jsonb,
        CASE WHEN v_case = 'reporting' THEN 'pending' ELSE 'delivered' END);
    END IF;
  END LOOP;

  INSERT INTO public.email_events(kind, email, data, sent_at)
  VALUES ('order-confirmation', 'test@example.invalid', '{"orderId":"delete-test-ordinary"}'::jsonb, now()),
         ('order-followup', 'test@example.invalid', '{"orderId":"delete-test-ordinary"}'::jsonb, NULL);

  -- Missing sensitive phrase is rejected and audited; exact ID remains the API gate.
  v_result := public.admin_delete_order('delete-test-ordinary', v_actor, NULL);
  IF v_result->>'ok' <> 'false' OR NOT EXISTS (
    SELECT 1 FROM public.order_deletion_log WHERE order_id = 'delete-test-ordinary'
      AND outcome = 'rejected' AND reason = 'sensitive_confirmation') THEN
    RAISE EXCEPTION 'Sensitive confirmation was not enforced';
  END IF;

  v_before := public.admin_order_dashboard_metrics();
  FOREACH v_case IN ARRAY ARRAY['practice','practice-reserved','ordinary','cancelled','archived','delivered','courier-cancelled','courier-cancelled-shipped'] LOOP
    v_result := public.admin_delete_order('delete-test-' || v_case, v_actor,
      CASE WHEN v_case IN ('practice','practice-reserved') THEN NULL ELSE 'DELETE ORDER' END);
    IF v_result->>'ok' <> 'true' THEN
      RAISE EXCEPTION 'Expected successful deletion of %, got %', v_case, v_result;
    END IF;
    IF EXISTS (SELECT 1 FROM public.orders WHERE order_id = 'delete-test-' || v_case)
       OR NOT EXISTS (SELECT 1 FROM public.order_deletion_evidence
                      WHERE order_id = 'delete-test-' || v_case AND admin_user_id = v_actor)
       OR NOT EXISTS (SELECT 1 FROM public.order_deletion_log
                      WHERE order_id = 'delete-test-' || v_case AND outcome = 'deleted')
       OR NOT EXISTS (SELECT 1 FROM public.order_deletion_evidence
                      WHERE order_id = 'delete-test-' || v_case AND retention_until > now()) THEN
      RAISE EXCEPTION 'Operational deletion or evidence failed for %', v_case;
    END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM public.order_deletion_evidence
    WHERE order_id = 'delete-test-practice' AND retention_until <= now() + interval '31 days')
    OR NOT EXISTS (SELECT 1 FROM public.order_deletion_evidence
      WHERE order_id = 'delete-test-ordinary' AND retention_until >= now() + interval '6 years') THEN
    RAISE EXCEPTION 'Retention windows are incorrect';
  END IF;
  v_after := public.admin_order_dashboard_metrics();
  IF v_before->>'todayRevenue' IS DISTINCT FROM v_after->>'todayRevenue'
     OR v_before->>'monthDeliveredRevenue' IS DISTINCT FROM v_after->>'monthDeliveredRevenue' THEN
    RAISE EXCEPTION 'Historical dashboard revenue changed after deletion';
  END IF;

  SELECT quantity INTO v_qty FROM public.products WHERE slug = 'delete-test-product';
  IF v_qty <> 104 THEN
    RAISE EXCEPTION 'Inventory restored incorrectly: expected 104, got %', v_qty;
  END IF;
  IF EXISTS (SELECT 1 FROM public.order_items WHERE order_id IN
    (SELECT order_pk FROM public.deleted_order_identity))
     OR EXISTS (SELECT 1 FROM public.order_status_history WHERE order_id IN
    (SELECT order_pk FROM public.deleted_order_identity))
     OR EXISTS (SELECT 1 FROM public.postex_tracking_events WHERE order_id IN
    (SELECT order_pk FROM public.deleted_order_identity)) THEN
    RAISE EXCEPTION 'Dependent operational rows remained after deletion';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.order_deletion_evidence
    WHERE order_id = 'delete-test-delivered' AND inventory_restored = false
      AND jsonb_array_length(courier_events) = 1 AND jsonb_array_length(items) = 1
      AND order_snapshot ? 'customer')
     OR NOT EXISTS (SELECT 1 FROM public.order_deletion_evidence
       WHERE order_id = 'delete-test-courier-cancelled' AND order_snapshot ? 'customer')
     OR NOT EXISTS (SELECT 1 FROM public.order_deletion_evidence
       WHERE order_id = 'delete-test-courier-cancelled-shipped' AND inventory_restored = false)
     OR NOT EXISTS (SELECT 1 FROM public.meta_purchase_outbox
       WHERE order_id = 'delete-test-delivered' AND order_pk IS NULL AND status = 'delivered') THEN
    RAISE EXCEPTION 'Delivered evidence was not retained';
  END IF;
  IF (SELECT count(*) FROM public.email_events WHERE data->>'orderId' = 'delete-test-ordinary') <> 1
     OR NOT EXISTS (SELECT 1 FROM public.order_deletion_evidence
       WHERE order_id = 'delete-test-ordinary' AND jsonb_array_length(sent_email_events) = 1) THEN
    RAISE EXCEPTION 'Sent email evidence or queued email cleanup failed';
  END IF;

  FOREACH v_case IN ARRAY ARRAY['shipped','reporting','payment','courier-conflict'] LOOP
    v_result := public.admin_delete_order('delete-test-' || v_case, v_actor, 'DELETE ORDER');
    IF v_result->>'ok' <> 'false' OR NOT EXISTS (
      SELECT 1 FROM public.orders WHERE order_id = 'delete-test-' || v_case) THEN
      RAISE EXCEPTION 'Unsafe case was deleted: %', v_case;
    END IF;
  END LOOP;
  v_result := public.admin_delete_order('delete-test-bad-inventory', v_actor, 'DELETE ORDER');
  IF v_result->>'ok' <> 'false' OR NOT EXISTS (
    SELECT 1 FROM public.orders WHERE order_id = 'delete-test-bad-inventory')
    OR EXISTS (SELECT 1 FROM public.deleted_order_identity WHERE order_id = 'delete-test-bad-inventory') THEN
    RAISE EXCEPTION 'Failed stock restoration did not roll back';
  END IF;
  SELECT quantity INTO v_qty FROM public.products WHERE slug = 'delete-test-product';
  IF v_qty <> 104 THEN RAISE EXCEPTION 'Failed deletion changed inventory'; END IF;
  v_result := public.admin_delete_order('delete-test-missing-evidence', v_actor, 'DELETE ORDER');
  IF v_result->>'ok' <> 'false' OR NOT EXISTS (
    SELECT 1 FROM public.orders WHERE order_id = 'delete-test-missing-evidence') THEN
    RAISE EXCEPTION 'Delivered order without itemized evidence was deleted';
  END IF;

  v_result := public.admin_delete_order('delete-test-ordinary', v_actor, 'DELETE ORDER');
  IF v_result->>'ok' <> 'false' THEN RAISE EXCEPTION 'Duplicate deletion succeeded'; END IF;
  BEGIN
    INSERT INTO public.orders(order_id, idempotency_key)
    VALUES ('delete-test-ordinary', 'fresh-idempotency');
    RAISE EXCEPTION 'Deleted order ID was reused';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Deleted order ID was reused' THEN RAISE; END IF;
  END;
  BEGIN
    INSERT INTO public.orders(order_id, idempotency_key)
    VALUES ('fresh-order-number', 'delete-idem-ordinary');
    RAISE EXCEPTION 'Deleted idempotency key was reused';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Deleted idempotency key was reused' THEN RAISE; END IF;
  END;
  BEGIN
    DELETE FROM public.order_deletion_log WHERE order_id = 'delete-test-ordinary';
    RAISE EXCEPTION 'Deletion audit was mutable';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Deletion audit was mutable' THEN RAISE; END IF;
  END;
END;
$$;

ROLLBACK;
