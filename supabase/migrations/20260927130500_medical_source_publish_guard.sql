-- Phase 3 hardening: prevent high-impact medical content from being published
-- unless it has at least one active, traceable medical source.
--
-- This trigger is intentionally separate from governance_guard so it also runs
-- when publish_content_version temporarily bypasses the normal governance guard.

CREATE OR REPLACE FUNCTION public.require_medical_source_before_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_source boolean := false;
BEGIN
  IF NEW.review_status::text <> 'published'
     OR OLD.review_status::text = 'published' THEN
    RETURN NEW;
  END IF;

  CASE TG_TABLE_NAME
    WHEN 'conditions' THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.condition_sources link
        JOIN public.medical_sources src ON src.id = link.source_id
        WHERE link.condition_id = NEW.id
          AND src.is_active = true
      ) INTO has_source;

    WHEN 'questions' THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.question_sources link
        JOIN public.medical_sources src ON src.id = link.source_id
        WHERE link.question_id = NEW.id
          AND src.is_active = true
      ) INTO has_source;

    WHEN 'red_flags' THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.red_flag_sources link
        JOIN public.medical_sources src ON src.id = link.source_id
        WHERE link.red_flag_id = NEW.id
          AND src.is_active = true
      ) INTO has_source;

    WHEN 'first_aid_topics' THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.first_aid_sources link
        JOIN public.medical_sources src ON src.id = link.source_id
        WHERE link.first_aid_topic_id = NEW.id
          AND src.is_active = true
      ) INTO has_source;

    ELSE
      RETURN NEW;
  END CASE;

  IF NOT has_source THEN
    RAISE EXCEPTION 'SOURCE_REQUIRED: % must have at least one active medical source before publication', TG_TABLE_NAME;
  END IF;

  RETURN NEW;
END
$$;

REVOKE EXECUTE ON FUNCTION public.require_medical_source_before_publish() FROM public, anon;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['conditions','questions','red_flags','first_aid_topics']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS medical_source_publish_guard ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER medical_source_publish_guard BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.require_medical_source_before_publish()',
      t
    );
  END LOOP;
END
$$;
