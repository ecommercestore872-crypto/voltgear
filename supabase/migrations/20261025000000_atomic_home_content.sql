-- Atomic homepage composition. Prevents partially replaced product rails,
-- half-applied ordering, and concurrent hero publishes beyond the limit.

CREATE OR REPLACE FUNCTION public.admin_save_homepage_section(
  p_id uuid,
  p_doc jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid := p_id;
  v_source text := COALESCE(p_doc->>'sourceType', '');
  v_layout text := COALESCE(p_doc->>'layout', '');
  v_product_ids uuid[];
BEGIN
  IF btrim(COALESCE(p_doc->>'title', '')) = '' THEN
    RAISE EXCEPTION 'section title is required' USING ERRCODE = '22023';
  END IF;
  IF v_source NOT IN ('manual', 'category', 'newest', 'sale')
     OR v_layout NOT IN ('grid', 'carousel') THEN
    RAISE EXCEPTION 'invalid section source or layout' USING ERRCODE = '22023';
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO public.homepage_sections (
      title, subtitle, slug, source_type, category_id, product_limit, layout,
      show_view_all, view_all_href, is_active, sort_order
    ) VALUES (
      btrim(p_doc->>'title'), NULLIF(btrim(p_doc->>'subtitle'), ''), p_doc->>'slug',
      v_source, NULLIF(btrim(p_doc->>'categoryId'), ''), (p_doc->>'productLimit')::integer,
      v_layout, COALESCE((p_doc->>'showViewAll')::boolean, true),
      NULLIF(btrim(p_doc->>'viewAllHref'), ''), COALESCE((p_doc->>'isActive')::boolean, true),
      COALESCE((p_doc->>'sortOrder')::integer, 1)
    ) RETURNING id INTO v_id;
  ELSE
    UPDATE public.homepage_sections SET
      title = btrim(p_doc->>'title'), subtitle = NULLIF(btrim(p_doc->>'subtitle'), ''),
      slug = p_doc->>'slug', source_type = v_source,
      category_id = NULLIF(btrim(p_doc->>'categoryId'), ''),
      product_limit = (p_doc->>'productLimit')::integer, layout = v_layout,
      show_view_all = COALESCE((p_doc->>'showViewAll')::boolean, true),
      view_all_href = NULLIF(btrim(p_doc->>'viewAllHref'), ''),
      is_active = COALESCE((p_doc->>'isActive')::boolean, true),
      sort_order = COALESCE((p_doc->>'sortOrder')::integer, sort_order), updated_at = now()
    WHERE id = v_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'homepage section not found' USING ERRCODE = 'P0002'; END IF;
  END IF;

  DELETE FROM public.homepage_section_products WHERE section_id = v_id;
  IF v_source = 'manual' THEN
    SELECT COALESCE(array_agg(value::uuid ORDER BY ordinality), ARRAY[]::uuid[])
      INTO v_product_ids
    FROM jsonb_array_elements_text(COALESCE(p_doc->'manualProductIds', '[]'::jsonb))
      WITH ORDINALITY AS ids(value, ordinality);

    INSERT INTO public.homepage_section_products(section_id, product_id, sort_order)
    SELECT v_id, product_id, ordinality::integer
    FROM unnest(v_product_ids) WITH ORDINALITY AS products(product_id, ordinality);
  END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reorder_homepage_sections(p_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF cardinality(p_ids) <> (SELECT count(*) FROM public.homepage_sections)
     OR cardinality(p_ids) <> (SELECT count(DISTINCT id) FROM unnest(p_ids) AS ids(id)) THEN
    RAISE EXCEPTION 'ordered ids must contain every section exactly once' USING ERRCODE = '22023';
  END IF;
  UPDATE public.homepage_sections s
  SET sort_order = ordered.position, updated_at = now()
  FROM unnest(p_ids) WITH ORDINALITY AS ordered(id, position)
  WHERE s.id = ordered.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reorder_hero_slides(p_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF cardinality(p_ids) <> (SELECT count(*) FROM public.hero_slides)
     OR cardinality(p_ids) <> (SELECT count(DISTINCT id) FROM unnest(p_ids) AS ids(id)) THEN
    RAISE EXCEPTION 'ordered ids must contain every slide exactly once' USING ERRCODE = '22023';
  END IF;
  UPDATE public.hero_slides s
  SET sort_order = ordered.position - 1, updated_at = now()
  FROM unnest(p_ids) WITH ORDINALITY AS ordered(id, position)
  WHERE s.id = ordered.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_publish_hero_slide(p_id uuid, p_max integer DEFAULT 8)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_row public.hero_slides%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('hero-slide-publish'));
  SELECT * INTO v_row FROM public.hero_slides WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF btrim(COALESCE(v_row.image_url, '')) = '' OR v_row.product_id IS NULL THEN
    RAISE EXCEPTION 'slide requires image and product' USING ERRCODE = '22023';
  END IF;
  IF (SELECT count(*) FROM public.hero_slides WHERE status = 'published' AND id <> p_id) >= p_max THEN
    RAISE EXCEPTION 'maximum published hero slides reached' USING ERRCODE = '23514';
  END IF;
  UPDATE public.hero_slides SET status = 'published', updated_at = now() WHERE id = p_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_homepage_section(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_reorder_homepage_sections(uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_reorder_hero_slides(uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_publish_hero_slide(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_homepage_section(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_reorder_homepage_sections(uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_reorder_hero_slides(uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_publish_hero_slide(uuid, integer) TO service_role;
