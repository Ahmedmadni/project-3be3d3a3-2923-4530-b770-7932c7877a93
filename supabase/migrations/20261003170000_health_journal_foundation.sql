-- Health Journal + Medication Tracking Foundation
-- User-owned wellness/history data only.
-- This migration does NOT prescribe medication, change therapy, or infer diagnosis.

CREATE TABLE IF NOT EXISTS public.health_journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  entry_type text NOT NULL DEFAULT 'general'
    CHECK (entry_type IN ('general','symptom_note','mood','care_note')),
  title text,
  note text NOT NULL CHECK (length(btrim(note)) > 0),
  mood_score smallint CHECK (mood_score BETWEEN 1 AND 5),
  energy_score smallint CHECK (energy_score BETWEEN 1 AND 5),
  tags text[] NOT NULL DEFAULT '{}'::text[],
  related_symptom_session_id uuid
    REFERENCES public.symptom_sessions(id) ON DELETE SET NULL,
  related_measurement_reading_id uuid
    REFERENCES public.measurement_readings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  dose_text text,
  schedule_text text,
  instructions_text text,
  start_date date,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_medications_date_order_ck CHECK (
    end_date IS NULL OR start_date IS NULL OR end_date >= start_date
  )
);

CREATE TABLE IF NOT EXISTS public.medication_dose_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_id uuid NOT NULL
    REFERENCES public.user_medications(id) ON DELETE CASCADE,
  event_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('taken','skipped')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS health_journal_entries_user_time_idx
  ON public.health_journal_entries (user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS user_medications_user_active_idx
  ON public.user_medications (user_id, is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS medication_dose_events_user_time_idx
  ON public.medication_dose_events (user_id, event_at DESC);

CREATE INDEX IF NOT EXISTS medication_dose_events_medication_time_idx
  ON public.medication_dose_events (medication_id, event_at DESC);

DROP TRIGGER IF EXISTS health_journal_entries_updated
  ON public.health_journal_entries;
CREATE TRIGGER health_journal_entries_updated
BEFORE UPDATE ON public.health_journal_entries
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS user_medications_updated
  ON public.user_medications;
CREATE TRIGGER user_medications_updated
BEFORE UPDATE ON public.user_medications
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.health_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_dose_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own journal entries"
  ON public.health_journal_entries;
CREATE POLICY "users read own journal entries"
ON public.health_journal_entries
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users insert own journal entries"
  ON public.health_journal_entries;
CREATE POLICY "users insert own journal entries"
ON public.health_journal_entries
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users update own journal entries"
  ON public.health_journal_entries;
CREATE POLICY "users update own journal entries"
ON public.health_journal_entries
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users delete own journal entries"
  ON public.health_journal_entries;
CREATE POLICY "users delete own journal entries"
ON public.health_journal_entries
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users read own medications"
  ON public.user_medications;
CREATE POLICY "users read own medications"
ON public.user_medications
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users insert own medications"
  ON public.user_medications;
CREATE POLICY "users insert own medications"
ON public.user_medications
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users update own medications"
  ON public.user_medications;
CREATE POLICY "users update own medications"
ON public.user_medications
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users delete own medications"
  ON public.user_medications;
CREATE POLICY "users delete own medications"
ON public.user_medications
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users read own medication events"
  ON public.medication_dose_events;
CREATE POLICY "users read own medication events"
ON public.medication_dose_events
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

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
);

DROP POLICY IF EXISTS "users delete own medication events"
  ON public.medication_dose_events;
CREATE POLICY "users delete own medication events"
ON public.medication_dose_events
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.health_journal_entries,
   public.user_medications,
   public.medication_dose_events
TO authenticated;

GRANT ALL
ON public.health_journal_entries,
   public.user_medications,
   public.medication_dose_events
TO service_role;
