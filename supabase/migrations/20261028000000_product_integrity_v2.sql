-- Coordinated application/database rollout required. Legacy product RPCs are
-- deliberately revoked below; the application must fail closed without v2.
-- No existing catalog/review/inventory data is rewritten by this migration.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS inventory_revision bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS admin_revision bigint NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.product_inventory_revision_v2()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.inventory_revision := 0;
  ELSE
    -- Revision authority belongs to actual inventory changes, including changes
    -- made by checkout/cancellation. A supplied revision can never reset it.
    NEW.inventory_revision := OLD.inventory_revision + CASE
      WHEN NEW.quantity IS DISTINCT FROM OLD.quantity
        OR NEW.stock_status IS DISTINCT FROM OLD.stock_status THEN 1 ELSE 0 END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER product_inventory_revision_v2
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.product_inventory_revision_v2();

-- The numeric-inventory migration already constrains quantity >= 0. Monetary
-- validation stays at the command boundary: new whole-row money constraints
-- would block checkout/cancel on unchanged legacy monetary values.

CREATE OR REPLACE FUNCTION public.admin_write_product_v2(
  p_action text,
  p_product_id uuid,
  p_document jsonb,
  p_collection_ids jsonb DEFAULT NULL,
  p_expected_admin_revision bigint DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_temp AS $$
DECLARE
  v_current public.products%ROWTYPE;
  v_document jsonb;
  v_intent jsonb;
  v_collections jsonb;
  v_variants jsonb;
  v_field text;
  v_child_field text;
  v_item jsonb;
  v_key text;
  v_seen text[];
  v_names text[];
  v_index integer;
  v_number numeric;
  v_price numeric;
  v_adjust boolean := false;
  v_axes boolean;
  v_quantity integer;
  v_stock_status text;
  v_inventory_revision bigint;
  v_admin_revision bigint;
  v_product_id uuid;
BEGIN
  IF p_action IS NULL OR p_action NOT IN ('create', 'save', 'publish', 'discard', 'unpublish') THEN
    RAISE EXCEPTION 'BUSINESS_ERROR: Invalid product action';
  END IF;

  IF p_action = 'create' THEN
    IF p_product_id IS NOT NULL OR p_expected_admin_revision IS NOT NULL THEN
      RAISE EXCEPTION 'BUSINESS_ERROR: Create does not accept existing product metadata';
    END IF;
    v_inventory_revision := 0;
  ELSE
    SELECT * INTO v_current FROM public.products WHERE id = p_product_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'BUSINESS_ERROR: Product not found';
    END IF;
    IF p_expected_admin_revision IS NULL
       OR p_expected_admin_revision IS DISTINCT FROM v_current.admin_revision THEN
      RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'CONFLICT: Product changed; reload before editing';
    END IF;
    v_inventory_revision := v_current.inventory_revision;
  END IF;

  IF p_action IN ('discard', 'unpublish') THEN
    UPDATE public.products SET
      draft = CASE WHEN p_action = 'discard' THEN NULL ELSE draft END,
      status = CASE WHEN p_action = 'unpublish' THEN 'unpublished' ELSE status END,
      admin_revision = admin_revision + 1,
      updated_at = now()
    WHERE id = p_product_id
    RETURNING id, admin_revision, inventory_revision, quantity, stock_status
    INTO v_product_id, v_admin_revision, v_inventory_revision, v_quantity, v_stock_status;
    RETURN jsonb_build_object('ok', true, 'id', v_product_id,
      'admin_revision', v_admin_revision::text, 'inventory_revision', v_inventory_revision::text,
      'quantity', v_quantity, 'stock_status', v_stock_status,
      'membership_revision', (SELECT membership_revision::text FROM products WHERE id=v_product_id),
      'manual_collection_ids', admin_product_editor_snapshot_v1(v_product_id)->'manual_collection_ids');
  END IF;

  IF jsonb_typeof(p_document) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'BUSINESS_ERROR: Invalid product document';
  END IF;
  -- Reserved membership is supplied only through the separately validated
  -- argument; review projections have no catalog-write authority.
  v_document := p_document - ARRAY['_collectionIds', 'reviews', 'rating', 'reviewCount', 'review_count'];

  FOREACH v_field IN ARRAY ARRAY['name', 'slug', 'category'] LOOP
    IF jsonb_typeof(v_document->v_field) IS DISTINCT FROM 'string'
       OR btrim(v_document->>v_field) = '' THEN
      RAISE EXCEPTION 'BUSINESS_ERROR: Invalid required product field %', v_field;
    END IF;
  END LOOP;
  FOREACH v_field IN ARRAY ARRAY['brand', 'sku', 'shortDescription', 'badge', 'tiktokUrl', 'instagramUrl'] LOOP
    IF v_document ? v_field AND jsonb_typeof(v_document->v_field) NOT IN ('string', 'null') THEN
      RAISE EXCEPTION 'BUSINESS_ERROR: Invalid product text field %', v_field;
    END IF;
  END LOOP;
  FOREACH v_field IN ARRAY ARRAY['featured', 'isDemo', 'freeShipping', 'colorEnabled', 'sizeEnabled'] LOOP
    IF v_document ? v_field AND jsonb_typeof(v_document->v_field) IS DISTINCT FROM 'boolean' THEN
      RAISE EXCEPTION 'BUSINESS_ERROR: Invalid product boolean %', v_field;
    END IF;
  END LOOP;
  FOREACH v_field IN ARRAY ARRAY['price', 'compareAtPrice', 'costPrice'] LOOP
    IF (v_field = 'price' OR v_document ? v_field)
       AND NOT (v_field <> 'price' AND v_document->v_field = 'null'::jsonb) THEN
      IF jsonb_typeof(v_document->v_field) IS DISTINCT FROM 'number' THEN
        RAISE EXCEPTION 'BUSINESS_ERROR: Invalid product number %', v_field;
      END IF;
      v_number := (v_document->>v_field)::numeric;
      IF v_number < 0 OR v_number > 90071992547409.91 OR scale(v_number) > 2 THEN
        RAISE EXCEPTION 'BUSINESS_ERROR: Invalid product money %', v_field;
      END IF;
    END IF;
  END LOOP;
  v_price := (v_document->>'price')::numeric;
  IF p_action = 'publish' AND v_price <= 0 THEN
    RAISE EXCEPTION 'BUSINESS_ERROR: Publish price must be positive';
  END IF;
  IF (v_document->>'compareAtPrice')::numeric < v_price THEN
    RAISE EXCEPTION 'BUSINESS_ERROR: Compare-at price is below product price';
  END IF;
  -- Legacy display inventory is validated, but never copied into the live row.
  IF v_document ? 'quantity' AND v_document->'quantity' <> 'null'::jsonb THEN
    IF jsonb_typeof(v_document->'quantity') IS DISTINCT FROM 'number' THEN
      RAISE EXCEPTION 'BUSINESS_ERROR: Invalid product quantity';
    END IF;
    v_number := (v_document->>'quantity')::numeric;
    IF v_number < 0 OR v_number > 2147483647 OR trunc(v_number) <> v_number THEN
      RAISE EXCEPTION 'BUSINESS_ERROR: Invalid product quantity';
    END IF;
  END IF;
  IF v_document ? 'stockStatus' AND
     (jsonb_typeof(v_document->'stockStatus') IS DISTINCT FROM 'string'
       OR v_document->>'stockStatus' NOT IN ('in-stock', 'low-stock', 'out-of-stock')) THEN
    RAISE EXCEPTION 'BUSINESS_ERROR: Invalid product stock status';
  END IF;

  FOREACH v_field IN ARRAY ARRAY['images', 'cloudinaryImages', 'features', 'compatibility', 'inTheBox',
    'specifications', 'productFaq', 'addons', 'variants', 'colorOptions', 'sizeOptions'] LOOP
    IF v_document ? v_field AND jsonb_typeof(v_document->v_field) IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'BUSINESS_ERROR: Invalid product list %', v_field;
    END IF;
  END LOOP;
  FOREACH v_field IN ARRAY ARRAY['images', 'cloudinaryImages', 'features', 'compatibility', 'inTheBox'] LOOP
    FOR v_item IN SELECT value FROM jsonb_array_elements(coalesce(v_document->v_field, '[]')) LOOP
      IF jsonb_typeof(v_item) IS DISTINCT FROM 'string' THEN
        RAISE EXCEPTION 'BUSINESS_ERROR: Invalid product list entry %', v_field;
      END IF;
      IF v_field IN ('images', 'cloudinaryImages') AND btrim(v_item #>> '{}') = '' THEN
        RAISE EXCEPTION 'BUSINESS_ERROR: Empty product image';
      END IF;
    END LOOP;
  END LOOP;
  IF v_document ? 'productVideo' AND jsonb_typeof(v_document->'productVideo') NOT IN ('object', 'null') THEN
    RAISE EXCEPTION 'BUSINESS_ERROR: Invalid product video';
  END IF;
  FOREACH v_child_field IN ARRAY ARRAY['url', 'poster', 'cloudinaryPublicId'] LOOP
    IF (v_document->'productVideo') ? v_child_field
      AND jsonb_typeof(v_document->'productVideo'->v_child_field) IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION 'BUSINESS_ERROR: Invalid product video text';
    END IF;
  END LOOP;
  IF v_document ? 'description' AND v_document->'description' <> 'null'::jsonb THEN
    IF jsonb_typeof(v_document->'description') NOT IN ('array', 'string') THEN
      RAISE EXCEPTION 'BUSINESS_ERROR: Invalid product description';
    END IF;
    IF jsonb_typeof(v_document->'description') = 'array' THEN
      FOR v_item IN SELECT value FROM jsonb_array_elements(v_document->'description') LOOP
        IF jsonb_typeof(v_item) IS DISTINCT FROM 'object' THEN
          RAISE EXCEPTION 'BUSINESS_ERROR: Invalid product description block';
        END IF;
      END LOOP;
    END IF;
  END IF;
  FOREACH v_field IN ARRAY ARRAY['specifications', 'productFaq'] LOOP
    FOR v_item IN SELECT value FROM jsonb_array_elements(coalesce(v_document->v_field, '[]')) LOOP
      IF jsonb_typeof(v_item) IS DISTINCT FROM 'object' THEN
        RAISE EXCEPTION 'BUSINESS_ERROR: Invalid product detail %', v_field;
      END IF;
      IF v_field = 'specifications' THEN
        IF jsonb_typeof(v_item->'label') IS DISTINCT FROM 'string' OR jsonb_typeof(v_item->'value') IS DISTINCT FROM 'string' THEN
          RAISE EXCEPTION 'BUSINESS_ERROR: Invalid product specification';
        END IF;
      ELSE
        IF jsonb_typeof(v_item->'question') IS DISTINCT FROM 'string' OR jsonb_typeof(v_item->'answer') IS DISTINCT FROM 'string' THEN
          RAISE EXCEPTION 'BUSINESS_ERROR: Invalid product FAQ';
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  FOREACH v_field IN ARRAY ARRAY['colorOptions', 'sizeOptions'] LOOP
    v_seen := ARRAY[]::text[];
    v_names := ARRAY[]::text[];
    FOR v_item IN SELECT value FROM jsonb_array_elements(coalesce(v_document->v_field, '[]')) LOOP
      IF jsonb_typeof(v_item) IS DISTINCT FROM 'object'
        OR jsonb_typeof(v_item->'key') IS DISTINCT FROM 'string'
        OR btrim(v_item->>'key') = ''
        OR jsonb_typeof(v_item->'name') IS DISTINCT FROM 'string'
        OR btrim(v_item->>'name') = ''
        OR jsonb_typeof(v_item->'enabled') IS DISTINCT FROM 'boolean'
        OR (v_item ? 'image' AND jsonb_typeof(v_item->'image') NOT IN ('string', 'null')) THEN
        RAISE EXCEPTION 'BUSINESS_ERROR: Invalid product option %', v_field;
      END IF;
      IF btrim(v_item->>'key') = ANY(v_seen) OR lower(btrim(v_item->>'name')) = ANY(v_names) THEN
        RAISE EXCEPTION 'BUSINESS_ERROR: Duplicate product option %', v_field;
      END IF;
      v_seen := array_append(v_seen, btrim(v_item->>'key'));
      v_names := array_append(v_names, lower(btrim(v_item->>'name')));
    END LOOP;
    IF coalesce((v_document->>CASE WHEN v_field = 'colorOptions' THEN 'colorEnabled' ELSE 'sizeEnabled' END)::boolean, false)
      AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(v_document->v_field, '[]')) o WHERE (o->>'enabled')::boolean) THEN
      RAISE EXCEPTION 'BUSINESS_ERROR: Enabled product axis requires options';
    END IF;
  END LOOP;

  FOREACH v_field IN ARRAY ARRAY['addons', 'variants'] LOOP
    v_seen := ARRAY[]::text[];
    v_index := 0;
    FOR v_item IN SELECT value FROM jsonb_array_elements(coalesce(v_document->v_field, '[]')) LOOP
      IF jsonb_typeof(v_item) IS DISTINCT FROM 'object'
        OR jsonb_typeof(v_item->'name') IS DISTINCT FROM 'string' OR btrim(v_item->>'name') = '' THEN
        RAISE EXCEPTION 'BUSINESS_ERROR: Invalid product child %', v_field;
      END IF;
      FOREACH v_child_field IN ARRAY ARRAY['sku', 'image', 'badge', 'description'] LOOP
        IF v_item ? v_child_field AND jsonb_typeof(v_item->v_child_field) NOT IN ('string', 'null') THEN
          RAISE EXCEPTION 'BUSINESS_ERROR: Invalid product child text %', v_child_field;
        END IF;
      END LOOP;
      IF v_item ? '_key' AND (jsonb_typeof(v_item->'_key') IS DISTINCT FROM 'string' OR btrim(v_item->>'_key') = '') THEN
        RAISE EXCEPTION 'BUSINESS_ERROR: Invalid product child key';
      END IF;
      v_key := coalesce(v_item->>'_key', 'v' || v_index);
      IF v_key = ANY(v_seen) THEN
        RAISE EXCEPTION 'BUSINESS_ERROR: Duplicate product child key';
      END IF;
      v_seen := array_append(v_seen, v_key);
      v_index := v_index + 1;
      IF v_field = 'addons' OR (v_item ? 'price' AND v_item->'price' <> 'null'::jsonb) THEN
        IF jsonb_typeof(v_item->'price') IS DISTINCT FROM 'number' THEN
          RAISE EXCEPTION 'BUSINESS_ERROR: Invalid child price';
        END IF;
        v_number := (v_item->>'price')::numeric;
        IF v_number < 0 OR v_number > 90071992547409.91 OR scale(v_number) > 2
          OR (v_field = 'variants' AND p_action = 'publish' AND v_number = 0) THEN
          RAISE EXCEPTION 'BUSINESS_ERROR: Invalid child price';
        END IF;
      END IF;
      IF v_item ? 'compareAtPrice' AND v_item->'compareAtPrice' <> 'null'::jsonb THEN
        IF jsonb_typeof(v_item->'compareAtPrice') IS DISTINCT FROM 'number' THEN
          RAISE EXCEPTION 'BUSINESS_ERROR: Invalid child compare-at price';
        END IF;
        v_number := (v_item->>'compareAtPrice')::numeric;
        IF v_number < coalesce((v_item->>'price')::numeric, v_price)
          OR v_number > 90071992547409.91 OR scale(v_number) > 2 THEN
          RAISE EXCEPTION 'BUSINESS_ERROR: Invalid child compare-at price';
        END IF;
      END IF;
      IF v_field = 'variants' THEN
        IF v_item ? 'isDefault' AND jsonb_typeof(v_item->'isDefault') IS DISTINCT FROM 'boolean' THEN
          RAISE EXCEPTION 'BUSINESS_ERROR: Invalid variant default flag';
        END IF;
        IF v_item ? 'stockStatus' AND (jsonb_typeof(v_item->'stockStatus') IS DISTINCT FROM 'string'
          OR v_item->>'stockStatus' NOT IN ('in-stock', 'low-stock', 'out-of-stock')) THEN
          RAISE EXCEPTION 'BUSINESS_ERROR: Invalid variant stock status';
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  v_intent := coalesce(v_document->'inventoryIntent', '{"mode":"preserve"}'::jsonb);
  IF jsonb_typeof(v_intent) IS DISTINCT FROM 'object'
    OR jsonb_typeof(v_intent->'mode') IS DISTINCT FROM 'string'
    OR v_intent->>'mode' NOT IN ('preserve', 'adjust') THEN
    RAISE EXCEPTION 'BUSINESS_ERROR: Invalid inventory intent';
  END IF;
  v_adjust := v_intent->>'mode' = 'adjust';
  IF NOT v_adjust THEN
    IF v_intent - 'mode' <> '{}'::jsonb THEN
      RAISE EXCEPTION 'BUSINESS_ERROR: Preserve inventory intent has unexpected fields';
    END IF;
    IF p_action = 'create' THEN
      -- No existing shelf exists on create: initial inventory is draft intent,
      -- not a display projection that may be silently discarded on publish.
      v_intent := jsonb_build_object('mode', 'adjust', 'expectedRevision', '0',
        'quantity', coalesce(v_document->'quantity', 'null'::jsonb),
        'stockStatus', coalesce(v_document->>'stockStatus', 'in-stock'));
      v_adjust := true;
    END IF;
  END IF;
  IF v_adjust THEN
    IF v_intent - ARRAY['mode', 'expectedRevision', 'quantity', 'stockStatus'] <> '{}'::jsonb
      OR jsonb_typeof(v_intent->'expectedRevision') IS DISTINCT FROM 'string'
      OR (v_intent->>'expectedRevision') !~ '^(0|[1-9][0-9]*)$' THEN
      RAISE EXCEPTION 'BUSINESS_ERROR: Invalid expected inventory revision';
    END IF;
    IF (v_intent->>'expectedRevision')::numeric > 9223372036854775807 THEN
      RAISE EXCEPTION 'BUSINESS_ERROR: Invalid expected inventory revision';
    END IF;
    IF NOT (v_intent ? 'quantity') OR jsonb_typeof(v_intent->'quantity') NOT IN ('number', 'null') THEN
      RAISE EXCEPTION 'BUSINESS_ERROR: Invalid inventory adjustment quantity';
    END IF;
    v_number := (v_intent->>'quantity')::numeric;
    IF v_number < 0 OR v_number > 2147483647 OR trunc(v_number) <> v_number THEN
      RAISE EXCEPTION 'BUSINESS_ERROR: Invalid inventory adjustment quantity';
    END IF;
    v_quantity := v_number::integer;
    IF jsonb_typeof(v_intent->'stockStatus') IS DISTINCT FROM 'string'
      OR v_intent->>'stockStatus' NOT IN ('in-stock', 'low-stock', 'out-of-stock') THEN
      RAISE EXCEPTION 'BUSINESS_ERROR: Invalid inventory adjustment stock status';
    END IF;
    IF (v_document ? 'quantity' AND v_document->'quantity' IS DISTINCT FROM v_intent->'quantity')
      OR (v_document ? 'stockStatus' AND v_document->'stockStatus' IS DISTINCT FROM v_intent->'stockStatus') THEN
      RAISE EXCEPTION 'BUSINESS_ERROR: Inventory intent must match supplied editor inventory';
    END IF;
    IF p_action IN ('create', 'publish')
      AND (v_intent->>'expectedRevision')::bigint IS DISTINCT FROM v_inventory_revision THEN
      RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'CONFLICT: Inventory changed; review adjustment before retrying';
    END IF;
    v_stock_status := CASE WHEN v_quantity IS NULL THEN v_intent->>'stockStatus'
      WHEN v_quantity = 0 THEN 'out-of-stock' WHEN v_quantity <= 5 THEN 'low-stock' ELSE 'in-stock' END;
  END IF;
  -- Keep the exact original expectedRevision in the stored draft. Saving a
  -- draft never silently rebases an adjustment against subsequent inventory.
  v_document := jsonb_set(v_document, '{inventoryIntent}', v_intent, true);

  v_document := admin_product_collection_intent_v1(p_action,p_product_id,v_document,
    p_collection_ids,v_current.draft,coalesce(v_current.membership_revision,0));
  v_collections := v_document->'_collectionIds';

  IF p_action = 'create' THEN
    INSERT INTO public.products (name, slug, category, price, quantity, stock_status, status, draft, cost_price, is_demo)
    VALUES (btrim(v_document->>'name'), btrim(v_document->>'slug'), btrim(v_document->>'category'),
      v_price, NULL, 'in-stock', 'draft', v_document, NULL, false)
    RETURNING id, admin_revision, inventory_revision
    INTO v_product_id, v_admin_revision, v_inventory_revision;
  ELSIF p_action = 'save' THEN
    UPDATE public.products SET draft = v_document, admin_revision = admin_revision + 1, updated_at = now()
    WHERE id = p_product_id RETURNING id, admin_revision, inventory_revision
    INTO v_product_id, v_admin_revision, v_inventory_revision;
  ELSE
    IF btrim(v_document->>'slug') IS DISTINCT FROM v_current.slug
      AND EXISTS (SELECT 1 FROM public.order_items WHERE slug = v_current.slug) THEN
      RAISE EXCEPTION 'BUSINESS_ERROR: Cannot rename slug referenced by an order';
    END IF;
    -- Membership-adjust locks were acquired above. Content-only publish takes
    -- no collection locks and cannot replace an independent membership edit.
    v_axes := coalesce((v_document->>'colorEnabled')::boolean, false)
      OR coalesce((v_document->>'sizeEnabled')::boolean, false);
    UPDATE public.products SET
      name = btrim(v_document->>'name'), slug = btrim(v_document->>'slug'),
      brand = nullif(v_document->>'brand', ''), sku = nullif(v_document->>'sku', ''),
      category = btrim(v_document->>'category'), price = v_price,
      compare_at_price = (v_document->>'compareAtPrice')::numeric,
      short_description = nullif(v_document->>'shortDescription', ''), description = v_document->'description',
      features = coalesce(v_document->'features', '[]'), specifications = coalesce(v_document->'specifications', '[]'),
      compatibility = coalesce(v_document->'compatibility', '[]'), in_the_box = coalesce(v_document->'inTheBox', '[]'),
      product_video = coalesce(nullif(v_document->'productVideo', 'null'), '{}') || jsonb_build_object(
        'tiktokUrl', v_document->>'tiktokUrl', 'instagramUrl', v_document->>'instagramUrl'),
      product_faq = coalesce(v_document->'productFaq', '[]'),
      quantity = CASE WHEN v_adjust THEN v_quantity ELSE quantity END,
      stock_status = CASE WHEN v_adjust THEN v_stock_status ELSE stock_status END,
      featured = coalesce((v_document->>'featured')::boolean, false), badge = nullif(v_document->>'badge', ''),
      cloudinary_images = coalesce(v_document->'cloudinaryImages', '[]'),
      cost_price = (v_document->>'costPrice')::numeric, is_demo = coalesce((v_document->>'isDemo')::boolean, false),
      color_enabled = coalesce((v_document->>'colorEnabled')::boolean, false),
      size_enabled = coalesce((v_document->>'sizeEnabled')::boolean, false),
      color_options = coalesce(v_document->'colorOptions', '[]'), size_options = coalesce(v_document->'sizeOptions', '[]'),
      addons = coalesce(v_document->'addons', '[]'), free_shipping = coalesce((v_document->>'freeShipping')::boolean, false),
      status = 'published', draft = NULL, admin_revision = admin_revision + 1, updated_at = now()
    WHERE id = p_product_id RETURNING id, admin_revision, inventory_revision, stock_status
    INTO v_product_id, v_admin_revision, v_inventory_revision, v_stock_status;

    DELETE FROM public.product_images WHERE product_id = p_product_id;
    INSERT INTO public.product_images (product_id, url, sort_order, source)
    SELECT p_product_id, image.value #>> '{}', image.ordinality::integer - 1,
      CASE WHEN image.value #>> '{}' LIKE '%supabase.co%' THEN 'supabase' ELSE 'cloudinary' END
    FROM jsonb_array_elements(coalesce(v_document->'images', '[]')) WITH ORDINALITY image(value, ordinality);

    -- Catalog writes never replace review rows or review aggregate columns.
    -- Axis variants inherit the current post-adjustment product status. Legacy
    -- manual keys retain their existing individual availability on preserve.
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'key', coalesce(v.value->>'_key', 'v' || (v.ordinality - 1)), 'name', v.value->>'name',
      'sku', v.value->>'sku', 'price', v.value->'price', 'compare_at_price', v.value->'compareAtPrice',
      'stock_status', CASE WHEN v_axes THEN v_stock_status ELSE coalesce(v.value->>'stockStatus', v_stock_status) END,
      'image_url', v.value->>'image', 'is_default', coalesce((v.value->>'isDefault')::boolean, false)
    )), '[]') INTO v_variants
    FROM jsonb_array_elements(coalesce(v_document->'variants', '[]')) WITH ORDINALITY v(value, ordinality);

    -- Keep matching IDs stable. A checkout waiting on the product lock must
    -- not resume against a deleted variant tuple for an unchanged key.
    DELETE FROM public.product_variants existing WHERE existing.product_id = p_product_id
      AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_variants) desired WHERE desired->>'key' = existing.key);
    UPDATE public.product_variants existing SET
      name = desired.name, sku = desired.sku, price = desired.price, compare_at_price = desired.compare_at_price,
      stock_status = CASE WHEN NOT v_axes AND NOT v_adjust THEN existing.stock_status ELSE desired.stock_status END,
      image_url = desired.image_url, is_default = desired.is_default
    FROM jsonb_to_recordset(v_variants) desired(key text, name text, sku text, price numeric,
      compare_at_price numeric, stock_status text, image_url text, is_default boolean)
    WHERE existing.product_id = p_product_id AND existing.key = desired.key;
    INSERT INTO public.product_variants (product_id, key, name, sku, price, compare_at_price, stock_status, image_url, is_default)
    SELECT p_product_id, desired.key, desired.name, desired.sku, desired.price, desired.compare_at_price,
      desired.stock_status, desired.image_url, desired.is_default
    FROM jsonb_to_recordset(v_variants) desired(key text, name text, sku text, price numeric,
      compare_at_price numeric, stock_status text, image_url text, is_default boolean)
    WHERE NOT EXISTS (SELECT 1 FROM public.product_variants existing WHERE existing.product_id = p_product_id AND existing.key = desired.key);

    IF v_collections IS NOT NULL THEN
      DELETE FROM public.collection_products m USING public.collections c
      WHERE m.product_id = p_product_id AND m.collection_id = c.id AND c.mode = 'manual'
        AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(v_collections) d(id) WHERE d.id = c.id::text);
      INSERT INTO public.collection_products (collection_id, product_id, sort_order)
      SELECT c.id, p_product_id, coalesce((SELECT max(m.sort_order) + 1 FROM public.collection_products m WHERE m.collection_id = c.id), 0)
      FROM public.collections c WHERE c.mode = 'manual'
        AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(v_collections) d(id) WHERE d.id = c.id::text)
      ON CONFLICT (collection_id, product_id) DO NOTHING;
    END IF;
  END IF;

  SELECT quantity, stock_status INTO v_quantity, v_stock_status FROM public.products WHERE id = v_product_id;
  RETURN jsonb_build_object('ok', true, 'id', v_product_id,
    'admin_revision', v_admin_revision::text, 'inventory_revision', v_inventory_revision::text,
    'quantity', v_quantity, 'stock_status', v_stock_status,
    'membership_revision', (SELECT membership_revision::text FROM products WHERE id=v_product_id),
    'manual_collection_ids', admin_product_editor_snapshot_v1(v_product_id)->'manual_collection_ids');
END;
$$;

REVOKE ALL ON FUNCTION public.product_inventory_revision_v2() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_write_product_v2(text, uuid, jsonb, jsonb, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_write_product_v2(text, uuid, jsonb, jsonb, bigint) TO service_role;

-- Fail closed for old deployed application versions. No legacy fallback exists.
REVOKE ALL ON FUNCTION public.admin_publish_product(uuid, jsonb, jsonb, jsonb, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_create_product_draft(jsonb, jsonb)
  FROM PUBLIC, anon, authenticated, service_role;
