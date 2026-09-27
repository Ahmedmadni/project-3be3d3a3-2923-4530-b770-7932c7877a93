-- Clinical publication readiness checks.
-- These checks validate structural completeness only; they do not certify clinical correctness.

CREATE OR REPLACE FUNCTION public.require_clinical_structure_before_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ready boolean := false;
  section_count integer := 0;
BEGIN
  IF NEW.review_status::text <> 'published'
     OR OLD.review_status::text = 'published' THEN
    RETURN NEW;
  END IF;

  CASE TG_TABLE_NAME
    WHEN 'conditions' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.condition_symptoms cs
        WHERE cs.condition_id = NEW.id
          AND cs.is_active = true
          AND cs.relationship_type::text IN ('supports','weak_support','contradicts')
          AND cs.weight > 0
      ) INTO ready;
      IF NOT ready THEN
        RAISE EXCEPTION 'CONDITION_RULES_REQUIRED: condition needs at least one active weighted symptom relation before publication';
      END IF;

    WHEN 'red_flags' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.red_flag_rules r
        WHERE r.red_flag_id = NEW.id
          AND r.is_active = true
      ) INTO ready;
      IF NOT ready THEN
        RAISE EXCEPTION 'RED_FLAG_RULE_REQUIRED: red flag needs at least one active rule before publication';
      END IF;

    WHEN 'questions' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.question_rules r
        WHERE r.question_id = NEW.id
          AND r.is_active = true
      ) INTO ready;
      IF NOT ready THEN
        RAISE EXCEPTION 'QUESTION_RULE_REQUIRED: question needs at least one active display rule before publication';
      END IF;

    WHEN 'first_aid_topics' THEN
      SELECT count(DISTINCT s.section_type)
      INTO section_count
      FROM public.first_aid_sections s
      WHERE s.topic_id = NEW.id
        AND s.review_status::text = 'published'
        AND nullif(btrim(s.content_ar), '') IS NOT NULL
        AND s.section_type IN ('what_is_happening','when_to_call','do_now','dont_do','while_waiting');

      IF section_count <> 5 THEN
        RAISE EXCEPTION 'FIRST_AID_SECTIONS_INCOMPLETE: all five reviewed first-aid sections must be published before the topic';
      END IF;

    ELSE
      RETURN NEW;
  END CASE;

  RETURN NEW;
END
$$;

REVOKE EXECUTE ON FUNCTION public.require_clinical_structure_before_publish() FROM public, anon;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['conditions','questions','red_flags','first_aid_topics']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS clinical_structure_publish_guard ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER clinical_structure_publish_guard BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.require_clinical_structure_before_publish()',
      t
    );
  END LOOP;
END
$$;
