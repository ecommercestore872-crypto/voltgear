-- Prepared/tested in isolation only. Apply before the matching session-v2 app.
-- No credentials, legacy writers or existing commerce tables are changed.
BEGIN;

CREATE TABLE public.admin_browser_sessions (
  token_hash text PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  auth_session_id uuid NOT NULL REFERENCES auth.sessions(id) ON DELETE CASCADE,
  email text NOT NULL,
  password_fingerprint bytea NOT NULL CHECK (octet_length(password_fingerprint) = 32),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CHECK (expires_at > created_at AND expires_at <= created_at + interval '8 hours')
);
CREATE INDEX admin_browser_sessions_user ON public.admin_browser_sessions(user_id);
CREATE INDEX admin_browser_sessions_auth_session ON public.admin_browser_sessions(auth_session_id);
ALTER TABLE public.admin_browser_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_browser_sessions FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.admin_create_browser_session_v2(p_token_hash text, p_user_id uuid, p_auth_session_id uuid, p_user_updated_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user auth.users%ROWTYPE; v_auth auth.sessions%ROWTYPE; v_now timestamptz := clock_timestamp(); v_expiry timestamptz;
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Invalid session credential' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_user FROM auth.users WHERE id = p_user_id FOR SHARE;
  SELECT * INTO v_auth FROM auth.sessions WHERE id = p_auth_session_id AND user_id = p_user_id FOR SHARE;
  IF p_user_updated_at IS NULL OR v_user.updated_at IS DISTINCT FROM p_user_updated_at OR
     v_user.id IS NULL OR v_auth.id IS NULL OR v_user.deleted_at IS NOT NULL OR
     v_user.email_confirmed_at IS NULL OR coalesce(v_user.encrypted_password, '') = '' OR
     (v_user.banned_until IS NOT NULL AND v_user.banned_until > v_now) OR
     (v_auth.not_after IS NOT NULL AND v_auth.not_after <= v_now) THEN
    RAISE EXCEPTION 'Invalid authentication session' USING ERRCODE = '28000';
  END IF;
  v_expiry := least(v_now + interval '8 hours', v_auth.not_after);
  INSERT INTO public.admin_browser_sessions(token_hash, user_id, auth_session_id, email, password_fingerprint, created_at, expires_at)
    VALUES (p_token_hash, v_user.id, v_auth.id, lower(v_user.email),
      sha256(convert_to(v_user.encrypted_password, 'UTF8')), v_now, v_expiry);
  RETURN jsonb_build_object('userId', v_user.id, 'email', lower(v_user.email), 'expiresAt', v_expiry);
END;
$$;

-- A copied cookie must not revive after an account is unbanned or its email or
-- password is restored. The trigger changes only this new application's table.
CREATE FUNCTION public.admin_revoke_browser_sessions_on_identity_change_v2()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.encrypted_password IS DISTINCT FROM OLD.encrypted_password OR
     NEW.email IS DISTINCT FROM OLD.email OR NEW.banned_until IS DISTINCT FROM OLD.banned_until OR
     NEW.deleted_at IS DISTINCT FROM OLD.deleted_at OR NEW.email_confirmed_at IS DISTINCT FROM OLD.email_confirmed_at THEN
    UPDATE public.admin_browser_sessions SET revoked_at = clock_timestamp()
    WHERE user_id = NEW.id AND revoked_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER admin_revoke_browser_sessions_on_identity_change_v2
AFTER UPDATE OF encrypted_password, email, banned_until, deleted_at, email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.admin_revoke_browser_sessions_on_identity_change_v2();

CREATE FUNCTION public.admin_validate_browser_session_v2(p_token_hash text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object('userId', u.id, 'email', lower(u.email), 'expiresAt', b.expires_at)
  FROM public.admin_browser_sessions b
  JOIN auth.users u ON u.id = b.user_id
  JOIN auth.sessions s ON s.id = b.auth_session_id AND s.user_id = u.id
  WHERE b.token_hash = p_token_hash AND b.revoked_at IS NULL AND b.expires_at > clock_timestamp()
    AND u.deleted_at IS NULL AND u.email_confirmed_at IS NOT NULL
    AND (u.banned_until IS NULL OR u.banned_until <= clock_timestamp())
    AND (s.not_after IS NULL OR s.not_after > clock_timestamp())
    AND b.email = lower(u.email)
    AND b.password_fingerprint = sha256(convert_to(u.encrypted_password, 'UTF8'));
$$;

CREATE FUNCTION public.admin_revoke_browser_session_v2(p_token_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.admin_browser_sessions SET revoked_at = coalesce(revoked_at, clock_timestamp()) WHERE token_hash = p_token_hash;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_browser_session_v2(text, uuid, uuid, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_revoke_browser_sessions_on_identity_change_v2() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_validate_browser_session_v2(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_revoke_browser_session_v2(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_browser_session_v2(text, uuid, uuid, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_validate_browser_session_v2(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_revoke_browser_session_v2(text) TO service_role;
COMMIT;
