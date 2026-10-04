-- Background Web Push Reminder Foundation
-- Push payloads are intentionally generic and contain no medication names,
-- doses, diagnoses, or other health details.

CREATE TABLE IF NOT EXISTS public.web_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth_secret text NOT NULL,
  expiration_time bigint,
  user_agent text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.medication_reminder_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_id uuid NOT NULL
    REFERENCES public.medication_schedules(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL
    REFERENCES public.web_push_subscriptions(id) ON DELETE CASCADE,
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sent','failed')),
  provider_status integer,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  UNIQUE (schedule_id, subscription_id, scheduled_for)
);

CREATE INDEX IF NOT EXISTS web_push_subscriptions_user_active_idx
  ON public.web_push_subscriptions (user_id, is_active);

CREATE INDEX IF NOT EXISTS medication_reminder_deliveries_schedule_time_idx
  ON public.medication_reminder_deliveries (schedule_id, scheduled_for DESC);

CREATE INDEX IF NOT EXISTS medication_reminder_deliveries_user_time_idx
  ON public.medication_reminder_deliveries (user_id, scheduled_for DESC);

DROP TRIGGER IF EXISTS web_push_subscriptions_updated
  ON public.web_push_subscriptions;

CREATE TRIGGER web_push_subscriptions_updated
BEFORE UPDATE ON public.web_push_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.web_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_reminder_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own push subscriptions"
  ON public.web_push_subscriptions;
CREATE POLICY "users read own push subscriptions"
ON public.web_push_subscriptions
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users insert own push subscriptions"
  ON public.web_push_subscriptions;
CREATE POLICY "users insert own push subscriptions"
ON public.web_push_subscriptions
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users update own push subscriptions"
  ON public.web_push_subscriptions;
CREATE POLICY "users update own push subscriptions"
ON public.web_push_subscriptions
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users delete own push subscriptions"
  ON public.web_push_subscriptions;
CREATE POLICY "users delete own push subscriptions"
ON public.web_push_subscriptions
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users read own reminder deliveries"
  ON public.medication_reminder_deliveries;
CREATE POLICY "users read own reminder deliveries"
ON public.medication_reminder_deliveries
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.web_push_subscriptions
TO authenticated;

GRANT SELECT
ON public.medication_reminder_deliveries
TO authenticated;

GRANT ALL
ON public.web_push_subscriptions,
   public.medication_reminder_deliveries
TO service_role;
