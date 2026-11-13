-- Deletion removes the operational row, but retains identity and restricted evidence.
-- Apply before deploying the admin API that calls the three-argument RPC.
CREATE TABLE public.deleted_order_identity (
  order_id text PRIMARY KEY,
  order_pk uuid NOT NULL UNIQUE,
  idempotency_key text UNIQUE,
  deleted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.deleted_order_identity ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.deleted_order_identity FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.deleted_order_identity TO service_role;

CREATE TABLE public.order_deletion_evidence (
  order_id text PRIMARY KEY REFERENCES public.deleted_order_identity(order_id),
  admin_user_id uuid NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  is_demo boolean NOT NULL,
  status text NOT NULL,
  payment text NOT NULL,
  total numeric NOT NULL,
  created_at timestamptz NOT NULL,
  status_updated_at timestamptz,
  archived_at timestamptz,
  inventory_restored boolean NOT NULL,
  retention_until timestamptz NOT NULL,
  order_snapshot jsonb NOT NULL,
  items jsonb NOT NULL,
  status_history jsonb NOT NULL,
  courier_events jsonb NOT NULL,
  sent_email_events jsonb NOT NULL
);
CREATE INDEX order_deletion_evidence_created_idx ON public.order_deletion_evidence(created_at);
CREATE INDEX order_deletion_evidence_expiry_idx ON public.order_deletion_evidence(retention_until);
ALTER TABLE public.order_deletion_evidence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_deletion_evidence FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.order_deletion_evidence TO service_role;

-- Keep a finite audit window; successful real-order audits use the evidence deadline.
ALTER TABLE public.order_deletion_log
  ADD COLUMN retention_until timestamptz NOT NULL DEFAULT (now() + interval '1 year');
CREATE INDEX order_deletion_log_expiry_idx ON public.order_deletion_log(retention_until);

-- Litigation, courier disputes or a tax assessment can suspend routine disposal.
-- Only a database administrator can manage holds; never exposed to the admin app.
CREATE TABLE public.order_deletion_legal_holds (
  order_id text PRIMARY KEY REFERENCES public.order_deletion_evidence(order_id),
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 10 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.order_deletion_legal_holds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_deletion_legal_holds FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reject_deletion_record_change() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  -- Only the DB-admin retention-disposal function may erase expired records.
  IF current_user = 'postgres'
     AND current_setting('app.order_deletion_retention_purge', true) = 'allowed' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Deletion evidence and audits are immutable';
END;
$$;
CREATE TRIGGER deleted_order_identity_immutable BEFORE UPDATE OR DELETE ON public.deleted_order_identity
  FOR EACH ROW EXECUTE FUNCTION public.reject_deletion_record_change();
CREATE TRIGGER order_deletion_evidence_immutable BEFORE UPDATE OR DELETE ON public.order_deletion_evidence
  FOR EACH ROW EXECUTE FUNCTION public.reject_deletion_record_change();
CREATE TRIGGER order_deletion_log_immutable BEFORE UPDATE OR DELETE ON public.order_deletion_log
  FOR EACH ROW EXECUTE FUNCTION public.reject_deletion_record_change();
REVOKE ALL ON FUNCTION public.reject_deletion_record_change() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.reject_reused_order_identity() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.deleted_order_identity d
             WHERE d.order_id = NEW.order_id OR d.order_pk = NEW.id
                OR (NEW.idempotency_key IS NOT NULL AND d.idempotency_key = NEW.idempotency_key)) THEN
    RAISE EXCEPTION 'BUSINESS_ERROR: Deleted order identity cannot be reused';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER orders_reject_reused_identity BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.reject_reused_order_identity();
REVOKE ALL ON FUNCTION public.reject_reused_order_identity() FROM PUBLIC, anon, authenticated;

-- A completed Meta delivery is evidence, not disposable order state. An unfinished
-- delivery blocks deletion below so the reporting worker keeps its parent order.
ALTER TABLE public.meta_purchase_outbox DROP CONSTRAINT meta_purchase_outbox_order_pk_fkey;
ALTER TABLE public.meta_purchase_outbox ALTER COLUMN order_pk DROP NOT NULL;
ALTER TABLE public.meta_purchase_outbox ADD CONSTRAINT meta_purchase_outbox_order_pk_fkey
  FOREIGN KEY (order_pk) REFERENCES public.orders(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.admin_delete_order(
  p_order_id text, p_admin_user_id uuid, p_sensitive_confirmation text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_reason text;
  v_message text;
  v_restore boolean;
  v_item record;
  v_remaining integer;
  v_count integer;
  v_items jsonb;
  v_history jsonb;
  v_courier jsonb;
  v_email jsonb;
BEGIN
  IF p_admin_user_id IS NULL OR NULLIF(btrim(p_order_id), '') IS NULL THEN
    RAISE EXCEPTION 'BUSINESS_ERROR: Named admin and order ID are required';
  END IF;

  -- Serialize checkout inserts with the identity tombstone. This is a rare admin
  -- operation; the lock is held only for this transaction.
  LOCK TABLE public.orders IN SHARE ROW EXCLUSIVE MODE;
  SELECT * INTO v_order FROM public.orders WHERE order_id = btrim(p_order_id) FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.order_deletion_log(order_id, admin_user_id, outcome, reason)
    VALUES (btrim(p_order_id), p_admin_user_id, 'rejected', 'not_found');
    RETURN jsonb_build_object('ok', false, 'error', 'Order not found');
  END IF;

  IF v_order.status NOT IN ('new','processing','cancelled','shipped','delivered') THEN
    v_reason := 'unknown_status'; v_message := 'Order status requires review before deletion';
  ELSIF NOT COALESCE(v_order.is_demo, false) AND lower(v_order.payment) <> 'cod' THEN
    v_reason := 'payment_reconciliation'; v_message := 'Payment or settlement requires manual reconciliation';
  ELSIF v_order.postex_booking_state IN ('in_progress','unknown')
     OR v_order.postex_cancel_state IN ('in_progress','unknown') THEN
    v_reason := 'courier_uncertain'; v_message := 'Courier outcome requires reconciliation before deletion';
  ELSIF v_order.status <> 'delivered' AND (
    v_order.postex_latest_normalized_status = 'delivered'
    OR EXISTS (SELECT 1 FROM public.postex_tracking_events c
               WHERE c.order_id = v_order.id AND c.normalized_status = 'delivered')
    OR EXISTS (SELECT 1 FROM public.order_status_history h
               WHERE h.order_id = v_order.id AND h.status = 'delivered')
  ) THEN
    v_reason := 'courier_conflict'; v_message := 'Delivered courier evidence requires reconciliation';
  ELSIF v_order.status = 'shipped' THEN
    v_reason := 'active_shipment'; v_message := 'Shipped orders require delivery or confirmed cancellation before deletion';
  ELSIF v_order.status <> 'delivered' AND (
    (v_order.postex_booking_state = 'confirmed' AND v_order.postex_cancel_state <> 'confirmed')
    OR (NULLIF(btrim(v_order.postex_tracking_number), '') IS NOT NULL
        AND v_order.postex_cancel_state <> 'confirmed')
    OR (v_order.postex_booking_claimed_at IS NOT NULL
        AND v_order.postex_cancel_state <> 'confirmed')
  ) THEN
    v_reason := 'active_shipment'; v_message := 'An active courier shipment cannot be deleted';
  ELSIF EXISTS (SELECT 1 FROM public.meta_purchase_outbox m
                WHERE m.order_pk = v_order.id AND m.status <> 'delivered') THEN
    v_reason := 'reporting_pending'; v_message := 'Purchase reporting requires reconciliation before deletion';
  ELSIF (NOT COALESCE(v_order.is_demo, false) OR v_order.status IN ('shipped','delivered'))
        AND p_sensitive_confirmation IS DISTINCT FROM 'DELETE ORDER' THEN
    v_reason := 'sensitive_confirmation'; v_message := 'Type DELETE ORDER to confirm this deletion';
  END IF;

  IF v_reason IS NOT NULL THEN
    INSERT INTO public.order_deletion_log(order_id, admin_user_id, order_was_demo, outcome, reason)
    VALUES (v_order.order_id, p_admin_user_id, v_order.is_demo, 'rejected', v_reason);
    RETURN jsonb_build_object('ok', false, 'error', v_message);
  END IF;

  -- The reservation flag is authoritative only before fulfillment. Delivered
  -- goods must never be put back in stock, even if a legacy row still says true.
  v_restore := v_order.inventory_reserved AND v_order.status IN ('new','processing','cancelled')
    AND COALESCE(v_order.postex_latest_normalized_status, '') NOT IN ('shipped','delivered')
    AND NOT EXISTS (SELECT 1 FROM public.order_status_history h
                    WHERE h.order_id = v_order.id AND h.status IN ('shipped','delivered'))
    AND NOT EXISTS (SELECT 1 FROM public.postex_tracking_events c
                    WHERE c.order_id = v_order.id AND c.normalized_status IN ('shipped','delivered'));
  BEGIN
    SELECT COALESCE(jsonb_agg(to_jsonb(i) ORDER BY i.id), '[]'::jsonb)
      INTO v_items FROM public.order_items i WHERE i.order_id = v_order.id;
    IF NOT COALESCE(v_order.is_demo, false) AND (
      v_items = '[]'::jsonb OR EXISTS (SELECT 1 FROM public.order_items i
        WHERE i.order_id = v_order.id AND
          (i.name IS NULL OR i.price IS NULL OR i.quantity IS NULL
           OR i.quantity <= 0 OR i.line_total IS NULL))
    ) THEN
      RAISE EXCEPTION 'Missing itemized financial evidence';
    END IF;
    SELECT COALESCE(jsonb_agg(to_jsonb(h) ORDER BY h.at, h.id), '[]'::jsonb)
      INTO v_history FROM public.order_status_history h WHERE h.order_id = v_order.id;
    SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.received_at, c.id), '[]'::jsonb)
      INTO v_courier FROM public.postex_tracking_events c WHERE c.order_id = v_order.id;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', e.id, 'kind', e.kind,
      'sent_at', e.sent_at) ORDER BY e.created_at, e.id), '[]'::jsonb)
      INTO v_email FROM public.email_events e
      WHERE e.data->>'orderId' = v_order.order_id AND e.sent_at IS NOT NULL;

    IF v_restore THEN
      SELECT count(*) INTO v_count FROM public.order_items WHERE order_id = v_order.id;
      IF v_count = 0 OR EXISTS (SELECT 1 FROM public.order_items
                              WHERE order_id = v_order.id AND (slug IS NULL OR quantity IS NULL OR quantity <= 0)) THEN
        RAISE EXCEPTION 'Missing inventory item data';
      END IF;
      FOR v_item IN SELECT slug, sum(quantity)::integer AS quantity
                    FROM public.order_items WHERE order_id = v_order.id
                    GROUP BY slug ORDER BY slug LOOP
        UPDATE public.products SET quantity = quantity + v_item.quantity,
          stock_status = CASE WHEN quantity + v_item.quantity <= 0 THEN 'out-of-stock'
                              WHEN quantity + v_item.quantity <= 5 THEN 'low-stock'
                              ELSE 'in-stock' END
          WHERE slug = v_item.slug AND quantity IS NOT NULL
          RETURNING quantity INTO v_remaining;
        IF NOT FOUND THEN RAISE EXCEPTION 'Missing configured inventory'; END IF;
      END LOOP;
    END IF;

    INSERT INTO public.deleted_order_identity(order_id, order_pk, idempotency_key)
    VALUES (v_order.order_id, v_order.id, v_order.idempotency_key);
    INSERT INTO public.order_deletion_evidence(
      order_id, admin_user_id, is_demo, status, payment, total, created_at,
      status_updated_at, archived_at, inventory_restored, retention_until,
      order_snapshot, items, status_history, courier_events, sent_email_events
    ) VALUES (
      v_order.order_id, p_admin_user_id, COALESCE(v_order.is_demo, false), v_order.status,
      v_order.payment, v_order.total, v_order.created_at, v_order.status_updated_at,
      v_order.archived_at, v_restore,
      CASE WHEN COALESCE(v_order.is_demo, false) THEN now() + interval '30 days'
           ELSE greatest(v_order.created_at + interval '7 years', now() + interval '1 year') END,
      CASE WHEN v_order.status = 'delivered' OR v_order.postex_booking_state = 'confirmed'
             OR NULLIF(btrim(v_order.postex_tracking_number), '') IS NOT NULL
             OR v_courier <> '[]'::jsonb
           THEN to_jsonb(v_order) - 'attrib_ttclid' - 'attrib_fbclid' - 'attrib_gclid'
                  - 'attrib_campaign' - 'attrib_content' - 'attrib_campaign_id'
                  - 'attrib_ad_id' - 'attrib_medium' - 'attrib_source'
                  - 'idempotency_fingerprint'
           ELSE to_jsonb(v_order) - 'customer' - 'attrib_ttclid' - 'attrib_fbclid'
                  - 'attrib_gclid' - 'attrib_campaign' - 'attrib_content'
                  - 'attrib_campaign_id' - 'attrib_ad_id' - 'attrib_medium'
                  - 'attrib_source' - 'idempotency_fingerprint' END,
      v_items, v_history, v_courier, v_email
    );
    DELETE FROM public.email_events WHERE data->>'orderId' = v_order.order_id AND sent_at IS NULL;
    DELETE FROM public.orders WHERE id = v_order.id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order changed during deletion'; END IF;
    INSERT INTO public.order_deletion_log(order_id, admin_user_id, order_was_demo, outcome, retention_until)
    VALUES (v_order.order_id, p_admin_user_id, v_order.is_demo, 'deleted',
      CASE WHEN COALESCE(v_order.is_demo, false) THEN now() + interval '30 days'
           ELSE greatest(v_order.created_at + interval '7 years', now() + interval '1 year') END);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.order_deletion_log(order_id, admin_user_id, order_was_demo, outcome, reason)
    VALUES (v_order.order_id, p_admin_user_id, v_order.is_demo, 'rejected', 'deletion_failed');
    RETURN jsonb_build_object('ok', false, 'error', 'Could not safely delete this order');
  END;
  RETURN jsonb_build_object('ok', true, 'order_id', v_order.order_id);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_delete_order(text,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_order(text,uuid,text) TO service_role;

-- Old app instances may still call the two-argument RPC during rollout. Its
-- original demo-only caller remains safe; live orders require the new phrase.
CREATE OR REPLACE FUNCTION public.admin_delete_order(p_order_id text, p_admin_user_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public, pg_temp AS $$
  SELECT public.admin_delete_order(p_order_id, p_admin_user_id, NULL::text);
$$;
REVOKE ALL ON FUNCTION public.admin_delete_order(text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_order(text,uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.admin_delete_demo_order(text) FROM service_role;

-- Explicit, DBA-run disposal; never called by the store/admin application.
-- Identity tombstones remain to prevent public-ID or checkout-key reuse.
CREATE OR REPLACE FUNCTION public.purge_expired_order_deletion_records(p_limit integer DEFAULT 100)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_evidence_count integer;
  v_audit_count integer;
BEGIN
  IF session_user <> 'postgres' THEN
    RAISE EXCEPTION 'Database administrator required';
  END IF;
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'Batch size must be between 1 and 500';
  END IF;
  PERFORM set_config('app.order_deletion_retention_purge', 'allowed', true);
  WITH expired AS (
    SELECT e.order_id FROM public.order_deletion_evidence e
    WHERE e.retention_until <= now() AND NOT EXISTS (
      SELECT 1 FROM public.order_deletion_legal_holds h WHERE h.order_id = e.order_id
    )
    ORDER BY e.retention_until LIMIT p_limit FOR UPDATE SKIP LOCKED
  )
  DELETE FROM public.order_deletion_evidence e USING expired x WHERE e.order_id = x.order_id;
  GET DIAGNOSTICS v_evidence_count = ROW_COUNT;
  WITH expired AS (
    SELECT l.id FROM public.order_deletion_log l
    WHERE l.retention_until <= now() AND NOT EXISTS (
      SELECT 1 FROM public.order_deletion_legal_holds h WHERE h.order_id = l.order_id
    )
    ORDER BY l.retention_until LIMIT p_limit FOR UPDATE SKIP LOCKED
  )
  DELETE FROM public.order_deletion_log l USING expired x WHERE l.id = x.id;
  GET DIAGNOSTICS v_audit_count = ROW_COUNT;
  RETURN jsonb_build_object('purged_evidence', v_evidence_count, 'purged_audits', v_audit_count);
END;
$$;
REVOKE ALL ON FUNCTION public.purge_expired_order_deletion_records(integer)
  FROM PUBLIC, anon, authenticated, service_role;
