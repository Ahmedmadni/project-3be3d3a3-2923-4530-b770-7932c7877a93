-- Phase 3 safety hardening: clinical rules/weights are inert until reviewed.
ALTER TABLE public.condition_symptoms
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Existing phase-2 seed/link rows keep their current behavior. New admin-created rows
-- are explicitly inserted as inactive by the UI and require a reviewer/admin to activate.

CREATE OR REPLACE FUNCTION public.clinical_rule_activation_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  activating boolean := false;
BEGIN
  IF uid IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    activating := coalesce(NEW.is_active, false);
  ELSE
    activating := coalesce(NEW.is_active, false) AND NOT coalesce(OLD.is_active, false);
  END IF;

  IF activating AND NOT public.has_any_role(uid, ARRAY['medical_reviewer','admin','super_admin']) THEN
    RAISE EXCEPTION 'CLINICAL_REVIEW_REQUIRED: only a medical reviewer or admin may activate clinical rules';
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS question_rules_activation_guard ON public.question_rules;
CREATE TRIGGER question_rules_activation_guard
BEFORE INSERT OR UPDATE OF is_active ON public.question_rules
FOR EACH ROW EXECUTE FUNCTION public.clinical_rule_activation_guard();

DROP TRIGGER IF EXISTS red_flag_rules_activation_guard ON public.red_flag_rules;
CREATE TRIGGER red_flag_rules_activation_guard
BEFORE INSERT OR UPDATE OF is_active ON public.red_flag_rules
FOR EACH ROW EXECUTE FUNCTION public.clinical_rule_activation_guard();

DROP TRIGGER IF EXISTS condition_symptoms_activation_guard ON public.condition_symptoms;
CREATE TRIGGER condition_symptoms_activation_guard
BEFORE INSERT OR UPDATE OF is_active ON public.condition_symptoms
FOR EACH ROW EXECUTE FUNCTION public.clinical_rule_activation_guard();

REVOKE EXECUTE ON FUNCTION public.clinical_rule_activation_guard() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clinical_rule_activation_guard() TO service_role;
