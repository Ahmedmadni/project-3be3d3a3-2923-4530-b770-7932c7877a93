-- Medication Schedule Foundation
-- Records user-entered schedule times only.
-- The application does not calculate dosage, frequency, or treatment.

CREATE TABLE IF NOT EXISTS public.medication_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_id uuid NOT NULL
    REFERENCES public.user_medications(id) ON DELETE CASCADE,
  time_local time NOT NULL,
  days_of_week text[] NOT NULL
    DEFAULT ARRAY['sun','mon','tue','wed','thu','fri','sat']::text[],
  timezone text NOT NULL DEFAULT 'UTC',
  reminder_enabled boolean NOT NULL DEFAULT false,
  label text,
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT medication_schedules_days_ck CHECK (
    cardinality(days_of_week) BETWEEN 1 AND 7
    AND days_of_week <@ ARRAY[
      'sun','mon','tue','wed','thu','fri','sat'
    ]::text[]
  ),
  CONSTRAINT medication_schedules_date_order_ck CHECK (
    end_date IS NULL OR start_date IS NULL OR end_date >= start_date
  )
);

ALTER TABLE public.medication_dose_events
  ADD COLUMN IF NOT EXISTS schedule_id uuid
    REFERENCES public.medication_schedules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;

ALTER TABLE public.medication_dose_events
  DROP CONSTRAINT IF EXISTS medication_dose_events_schedule_occurrence_key;

ALTER TABLE public.medication_dose_events
  ADD CONSTRAINT medication_dose_events_schedule_occurrence_key
  UNIQUE (schedule_id, scheduled_for);

CREATE INDEX IF NOT EXISTS medication_schedules_user_medication_idx
  ON public.medication_schedules (user_id, medication_id, time_local);

CREATE INDEX IF NOT EXISTS medication_dose_events_schedule_time_idx
  ON public.medication_dose_events (schedule_id, scheduled_for DESC);

DROP TRIGGER IF EXISTS medication_schedules_updated
  ON public.medication_schedules;

CREATE TRIGGER medication_schedules_updated
BEFORE UPDATE ON public.medication_schedules
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.medication_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own medication schedules"
  ON public.medication_schedules;
CREATE POLICY "users read own medication schedules"
ON public.medication_schedules
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users insert own medication schedules"
  ON public.medication_schedules;
CREATE POLICY "users insert own medication schedules"
ON public.medication_schedules
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.user_medications m
    WHERE m.id = medication_id
      AND m.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "users update own medication schedules"
  ON public.medication_schedules;
CREATE POLICY "users update own medication schedules"
ON public.medication_schedules
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.user_medications m
    WHERE m.id = medication_id
      AND m.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "users delete own medication schedules"
  ON public.medication_schedules;
CREATE POLICY "users delete own medication schedules"
ON public.medication_schedules
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Tighten dose-event policies so scheduled events cannot reference another
-- user's schedule. Manual events may continue with schedule_id IS NULL.
DROP POLICY IF EXISTS "users insert own medication events"
  ON public.medication_dose_events;
CREATE POLICY "users insert own medication events"
ON public.medication_dose_events
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.user_medications m
    WHERE m.id = medication_id
      AND m.user_id = auth.uid()
  )
  AND (
    schedule_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.medication_schedules s
      WHERE s.id = schedule_id
        AND s.user_id = auth.uid()
        AND s.medication_id = medication_id
    )
  )
);

DROP POLICY IF EXISTS "users update own medication events"
  ON public.medication_dose_events;
CREATE POLICY "users update own medication events"
ON public.medication_dose_events
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.user_medications m
    WHERE m.id = medication_id
      AND m.user_id = auth.uid()
  )
  AND (
    schedule_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.medication_schedules s
      WHERE s.id = schedule_id
        AND s.user_id = auth.uid()
        AND s.medication_id = medication_id
    )
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.medication_schedules
TO authenticated;

GRANT ALL
ON public.medication_schedules
TO service_role;
