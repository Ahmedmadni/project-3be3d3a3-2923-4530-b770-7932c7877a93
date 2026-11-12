-- Owner-scoped maternity appointments. Run only after reviewing deployment history.
-- No patient data is sent to reminder endpoints, and this migration does not schedule jobs.
CREATE TABLE IF NOT EXISTS public.pregnancy_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  appointment_date date NOT NULL,
  appointment_time time without time zone,
  kind text NOT NULL DEFAULT 'visit' CHECK (kind IN ('visit', 'test', 'vaccination', 'other')),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 1000),
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pregnancy_appointments_owner_date_idx
  ON public.pregnancy_appointments (user_id, appointment_date, appointment_time);

ALTER TABLE public.pregnancy_appointments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.pregnancy_appointments FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pregnancy_appointments TO authenticated;
GRANT ALL ON public.pregnancy_appointments TO service_role;

DROP POLICY IF EXISTS pregnancy_appointments_owner_select ON public.pregnancy_appointments;
CREATE POLICY pregnancy_appointments_owner_select ON public.pregnancy_appointments FOR SELECT
  TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS pregnancy_appointments_owner_insert ON public.pregnancy_appointments;
CREATE POLICY pregnancy_appointments_owner_insert ON public.pregnancy_appointments FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS pregnancy_appointments_owner_update ON public.pregnancy_appointments;
CREATE POLICY pregnancy_appointments_owner_update ON public.pregnancy_appointments FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS pregnancy_appointments_owner_delete ON public.pregnancy_appointments;
CREATE POLICY pregnancy_appointments_owner_delete ON public.pregnancy_appointments FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- Import each legacy next-appointment date only when no equivalent row already exists.
INSERT INTO public.pregnancy_appointments (user_id, appointment_date, kind, title, status)
SELECT t.user_id, t.next_appointment, 'visit', 'موعد متابعة سابق', 'planned'
FROM public.pregnancy_tracking AS t
WHERE t.next_appointment IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.pregnancy_appointments AS a
    WHERE a.user_id = t.user_id
      AND a.appointment_date = t.next_appointment
      AND a.kind = 'visit'
  );
