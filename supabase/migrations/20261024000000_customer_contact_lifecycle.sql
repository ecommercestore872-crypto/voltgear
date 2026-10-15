-- Auditable support workflow, newsletter consent lifecycle, and consistent
-- customer identity matching. All mutation functions are service-role only.

ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

CREATE TABLE IF NOT EXISTS public.contact_submission_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.contact_submissions(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('new', 'read', 'closed')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_submission_events_submission_created_idx
  ON public.contact_submission_events (submission_id, created_at DESC);
ALTER TABLE public.contact_submission_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.admin_update_contact_submission(
  p_id uuid,
  p_status text DEFAULT NULL,
  p_admin_note text DEFAULT NULL,
  p_set_note boolean DEFAULT false
) RETURNS SETOF public.contact_submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.contact_submissions%ROWTYPE;
  v_note text;
BEGIN
  IF p_status IS NOT NULL AND p_status NOT IN ('new', 'read', 'closed') THEN
    RAISE EXCEPTION 'invalid status' USING ERRCODE = '22023';
  END IF;
  IF p_set_note AND length(COALESCE(p_admin_note, '')) > 2000 THEN
    RAISE EXCEPTION 'admin note is too long' USING ERRCODE = '22001';
  END IF;

  SELECT * INTO v_row FROM public.contact_submissions WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  v_note := NULLIF(btrim(COALESCE(p_admin_note, '')), '');

  UPDATE public.contact_submissions
  SET status = COALESCE(p_status, status),
      admin_note = CASE WHEN p_set_note THEN v_note ELSE admin_note END,
      closed_at = CASE
        WHEN COALESCE(p_status, status) = 'closed' THEN COALESCE(closed_at, now())
        ELSE NULL
      END,
      updated_at = now()
  WHERE id = p_id
  RETURNING * INTO v_row;

  INSERT INTO public.contact_submission_events (submission_id, status, admin_note)
  VALUES (v_row.id, v_row.status, v_row.admin_note);
  RETURN NEXT v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_contact_submission(uuid, text, text, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_contact_submission(uuid, text, text, boolean)
  TO service_role;

ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'subscribed'
    CHECK (status IN ('subscribed', 'unsubscribed')),
  ADD COLUMN IF NOT EXISTS consent_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS newsletter_subscribers_status_created_idx
  ON public.newsletter_subscribers (status, created_at DESC);

CREATE OR REPLACE FUNCTION public.subscribe_newsletter(p_email text, p_source text)
RETURNS TABLE(id uuid, created boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_inserted uuid;
BEGIN
  INSERT INTO public.newsletter_subscribers (
    email, email_normalized, source, status, consent_at, unsubscribed_at, updated_at
  ) VALUES (
    lower(btrim(p_email)), lower(btrim(p_email)), p_source,
    'subscribed', now(), NULL, now()
  )
  ON CONFLICT (email_normalized) DO NOTHING
  RETURNING newsletter_subscribers.id INTO v_inserted;

  IF v_inserted IS NOT NULL THEN
    id := v_inserted;
    created := true;
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE public.newsletter_subscribers SET
    email = lower(btrim(p_email)),
    source = p_source,
    status = 'subscribed',
    consent_at = now(),
    unsubscribed_at = NULL,
    updated_at = now()
  WHERE email_normalized = lower(btrim(p_email))
  RETURNING newsletter_subscribers.id INTO id;
  created := false;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unsubscribe_newsletter(p_id uuid)
RETURNS SETOF public.newsletter_subscribers
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.newsletter_subscribers
  SET status = 'unsubscribed', unsubscribed_at = now(), updated_at = now()
  WHERE id = p_id
  RETURNING *;
$$;

REVOKE ALL ON FUNCTION public.subscribe_newsletter(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.subscribe_newsletter(text, text) TO service_role;
REVOKE ALL ON FUNCTION public.admin_unsubscribe_newsletter(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unsubscribe_newsletter(uuid) TO service_role;

-- Prefer normalized mobile identity so repeat buyers who update their email do
-- not split into separate CRM rows. Latest values remain authoritative.
CREATE OR REPLACE VIEW public.admin_customer_rollups
WITH (security_invoker = true) AS
WITH base AS (
  SELECT o.order_id, o.created_at,
    NULLIF(lower(btrim(o.customer->>'email')), '') AS email,
    NULLIF(btrim(o.customer->>'name'), '') AS name,
    regexp_replace(COALESCE(o.customer->>'phone', ''), '[^0-9]', '', 'g') AS phone_digits
  FROM public.orders o WHERE COALESCE(o.is_demo, false) = false
), normalized AS (
  SELECT *, CASE
    WHEN length(phone_digits) = 10 AND phone_digits LIKE '3%' THEN '+92' || phone_digits
    WHEN length(phone_digits) = 11 AND phone_digits LIKE '03%' THEN '+92' || substr(phone_digits, 2)
    WHEN length(phone_digits) = 12 AND phone_digits LIKE '923%' THEN '+' || phone_digits
    WHEN length(phone_digits) = 13 AND phone_digits LIKE '00923%' THEN '+' || substr(phone_digits, 3)
    ELSE NULL END AS normalized_phone
  FROM base
)
SELECT COALESCE(normalized_phone, email, order_id) AS customer_key,
  max(created_at) AS last_order_at, count(*)::integer AS order_count,
  (array_agg(order_id ORDER BY created_at DESC))[1] AS last_order_id,
  (array_agg(COALESCE(name, '—') ORDER BY created_at DESC))[1] AS name,
  (array_agg(email ORDER BY created_at DESC) FILTER (WHERE email IS NOT NULL))[1] AS email,
  (array_agg(normalized_phone ORDER BY created_at DESC) FILTER (WHERE normalized_phone IS NOT NULL))[1] AS phone
FROM normalized GROUP BY 1;
