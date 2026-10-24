-- Prepared only. Roll out with product v2 and the collection editor together;
-- drain legacy service-role writers before applying. Never run from a read.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS membership_revision bigint NOT NULL DEFAULT 0;
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 0;
CREATE TABLE public.collection_home_slots (
  slot text PRIMARY KEY CHECK (slot IN ('bestsellers', 'featured', 'offers')),
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0)
);
INSERT INTO public.collection_home_slots(slot) VALUES ('bestsellers'), ('featured'), ('offers');
ALTER TABLE public.collection_home_slots ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.collection_slot_revision_v1() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  NEW.revision := OLD.revision + CASE WHEN pg_trigger_depth()>1 THEN 1 ELSE 0 END;
  RETURN NEW;
END;
$$;
CREATE TRIGGER collection_slot_revision_v1 BEFORE UPDATE ON public.collection_home_slots
FOR EACH ROW EXECUTE FUNCTION public.collection_slot_revision_v1();

CREATE FUNCTION public.collection_revision_v1() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN NEW.revision := 0;
  ELSE
    NEW.revision := OLD.revision + CASE WHEN
      (to_jsonb(NEW) - ARRAY['revision','updated_at']) IS DISTINCT FROM
      (to_jsonb(OLD) - ARRAY['revision','updated_at']) OR pg_trigger_depth() > 1
      THEN 1 ELSE 0 END;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER collection_revision_v1 BEFORE INSERT OR UPDATE ON public.collections
FOR EACH ROW EXECUTE FUNCTION public.collection_revision_v1();

CREATE FUNCTION public.product_membership_revision_v1() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN NEW.membership_revision := 0;
  ELSE NEW.membership_revision := OLD.membership_revision + CASE WHEN pg_trigger_depth() > 1 THEN 1 ELSE 0 END;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER product_membership_revision_v1 BEFORE INSERT OR UPDATE OF membership_revision ON public.products
FOR EACH ROW EXECUTE FUNCTION public.product_membership_revision_v1();

CREATE FUNCTION public.product_before_delete_collections_v1() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  -- The parent product row is already locked. FK cascades otherwise visit
  -- child collections in physical order, which can invert publisher ordering.
  PERFORM 1 FROM collections c WHERE EXISTS (SELECT 1 FROM collection_products m
    WHERE m.collection_id=c.id AND m.product_id=OLD.id) ORDER BY c.id FOR UPDATE;
  RETURN OLD;
END;
$$;
CREATE TRIGGER product_before_delete_collections_v1 BEFORE DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.product_before_delete_collections_v1();

CREATE FUNCTION public.collection_child_revision_v1() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE v_collection uuid; v_product uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.collection_id IS DISTINCT FROM OLD.collection_id OR NEW.product_id IS DISTINCT FROM OLD.product_id THEN
      RAISE EXCEPTION 'BUSINESS_ERROR: Membership identity is immutable';
    END IF;
    IF NEW.sort_order IS NOT DISTINCT FROM OLD.sort_order THEN RETURN NEW; END IF;
  END IF;
  v_collection := CASE WHEN TG_OP = 'DELETE' THEN OLD.collection_id ELSE NEW.collection_id END;
  v_product := CASE WHEN TG_OP = 'DELETE' THEN OLD.product_id ELSE NEW.product_id END;
  -- Reorder changes the collection document, not the product's set membership.
  IF TG_OP <> 'UPDATE' AND EXISTS (SELECT 1 FROM collections WHERE id=v_collection AND mode='manual') THEN
    UPDATE products SET membership_revision=membership_revision+1 WHERE id=v_product;
  END IF;
  UPDATE collections SET revision=revision+1 WHERE id=v_collection;
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END;
$$;
CREATE TRIGGER collection_child_revision_v1 AFTER INSERT OR DELETE OR UPDATE ON public.collection_products
FOR EACH ROW EXECUTE FUNCTION public.collection_child_revision_v1();

CREATE FUNCTION public.collection_mode_slot_revision_v1() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE v_old text; v_new text;
BEGIN
  IF TG_OP <> 'INSERT' THEN v_old := CASE WHEN OLD.active THEN OLD.home_slot END; END IF;
  IF TG_OP <> 'DELETE' THEN v_new := CASE WHEN NEW.active THEN NEW.home_slot END; END IF;
  IF v_old IS DISTINCT FROM v_new THEN
    UPDATE collection_home_slots SET revision=revision+1 WHERE slot IN (v_old,v_new);
  END IF;
  IF TG_OP='UPDATE' AND NEW.mode IS DISTINCT FROM OLD.mode THEN
    UPDATE products SET membership_revision=membership_revision+1
      WHERE id IN (SELECT product_id FROM collection_products WHERE collection_id=NEW.id);
  END IF;
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END;
$$;
CREATE TRIGGER collection_mode_slot_revision_v1 AFTER INSERT OR UPDATE OR DELETE ON public.collections
FOR EACH ROW EXECUTE FUNCTION public.collection_mode_slot_revision_v1();

CREATE FUNCTION public.collection_before_delete_revision_v1() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  -- A direct parent delete runs FK cascades after the parent is invisible to
  -- child triggers. Account for its manual set removal before that happens.
  IF OLD.mode='manual' THEN UPDATE products SET membership_revision=membership_revision+1
    WHERE id IN (SELECT product_id FROM collection_products WHERE collection_id=OLD.id); END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER collection_before_delete_revision_v1 BEFORE DELETE ON public.collections
FOR EACH ROW EXECUTE FUNCTION public.collection_before_delete_revision_v1();

-- SQL STABLE functions share their caller statement's MVCC snapshot. No
-- separately fetched child array can be paired with a newer revision token.
CREATE FUNCTION public.admin_collection_snapshot_v1(p_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp AS $$
 SELECT jsonb_build_object('id',c.id,'name',c.name,'slug',c.slug,'description',c.description,
   'mode',c.mode,'autoRule',c.auto_rule,'sortOrder',c.sort_order,'active',c.active,'homeSlot',c.home_slot,
   'revision',c.revision::text,
   'productIds',coalesce((SELECT jsonb_agg(m.product_id ORDER BY m.sort_order,m.product_id)
     FROM collection_products m WHERE m.collection_id=c.id),'[]'::jsonb),
   'slotRevisions',(SELECT jsonb_object_agg(slot,revision::text) FROM collection_home_slots))
 FROM collections c WHERE c.id=p_id;
$$;
CREATE FUNCTION public.admin_collections_snapshot_v1() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp AS $$
 SELECT coalesce(jsonb_agg(admin_collection_snapshot_v1(c.id) ORDER BY c.sort_order,c.name,c.id),'[]'::jsonb)
 FROM collections c;
$$;
CREATE FUNCTION public.admin_product_editor_snapshot_v1(p_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp AS $$
 SELECT to_jsonb(p) || jsonb_build_object('admin_revision',p.admin_revision::text,
   'inventory_revision',p.inventory_revision::text,'membership_revision',p.membership_revision::text,
   'manual_collection_ids',coalesce((SELECT jsonb_agg(c.id ORDER BY c.id) FROM collections c
     JOIN collection_products m ON m.collection_id=c.id WHERE m.product_id=p.id AND c.mode='manual'),'[]'::jsonb),
   'product_images',coalesce((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.sort_order,i.id) FROM product_images i WHERE i.product_id=p.id),'[]'::jsonb),
   'product_variants',coalesce((SELECT jsonb_agg(to_jsonb(v) ORDER BY v.key,v.id) FROM product_variants v WHERE v.product_id=p.id),'[]'::jsonb))
 FROM products p WHERE p.id=p_id;
$$;

-- Called only after product v2 owns its product row. Exact original intent is
-- retained across saves. An unversioned legacy saved selection fails closed.
CREATE FUNCTION public.admin_product_collection_intent_v1(p_action text,p_id uuid,p_document jsonb,
  p_ids jsonb,p_saved jsonb,p_revision bigint) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE v_intent jsonb; v_ids jsonb; v_id text; v_seen uuid[] := '{}'; v_locked integer;
BEGIN
  v_intent := p_document->'collectionIntent';
  IF v_intent IS NULL THEN
    IF p_ids IS NOT NULL OR p_saved ? '_collectionIds' THEN
      RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='CONFLICT: Collection selection requires deliberate review';
    END IF;
    v_intent := '{"mode":"preserve"}';
  END IF;
  IF jsonb_typeof(v_intent) IS DISTINCT FROM 'object' OR v_intent->>'mode' NOT IN ('preserve','adjust')
    OR v_intent->>'mode' IS NULL THEN RAISE EXCEPTION 'BUSINESS_ERROR: Invalid collection intent'; END IF;
  IF v_intent->>'mode'='preserve' THEN
    IF v_intent - 'mode' <> '{}'::jsonb OR p_ids IS NOT NULL THEN
      RAISE EXCEPTION 'BUSINESS_ERROR: Preserve collection intent cannot replace membership'; END IF;
    RETURN (p_document - '_collectionIds') || jsonb_build_object('collectionIntent',v_intent);
  END IF;
  IF v_intent - ARRAY['mode','expectedRevision'] <> '{}'::jsonb
    OR jsonb_typeof(v_intent->'expectedRevision') IS DISTINCT FROM 'string'
    OR (v_intent->>'expectedRevision') !~ '^(0|[1-9][0-9]*)$'
    OR (v_intent->>'expectedRevision')::numeric > 9223372036854775807 THEN
    RAISE EXCEPTION 'BUSINESS_ERROR: Invalid expected membership revision'; END IF;
  v_ids := coalesce(p_ids,p_saved->'_collectionIds');
  IF jsonb_typeof(v_ids) IS DISTINCT FROM 'array' OR jsonb_array_length(v_ids)>1000 THEN
    RAISE EXCEPTION 'BUSINESS_ERROR: Invalid collection membership'; END IF;
  FOR v_id IN SELECT value #>> '{}' FROM jsonb_array_elements(v_ids) LOOP
    IF v_id IS NULL OR v_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      OR v_id::uuid=ANY(v_seen) THEN RAISE EXCEPTION 'BUSINESS_ERROR: Invalid collection ID'; END IF;
    v_seen := array_append(v_seen,v_id::uuid);
  END LOOP;
  IF p_action IN ('publish','create') AND (v_intent->>'expectedRevision')::bigint IS DISTINCT FROM p_revision THEN
    RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='CONFLICT: Collection membership changed; review selection'; END IF;
  -- Content-only publishing does not enter this lock path. Desired and current
  -- manual collections are locked together in UUID order before reconciliation.
  PERFORM 1 FROM collections c WHERE c.id=ANY(v_seen) OR (p_action='publish' AND EXISTS (
    SELECT 1 FROM collection_products m WHERE m.collection_id=c.id AND m.product_id=p_id))
    ORDER BY c.id FOR UPDATE;
  SELECT count(*) INTO v_locked FROM collections WHERE id=ANY(v_seen) AND mode='manual';
  IF v_locked <> cardinality(v_seen) THEN RAISE EXCEPTION 'BUSINESS_ERROR: Collection must exist and be manual'; END IF;
  RETURN (p_document - '_collectionIds') || jsonb_build_object('collectionIntent',v_intent,'_collectionIds',to_jsonb(v_seen));
END;
$$;

CREATE FUNCTION public.admin_write_collection_v1(p_action text,p_id uuid,p_document jsonb,
  p_expected_revision bigint DEFAULT NULL,p_expected_slot_revision bigint DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE v_before collections%ROWTYPE; v_current collections%ROWTYPE; v_id uuid; v_ids uuid[] := '{}';
  v_old_ids uuid[]; v_affected uuid[]; v_value jsonb; v_product uuid; v_slot text; v_claim text;
  v_mode text; v_active boolean; v_reconcile boolean; v_revision bigint; v_snapshot jsonb;
BEGIN
  IF p_action IS NULL OR p_action NOT IN ('create','update','delete') THEN RAISE EXCEPTION 'BUSINESS_ERROR: Invalid collection action'; END IF;
  IF p_action='create' THEN
    IF p_id IS NOT NULL OR p_expected_revision IS NOT NULL THEN RAISE EXCEPTION 'BUSINESS_ERROR: Invalid create metadata'; END IF;
    v_id := gen_random_uuid();
  ELSE
    SELECT * INTO v_before FROM collections WHERE id=p_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'BUSINESS_ERROR: Collection not found'; END IF;
    v_id := p_id;
  END IF;
  IF p_action<>'delete' THEN
    IF jsonb_typeof(p_document) IS DISTINCT FROM 'object'
      OR p_document - ARRAY['name','slug','description','mode','autoRule','sortOrder','active','homeSlot','productIds'] <> '{}'::jsonb THEN
      RAISE EXCEPTION 'BUSINESS_ERROR: Invalid collection document'; END IF;
    SELECT coalesce(array_agg(product_id ORDER BY sort_order,product_id),'{}') INTO v_old_ids
      FROM collection_products WHERE collection_id=v_id;
    IF p_action='create' THEN
      p_document := jsonb_build_object('description',NULL,'mode','manual','autoRule',NULL,'sortOrder',0,
        'active',true,'homeSlot',NULL,'productIds','[]'::jsonb,
        'slug',coalesce(nullif(btrim(regexp_replace(lower(p_document->>'name'),'[^a-z0-9]+','-','g'),'-'),''),'collection-'||v_id::text)) || p_document;
    ELSE
      p_document := jsonb_build_object('name',v_before.name,'slug',v_before.slug,'description',v_before.description,
        'mode',v_before.mode,'autoRule',v_before.auto_rule,'sortOrder',v_before.sort_order,
        'active',v_before.active,'homeSlot',v_before.home_slot,'productIds',to_jsonb(v_old_ids)) || p_document;
    END IF;
    IF jsonb_typeof(p_document->'name') IS DISTINCT FROM 'string' OR btrim(p_document->>'name')=''
      OR jsonb_typeof(p_document->'slug') IS DISTINCT FROM 'string' OR btrim(p_document->>'slug')=''
      OR jsonb_typeof(p_document->'mode') IS DISTINCT FROM 'string' OR p_document->>'mode' NOT IN ('manual','auto')
      OR jsonb_typeof(p_document->'active') IS DISTINCT FROM 'boolean'
      OR jsonb_typeof(p_document->'sortOrder') IS DISTINCT FROM 'number'
      OR (p_document->>'sortOrder')::numeric <> trunc((p_document->>'sortOrder')::numeric)
      OR (p_document->>'sortOrder')::numeric NOT BETWEEN 0 AND 2147483647
      OR (p_document ? 'description' AND jsonb_typeof(p_document->'description') NOT IN ('string','null'))
      OR (p_document ? 'homeSlot' AND jsonb_typeof(p_document->'homeSlot') NOT IN ('string','null'))
      OR (p_document ? 'autoRule' AND jsonb_typeof(p_document->'autoRule') NOT IN ('string','null')) THEN
      RAISE EXCEPTION 'BUSINESS_ERROR: Invalid collection fields'; END IF;
    v_slot := p_document->>'homeSlot'; v_mode := p_document->>'mode'; v_active := (p_document->>'active')::boolean;
    IF v_slot IS NOT NULL AND v_slot NOT IN ('bestsellers','featured','offers') THEN RAISE EXCEPTION 'BUSINESS_ERROR: Invalid home slot'; END IF;
    IF (v_mode='manual' AND p_document->>'autoRule' IS NOT NULL)
      OR (v_mode='auto' AND (p_document->>'autoRule' IS NULL OR p_document->>'autoRule' NOT IN ('featured','bestsellers'))) THEN
      RAISE EXCEPTION 'BUSINESS_ERROR: Invalid automatic collection rule'; END IF;
    IF jsonb_typeof(p_document->'productIds') IS DISTINCT FROM 'array' OR jsonb_array_length(p_document->'productIds')>1000 THEN
      RAISE EXCEPTION 'BUSINESS_ERROR: Invalid product membership'; END IF;
    FOR v_value IN SELECT value FROM jsonb_array_elements(p_document->'productIds') LOOP
      IF jsonb_typeof(v_value) IS DISTINCT FROM 'string' OR (v_value #>> '{}') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RAISE EXCEPTION 'BUSINESS_ERROR: Invalid product ID'; END IF;
      v_product := (v_value #>> '{}')::uuid;
      IF v_product=ANY(v_ids) THEN RAISE EXCEPTION 'BUSINESS_ERROR: Duplicate product ID'; END IF;
      v_ids := array_append(v_ids,v_product);
    END LOOP;
  END IF;
  v_claim := CASE WHEN v_active THEN v_slot END;
  -- Persistent slots precede every product/collection lock. Never steal a slot
  -- by clearing another owner, and never accept an ABA-reused empty slot token.
  PERFORM 1 FROM collection_home_slots WHERE slot IN (CASE WHEN v_before.active THEN v_before.home_slot END,v_claim)
    ORDER BY slot FOR UPDATE;
  IF v_claim IS NOT NULL AND v_claim IS DISTINCT FROM CASE WHEN v_before.active THEN v_before.home_slot END THEN
    SELECT revision INTO v_revision FROM collection_home_slots WHERE slot=v_claim;
    IF p_expected_slot_revision IS NULL OR p_expected_slot_revision IS DISTINCT FROM v_revision THEN
      RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='CONFLICT: Home slot changed; reload'; END IF;
    IF EXISTS (SELECT 1 FROM collections WHERE active AND home_slot=v_claim AND id<>v_id) THEN
      RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='CONFLICT: Home slot already occupied'; END IF;
  END IF;
  SELECT coalesce(array_agg(product_id ORDER BY sort_order,product_id),'{}') INTO v_old_ids
    FROM collection_products WHERE collection_id=v_id;
  v_reconcile := p_action='delete' OR v_before.mode IS DISTINCT FROM v_mode OR v_old_ids IS DISTINCT FROM v_ids;
  IF v_reconcile THEN
    SELECT array_agg(DISTINCT x ORDER BY x) INTO v_affected FROM unnest(v_old_ids || v_ids) x;
    -- Checkout locks multiple products in slug order. NOWAIT avoids creating a
    -- UUID-vs-slug wait cycle; a competing writer gets a retryable conflict.
    BEGIN
      PERFORM 1 FROM products WHERE id=ANY(v_affected) ORDER BY id FOR UPDATE NOWAIT;
    EXCEPTION WHEN lock_not_available THEN
      RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='CONFLICT: Product membership is busy; reload';
    END;
    IF (SELECT count(*) FROM products WHERE id=ANY(v_ids)) <> cardinality(v_ids) THEN
      RAISE EXCEPTION 'BUSINESS_ERROR: Product must exist'; END IF;
  END IF;
  IF p_action<>'create' THEN
    SELECT * INTO v_current FROM collections WHERE id=v_id FOR UPDATE;
    IF NOT FOUND OR p_expected_revision IS NULL OR p_expected_revision IS DISTINCT FROM v_current.revision THEN
      RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='CONFLICT: Collection changed; reload'; END IF;
    -- Discovery must still describe this exact revision. Do not acquire any new
    -- product/slot locks after owning the collection row.
    IF v_current.revision IS DISTINCT FROM v_before.revision THEN
      RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='CONFLICT: Collection changed during discovery'; END IF;
  END IF;
  IF p_action='delete' THEN
    DELETE FROM collection_products WHERE collection_id=v_id;
    DELETE FROM collections WHERE id=v_id;
    RETURN jsonb_build_object('ok',true,'id',v_id,'revision',v_current.revision::text,'deleted',true,'previousSlug',v_current.slug);
  ELSIF p_action='create' THEN
    INSERT INTO collections(id,name,slug,description,mode,auto_rule,sort_order,active,home_slot)
    VALUES(v_id,btrim(p_document->>'name'),btrim(p_document->>'slug'),p_document->>'description',v_mode,
      p_document->>'autoRule',(p_document->>'sortOrder')::integer,v_active,v_slot);
  ELSE
    UPDATE collections SET name=btrim(p_document->>'name'),slug=btrim(p_document->>'slug'),description=p_document->>'description',
      mode=v_mode,auto_rule=p_document->>'autoRule',sort_order=(p_document->>'sortOrder')::integer,active=v_active,home_slot=v_slot,updated_at=now()
      WHERE id=v_id;
  END IF;
  IF v_reconcile THEN
    DELETE FROM collection_products WHERE collection_id=v_id AND NOT (product_id=ANY(v_ids));
    INSERT INTO collection_products(collection_id,product_id,sort_order)
      SELECT v_id,x.id,x.ordinality::integer-1 FROM unnest(v_ids) WITH ORDINALITY x(id,ordinality)
      ON CONFLICT(collection_id,product_id) DO UPDATE SET sort_order=excluded.sort_order
      WHERE collection_products.sort_order IS DISTINCT FROM excluded.sort_order;
  END IF;
  v_snapshot := admin_collection_snapshot_v1(v_id);
  RETURN jsonb_build_object('ok',true,'id',v_id,'revision',v_snapshot->>'revision','collection',v_snapshot,
    'previousSlug',CASE WHEN p_action='create' THEN NULL ELSE v_current.slug END);
END;
$$;

REVOKE ALL ON TABLE public.collection_home_slots FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,UPDATE ON TABLE public.collection_home_slots TO service_role;
REVOKE ALL ON FUNCTION public.collection_revision_v1(),public.product_membership_revision_v1(),
  public.collection_child_revision_v1(),public.collection_mode_slot_revision_v1(),public.collection_before_delete_revision_v1(),public.collection_slot_revision_v1(),public.product_before_delete_collections_v1(),
  public.admin_collection_snapshot_v1(uuid),public.admin_collections_snapshot_v1(),
  public.admin_product_editor_snapshot_v1(uuid),
  public.admin_product_collection_intent_v1(text,uuid,jsonb,jsonb,jsonb,bigint),
  public.admin_write_collection_v1(text,uuid,jsonb,bigint,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.collection_revision_v1(),public.product_membership_revision_v1(),
  public.collection_child_revision_v1(),public.collection_mode_slot_revision_v1(),public.collection_before_delete_revision_v1(),public.collection_slot_revision_v1(),public.product_before_delete_collections_v1(),
  public.admin_collection_snapshot_v1(uuid),public.admin_collections_snapshot_v1(),
  public.admin_product_editor_snapshot_v1(uuid),
  public.admin_product_collection_intent_v1(text,uuid,jsonb,jsonb,jsonb,bigint),
  public.admin_write_collection_v1(text,uuid,jsonb,bigint,bigint) TO service_role;
