-- Review moderation is one transaction: queue state, published review,
-- product rating/count, and editable draft review data cannot diverge.

ALTER TABLE public.product_reviews
ADD COLUMN IF NOT EXISTS submission_id uuid
REFERENCES public.review_submissions(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS product_reviews_submission_uidx
ON public.product_reviews(submission_id)
WHERE submission_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_product_review_projection(p_product_id uuid)
RETURNS void AS $$
DECLARE
    v_reviews jsonb;
    v_count integer;
    v_rating numeric;
BEGIN
    SELECT
        COALESCE(jsonb_agg(
            jsonb_strip_nulls(jsonb_build_object(
                'name', pr.name,
                'rating', pr.rating,
                'date', pr.review_date,
                'comment', pr.comment,
                'reply', pr.reply,
                'verified', COALESCE(pr.verified, false),
                'image', pr.image,
                'isDemo', COALESCE(pr.is_demo, false)
            )) ORDER BY pr.review_date DESC, pr.id DESC
        ), '[]'::jsonb),
        count(*) FILTER (WHERE COALESCE(pr.is_demo, false) = false)::integer,
        round(avg(pr.rating) FILTER (
            WHERE COALESCE(pr.is_demo, false) = false AND pr.rating IS NOT NULL
        ), 2)
    INTO v_reviews, v_count, v_rating
    FROM public.product_reviews pr
    WHERE pr.product_id = p_product_id;

    UPDATE public.products
    SET review_count = COALESCE(v_count, 0),
        rating = CASE WHEN COALESCE(v_count, 0) > 0 THEN v_rating ELSE NULL END,
        draft = CASE
            WHEN draft IS NULL THEN NULL
            ELSE jsonb_set(draft, '{reviews}', v_reviews, true)
        END,
        updated_at = now()
    WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp;

-- Link pre-migration approved submissions to their published counterparts by
-- deterministic rank within identical review values. This makes deletion of
-- historical approvals correct without guessing across duplicates.
WITH submissions AS (
    SELECT
        s.id,
        s.product_id,
        s.name,
        s.comment,
        s.rating,
        row_number() OVER (
            PARTITION BY s.product_id, s.name, s.comment, s.rating
            ORDER BY s.created_at, s.id
        ) AS match_rank
    FROM public.review_submissions s
    WHERE s.status = 'approved'
      AND NOT EXISTS (
          SELECT 1
          FROM public.product_reviews linked
          WHERE linked.submission_id = s.id
      )
), reviews AS (
    SELECT
        pr.id,
        pr.product_id,
        pr.name,
        pr.comment,
        pr.rating,
        row_number() OVER (
            PARTITION BY pr.product_id, pr.name, pr.comment, pr.rating
            ORDER BY pr.review_date, pr.id
        ) AS match_rank
    FROM public.product_reviews pr
    WHERE pr.submission_id IS NULL
)
UPDATE public.product_reviews pr
SET submission_id = s.id
FROM submissions s
JOIN reviews r
  ON r.product_id = s.product_id
 AND r.name IS NOT DISTINCT FROM s.name
 AND r.comment IS NOT DISTINCT FROM s.comment
 AND r.rating IS NOT DISTINCT FROM s.rating
 AND r.match_rank = s.match_rank
WHERE pr.id = r.id;

-- Correct existing counts/averages and draft projections once on deployment.
DO $$
DECLARE
    product_row record;
BEGIN
    FOR product_row IN SELECT id FROM public.products
    LOOP
        PERFORM public.sync_product_review_projection(product_row.id);
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_moderate_review(
    p_submission_id uuid,
    p_action text,
    p_reply text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    v_submission public.review_submissions%ROWTYPE;
    v_slug text;
    v_existing_review_id uuid;
    v_now timestamptz := now();
BEGIN
    IF p_action NOT IN ('approve', 'reject') THEN
        RAISE EXCEPTION 'BUSINESS_ERROR: Invalid moderation action';
    END IF;

    SELECT * INTO v_submission
    FROM public.review_submissions
    WHERE id = p_submission_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'BUSINESS_ERROR: Review not found';
    END IF;

    SELECT slug INTO v_slug FROM public.products
    WHERE id = v_submission.product_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'BUSINESS_ERROR: Product not found';
    END IF;

    IF p_action = 'reject' THEN
        DELETE FROM public.product_reviews
        WHERE submission_id = v_submission.id;
        UPDATE public.review_submissions
        SET status = 'rejected', reply = NULLIF(left(trim(COALESCE(p_reply, '')), 1000), '')
        WHERE id = v_submission.id;
    ELSE
        -- Link a legacy published row when possible so approving an already
        -- approved pre-migration submission does not duplicate the review.
        SELECT id INTO v_existing_review_id
        FROM public.product_reviews
        WHERE product_id = v_submission.product_id
          AND submission_id IS NULL
          AND name IS NOT DISTINCT FROM v_submission.name
          AND comment IS NOT DISTINCT FROM v_submission.comment
          AND rating IS NOT DISTINCT FROM v_submission.rating
        ORDER BY id
        LIMIT 1
        FOR UPDATE;

        IF v_existing_review_id IS NOT NULL THEN
            UPDATE public.product_reviews
            SET submission_id = v_submission.id,
                reply = NULLIF(left(trim(COALESCE(p_reply, '')), 1000), '')
            WHERE id = v_existing_review_id;
        ELSE
            INSERT INTO public.product_reviews (
                product_id, submission_id, name, rating, review_date, comment,
                reply, verified, image, is_demo
            ) VALUES (
                v_submission.product_id, v_submission.id, v_submission.name,
                v_submission.rating, v_now::text, v_submission.comment,
                NULLIF(left(trim(COALESCE(p_reply, '')), 1000), ''),
                COALESCE(v_submission.verified, false), v_submission.image,
                COALESCE(v_submission.is_demo, false)
            )
            ON CONFLICT (submission_id) WHERE submission_id IS NOT NULL
            DO UPDATE SET
                name = EXCLUDED.name,
                rating = EXCLUDED.rating,
                comment = EXCLUDED.comment,
                reply = EXCLUDED.reply,
                verified = EXCLUDED.verified,
                image = EXCLUDED.image,
                is_demo = EXCLUDED.is_demo;
        END IF;

        UPDATE public.review_submissions
        SET status = 'approved', reply = NULLIF(left(trim(COALESCE(p_reply, '')), 1000), '')
        WHERE id = v_submission.id;
    END IF;

    PERFORM public.sync_product_review_projection(v_submission.product_id);
    RETURN jsonb_build_object(
        'ok', true,
        'product_id', v_submission.product_id,
        'product_slug', v_slug,
        'status', CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'rejected' END
    );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.admin_delete_review(p_submission_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_submission public.review_submissions%ROWTYPE;
    v_slug text;
BEGIN
    SELECT * INTO v_submission
    FROM public.review_submissions
    WHERE id = p_submission_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'BUSINESS_ERROR: Review not found';
    END IF;
    SELECT slug INTO v_slug FROM public.products
    WHERE id = v_submission.product_id FOR UPDATE;

    -- Linked published review cascades through submission_id.
    DELETE FROM public.review_submissions WHERE id = v_submission.id;
    PERFORM public.sync_product_review_projection(v_submission.product_id);
    RETURN jsonb_build_object(
        'ok', true,
        'product_id', v_submission.product_id,
        'product_slug', v_slug
    );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.sync_product_review_projection(uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_product_review_projection(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.admin_moderate_review(uuid, text, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_moderate_review(uuid, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.admin_delete_review(uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_review(uuid) TO service_role;
