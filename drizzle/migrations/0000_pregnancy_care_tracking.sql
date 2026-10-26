CREATE TABLE public.pregnancy_tracking (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL UNIQUE,
 last_period date NOT NULL,
 clinician_due_date date,
 next_appointment date,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pregnancy_tracking TO authenticated;
GRANT ALL ON public.pregnancy_tracking TO service_role;
ALTER TABLE public.pregnancy_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY pregnancy_tracking_owner ON public.pregnancy_tracking FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TABLE public.pregnancy_daily_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 entry_date date NOT NULL,
 mood text NOT NULL DEFAULT 'okay' CHECK (mood IN ('good','okay','tired')),
 symptoms text[] NOT NULL DEFAULT '{}',
 notes text NOT NULL DEFAULT '' CHECK (length(notes) <= 2000),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id, entry_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pregnancy_daily_entries TO authenticated;
GRANT ALL ON public.pregnancy_daily_entries TO service_role;
ALTER TABLE public.pregnancy_daily_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY pregnancy_entries_owner ON public.pregnancy_daily_entries FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE FUNCTION public.validate_pregnancy_dates() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF TG_TABLE_NAME = 'pregnancy_tracking' THEN
  IF NEW.last_period > CURRENT_DATE OR NEW.last_period < CURRENT_DATE - 301 THEN RAISE EXCEPTION 'Invalid pregnancy start date'; END IF;
  IF NEW.clinician_due_date IS NOT NULL AND (NEW.clinician_due_date < CURRENT_DATE - 21 OR NEW.clinician_due_date > CURRENT_DATE + 280) THEN RAISE EXCEPTION 'Invalid estimated due date'; END IF;
  NEW.updated_at = now();
 ELSE
  IF NEW.entry_date > CURRENT_DATE THEN RAISE EXCEPTION 'Daily entry cannot be in the future'; END IF;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER validate_pregnancy_tracking BEFORE INSERT OR UPDATE ON public.pregnancy_tracking FOR EACH ROW EXECUTE FUNCTION public.validate_pregnancy_dates();
CREATE TRIGGER validate_pregnancy_entry BEFORE INSERT OR UPDATE ON public.pregnancy_daily_entries FOR EACH ROW EXECUTE FUNCTION public.validate_pregnancy_dates();