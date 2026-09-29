-- Expand the symptom vocabulary needed by the starter condition pack.
-- SAFETY: new symptoms and new condition links are inactive drafts.
-- This migration does not publish medical content.

-- ---------------------------------------------------------------------------
-- Add symptom-level source traceability.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.symptom_sources (
  symptom_id uuid NOT NULL REFERENCES public.symptoms(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.medical_sources(id) ON DELETE CASCADE,
  PRIMARY KEY (symptom_id, source_id)
);

GRANT SELECT ON public.symptom_sources TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.symptom_sources TO authenticated;
GRANT ALL ON public.symptom_sources TO service_role;
ALTER TABLE public.symptom_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read" ON public.symptom_sources;
CREATE POLICY "public read" ON public.symptom_sources
FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin write" ON public.symptom_sources;
CREATE POLICY "admin write" ON public.symptom_sources
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Require a traceable active source before a symptom can be published.
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
    WHEN 'symptoms' THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.symptom_sources link
        JOIN public.medical_sources src ON src.id = link.source_id
        WHERE link.symptom_id = NEW.id
          AND src.is_active = true
      ) INTO has_source;

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

DROP TRIGGER IF EXISTS medical_source_publish_guard ON public.symptoms;
CREATE TRIGGER medical_source_publish_guard
BEFORE UPDATE ON public.symptoms
FOR EACH ROW EXECUTE FUNCTION public.require_medical_source_before_publish();

-- ---------------------------------------------------------------------------
-- Supporting sources checked on 2026-09-29.
-- ---------------------------------------------------------------------------

INSERT INTO public.medical_sources (
  title, organization, url, source_type, language, country,
  organization_type, last_verified_at, notes, is_active
)
SELECT
  'Common cold',
  'NHS',
  'https://www.nhs.uk/conditions/common-cold/',
  'government'::public.source_type,
  'en',
  'GB',
  'government',
  '2026-09-29T04:25:00Z'::timestamptz,
  'Supports runny/blocked nose, sneezing, sore throat and muscle aches. Re-check before publication.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.medical_sources
  WHERE url = 'https://www.nhs.uk/conditions/common-cold/'
);

INSERT INTO public.medical_sources (
  title, organization, url, source_type, language, country,
  organization_type, last_verified_at, notes, is_active
)
SELECT
  'Migraine',
  'NHS',
  'https://www.nhs.uk/conditions/migraine/',
  'government'::public.source_type,
  'en',
  'GB',
  'government',
  '2026-09-29T04:25:00Z'::timestamptz,
  'Supports sensitivity to light and sound as migraine-associated symptoms. Re-check before publication.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.medical_sources
  WHERE url = 'https://www.nhs.uk/conditions/migraine/'
);

-- ---------------------------------------------------------------------------
-- Inactive draft symptoms.
-- ---------------------------------------------------------------------------

INSERT INTO public.symptoms (
  code, name_ar, name_en, description_ar, description_en,
  category, body_system, is_red_flag_candidate, is_active,
  sort_order, is_demo, review_status, change_reason, translation_status
)
SELECT * FROM (VALUES
  (
    'runny_nose',
    'سيلان الأنف',
    'Runny nose',
    'خروج إفرازات من الأنف بدرجات مختلفة. قد يظهر مع نزلات البرد أو أسباب أخرى، ولا يحدد السبب وحده.',
    'Nasal discharge of varying amounts. It may occur with a common cold or other causes and is not diagnostic on its own.',
    'respiratory',
    'upper_respiratory',
    false, false, 101, false,
    'draft'::public.review_status,
    'Starter symptom vocabulary expansion; requires medical review before activation.',
    'not_started'::public.translation_status
  ),
  (
    'sore_throat',
    'التهاب أو ألم الحلق',
    'Sore throat',
    'ألم أو تهيج في الحلق قد يزداد مع البلع. له أسباب متعددة ولا يحدد تشخيصًا بمفرده.',
    'Pain or irritation in the throat that may worsen with swallowing. It has many possible causes and is not diagnostic by itself.',
    'respiratory',
    'upper_respiratory',
    false, false, 102, false,
    'draft'::public.review_status,
    'Starter symptom vocabulary expansion; requires medical review before activation.',
    'not_started'::public.translation_status
  ),
  (
    'nasal_congestion',
    'احتقان أو انسداد الأنف',
    'Nasal congestion',
    'إحساس بانسداد الأنف أو صعوبة مرور الهواء عبره. قد يظهر مع نزلات البرد أو حالات أخرى.',
    'A blocked or stuffy feeling in the nose with reduced airflow. It may occur with a common cold or other conditions.',
    'respiratory',
    'upper_respiratory',
    false, false, 103, false,
    'draft'::public.review_status,
    'Starter symptom vocabulary expansion; requires medical review before activation.',
    'not_started'::public.translation_status
  ),
  (
    'sneezing',
    'العطاس',
    'Sneezing',
    'اندفاع مفاجئ ولا إرادي للهواء عبر الأنف والفم. قد يحدث مع نزلات البرد أو الحساسية أو مهيجات أخرى.',
    'A sudden involuntary expulsion of air through the nose and mouth. It may occur with colds, allergies or other irritants.',
    'respiratory',
    'upper_respiratory',
    false, false, 104, false,
    'draft'::public.review_status,
    'Starter symptom vocabulary expansion; requires medical review before activation.',
    'not_started'::public.translation_status
  ),
  (
    'body_aches',
    'آلام الجسم أو العضلات',
    'Body or muscle aches',
    'ألم أو وجع عام في العضلات أو الجسم قد يصاحب بعض العدوى أو المجهود أو أسباب أخرى.',
    'General muscle or body aching that can occur with some infections, exertion or other causes.',
    'general',
    'musculoskeletal',
    false, false, 105, false,
    'draft'::public.review_status,
    'Starter symptom vocabulary expansion; requires medical review before activation.',
    'not_started'::public.translation_status
  ),
  (
    'light_sensitivity',
    'الحساسية للضوء',
    'Sensitivity to light',
    'انزعاج أو زيادة الأعراض عند التعرض للضوء. قد يرتبط بالصداع النصفي أو حالات أخرى.',
    'Discomfort or worsening symptoms with light exposure. It may be associated with migraine or other conditions.',
    'neurological',
    'nervous_system',
    false, false, 106, false,
    'draft'::public.review_status,
    'Starter symptom vocabulary expansion; requires medical review before activation.',
    'not_started'::public.translation_status
  ),
  (
    'sound_sensitivity',
    'الحساسية للصوت',
    'Sensitivity to sound',
    'انزعاج أو زيادة الأعراض مع الأصوات، وقد يرتبط بالصداع النصفي أو حالات أخرى.',
    'Discomfort or worsening symptoms with sound, which may be associated with migraine or other conditions.',
    'neurological',
    'nervous_system',
    false, false, 107, false,
    'draft'::public.review_status,
    'Starter symptom vocabulary expansion; requires medical review before activation.',
    'not_started'::public.translation_status
  )
) AS v(
  code, name_ar, name_en, description_ar, description_en,
  category, body_system, is_red_flag_candidate, is_active,
  sort_order, is_demo, review_status, change_reason, translation_status
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.symptoms s WHERE s.code = v.code
);

-- ---------------------------------------------------------------------------
-- Source links for the new symptoms.
-- ---------------------------------------------------------------------------

INSERT INTO public.symptom_sources (symptom_id, source_id)
SELECT symptom.id, source.id
FROM public.symptoms symptom
JOIN public.medical_sources source
  ON source.url IN (
    'https://www.moh.gov.sa/healthawareness/educationalcontent/diseases/infectious/pages/common-cold.aspx',
    'https://www.nhs.uk/conditions/common-cold/'
  )
WHERE symptom.code IN ('runny_nose','sore_throat','sneezing','body_aches')
ON CONFLICT DO NOTHING;

INSERT INTO public.symptom_sources (symptom_id, source_id)
SELECT symptom.id, source.id
FROM public.symptoms symptom
JOIN public.medical_sources source
  ON source.url = 'https://www.nhs.uk/conditions/common-cold/'
WHERE symptom.code = 'nasal_congestion'
ON CONFLICT DO NOTHING;

INSERT INTO public.symptom_sources (symptom_id, source_id)
SELECT symptom.id, source.id
FROM public.symptoms symptom
JOIN public.medical_sources source
  ON source.url IN (
    'https://www.moh.gov.sa/healthawareness/educationalcontent/diseases/nervous-system/pages/migraine.aspx',
    'https://www.nhs.uk/conditions/migraine/'
  )
WHERE symptom.code IN ('light_sensitivity','sound_sensitivity')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Improve the inactive condition drafts. These links remain inactive.
-- ---------------------------------------------------------------------------

INSERT INTO public.condition_symptoms (
  condition_id, symptom_id, relationship_type, weight,
  is_core_symptom, is_demo, is_active
)
SELECT condition.id, symptom.id, v.relationship_type::public.relationship_type,
       v.weight, v.is_core, false, false
FROM (VALUES
  ('common_cold', 'runny_nose', 'supports', 1.0::numeric, true),
  ('common_cold', 'sore_throat', 'supports', 1.0::numeric, true),
  ('common_cold', 'nasal_congestion', 'supports', 1.0::numeric, false),
  ('common_cold', 'sneezing', 'supports', 1.0::numeric, true),
  ('common_cold', 'body_aches', 'weak_support', 1.0::numeric, false),
  ('migraine', 'light_sensitivity', 'supports', 1.0::numeric, true),
  ('migraine', 'sound_sensitivity', 'supports', 1.0::numeric, true)
) AS v(condition_code, symptom_code, relationship_type, weight, is_core)
JOIN public.conditions condition ON condition.code = v.condition_code
JOIN public.symptoms symptom ON symptom.code = v.symptom_code
ON CONFLICT (condition_id, symptom_id) DO NOTHING;
