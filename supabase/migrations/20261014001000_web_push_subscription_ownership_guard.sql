-- Push endpoint ownership guard
-- Apply AFTER 20261004184500_background_push_reminders.sql.
-- Prevents one authenticated account from reassigning an existing Web Push
-- endpoint belonging to a different account. No health data is modified.
-- Same-account subscription refreshes remain supported.
--
-- IMPORTANT: the 20261004184500 migration was previously run manually in
-- production; do not change that historical file or reapply it.

CREATE OR REPLACE FUNCTION public.claim_web_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth_secret text,
  p_expiration_time bigint DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  subscription_id uuid;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF p_endpoint IS NULL OR length(btrim(p_endpoint)) = 0
     OR p_p256dh IS NULL OR length(btrim(p_p256dh)) = 0
     OR p_auth_secret IS NULL OR length(btrim(p_auth_secret)) = 0 THEN
    RAISE EXCEPTION 'INVALID_PUSH_SUBSCRIPTION';
  END IF;

  INSERT INTO public.web_push_subscriptions (
    user_id, endpoint, p256dh, auth_secret,
    expiration_time, user_agent, is_active
  )
  VALUES (
    current_user_id, p_endpoint, p_p256dh, p_auth_secret,
    p_expiration_time, p_user_agent, true
  )
  ON CONFLICT (endpoint)
  DO UPDATE SET
    p256dh = EXCLUDED.p256dh,
    auth_secret = EXCLUDED.auth_secret,
    expiration_time = EXCLUDED.expiration_time,
    user_agent = EXCLUDED.user_agent,
    is_active = true,
    updated_at = now()
  -- SECURITY BOUNDARY: never transfer an endpoint between accounts.
  WHERE public.web_push_subscriptions.user_id = EXCLUDED.user_id
  RETURNING id INTO subscription_id;

  IF subscription_id IS NULL THEN
    RAISE EXCEPTION 'PUSH_SUBSCRIPTION_OWNERSHIP_CONFLICT';
  END IF;

  RETURN subscription_id;
END
$$;

REVOKE EXECUTE
ON FUNCTION public.claim_web_push_subscription(text, text, text, bigint, text)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.claim_web_push_subscription(text, text, text, bigint, text)
TO authenticated;
