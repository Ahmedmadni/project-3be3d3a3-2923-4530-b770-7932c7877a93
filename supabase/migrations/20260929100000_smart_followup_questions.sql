-- Smart follow-up question foundation.
-- SAFETY:
--   * New questions, new rules, new symptom and all new matching links are inactive drafts.
--   * Clarifier answers may improve condition matching only after review/activation.
--   * Clarifier-confirmed symptoms are NOT used by the red-flag engine.

ALTER TABLE public.question_rules
  ADD COLUMN IF NOT EXISTS confirms_symptom_id uuid
  REFERENCES public.symptoms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS question_rules_confirms_symptom_idx
  ON public.question_rules(confirms_symptom_id)
  WHERE confirms_symptom_id IS NOT NULL;

-- Strengthen activation of smart clarifier rules. Existing clinical rules are not
-- affected unless they transition from inactive -> active.
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

  IF activating
     AND TG_TABLE_NAME = 'question_rules'
     AND NEW.confirms_symptom_id IS NOT NULL THEN

    IF NOT EXISTS (
      SELECT 1
      FROM public.questions q
      WHERE q.id = NEW.question_id
        AND q.is_active = true
        AND q.review_status = 'published'
    ) THEN
      RAISE EXCEPTION 'CLARIFIER_QUESTION_NOT_PUBLISHED: publish and activate the question first';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.symptoms s
      WHERE s.id = NEW.confirms_symptom_id
        AND s.is_active = true
        AND s.review_status = 'published'
    ) THEN
      RAISE EXCEPTION 'CLARIFIER_SYMPTOM_NOT_PUBLISHED: publish and activate the confirmed symptom first';
    END IF;

    IF NEW.condition_id IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM public.conditions c
      WHERE c.id = NEW.condition_id
        AND c.is_active = true
        AND c.review_status = 'published'
    ) THEN
      RAISE EXCEPTION 'CLARIFIER_CONDITION_NOT_PUBLISHED: publish and activate the candidate condition first';
    END IF;
  END IF;

  RETURN NEW;
END
$$;

REVOKE EXECUTE ON FUNCTION public.clinical_rule_activation_guard() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clinical_rule_activation_guard() TO service_role;

-- ---------------------------------------------------------------------------
-- One additional dehydration symptom needed for a useful clarifier.
-- ---------------------------------------------------------------------------

INSERT INTO public.symptoms (
  code, name_ar, name_en, description_ar, description_en,
  category, body_system, is_red_flag_candidate, is_active,
  sort_order, is_demo, review_status, change_reason, translation_status
)
SELECT
  'reduced_dark_urine',
  'قلة البول أو غمق لونه',
  'Reduced or dark urine',
  'التبول أقل من المعتاد أو بول داكن أو مركز. قد يظهر مع الجفاف أو أسباب أخرى ولا يحدد السبب بمفرده.',
  'Urinating less often than usual or having dark/concentrated urine. It may occur with dehydration or other causes and is not diagnostic by itself.',
  'general',
  'urinary',
  false,
  false,
  108,
  false,
  'draft'::public.review_status,
  'Starter smart-question symptom; requires medical review before activation.',
  'not_started'::public.translation_status
WHERE NOT EXISTS (
  SELECT 1 FROM public.symptoms WHERE code = 'reduced_dark_urine'
);

INSERT INTO public.symptom_sources (symptom_id, source_id)
SELECT symptom.id, source.id
FROM public.symptoms symptom
JOIN public.medical_sources source
  ON source.url IN (
    'https://www.moh.gov.sa/healthawareness/pilgrims-health/pages/dehydration.aspx',
    'https://www.nhs.uk/conditions/dehydration/'
  )
WHERE symptom.code = 'reduced_dark_urine'
ON CONFLICT DO NOTHING;

INSERT INTO public.condition_symptoms (
  condition_id, symptom_id, relationship_type, weight,
  is_core_symptom, is_demo, is_active
)
SELECT condition.id, symptom.id, 'supports'::public.relationship_type,
       1.0::numeric, true, false, false
FROM public.conditions condition
JOIN public.symptoms symptom ON symptom.code = 'reduced_dark_urine'
WHERE condition.code = 'dehydration'
ON CONFLICT (condition_id, symptom_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Source-backed clarifier questions. All remain inactive drafts.
-- ---------------------------------------------------------------------------

INSERT INTO public.questions (
  code, question_ar, question_en, question_type, category,
  is_active, sort_order, is_demo, review_status,
  change_reason, translation_status
)
SELECT * FROM (VALUES
  (
    'clarify_migraine_light',
    'أثناء الصداع، هل يزعجك الضوء أكثر من المعتاد؟',
    'During the headache, does light bother you more than usual?',
    'yes_no_unsure'::public.question_type,
    'neurological',
    false, 201, false, 'draft'::public.review_status,
    'Source-backed clarifier draft; requires medical review before activation.',
    'not_started'::public.translation_status
  ),
  (
    'clarify_migraine_sound',
    'أثناء الصداع، هل تزعجك الأصوات أكثر من المعتاد؟',
    'During the headache, do sounds bother you more than usual?',
    'yes_no_unsure'::public.question_type,
    'neurological',
    false, 202, false, 'draft'::public.review_status,
    'Source-backed clarifier draft; requires medical review before activation.',
    'not_started'::public.translation_status
  ),
  (
    'clarify_migraine_nausea',
    'هل يصاحب الصداع شعور بالغثيان؟',
    'Is the headache accompanied by nausea?',
    'yes_no_unsure'::public.question_type,
    'neurological',
    false, 203, false, 'draft'::public.review_status,
    'Source-backed clarifier draft; requires medical review before activation.',
    'not_started'::public.translation_status
  ),
  (
    'clarify_cold_runny_nose',
    'هل لديك سيلان في الأنف؟',
    'Do you have a runny nose?',
    'yes_no_unsure'::public.question_type,
    'respiratory',
    false, 204, false, 'draft'::public.review_status,
    'Source-backed clarifier draft; requires medical review before activation.',
    'not_started'::public.translation_status
  ),
  (
    'clarify_cold_sore_throat',
    'هل لديك ألم أو تهيج في الحلق؟',
    'Do you have a sore or irritated throat?',
    'yes_no_unsure'::public.question_type,
    'respiratory',
    false, 205, false, 'draft'::public.review_status,
    'Source-backed clarifier draft; requires medical review before activation.',
    'not_started'::public.translation_status
  ),
  (
    'clarify_dehydration_thirst',
    'هل تشعر بعطش شديد أو غير معتاد؟',
    'Do you feel unusually or extremely thirsty?',
    'yes_no_unsure'::public.question_type,
    'general',
    false, 206, false, 'draft'::public.review_status,
    'Source-backed clarifier draft; requires medical review before activation.',
    'not_started'::public.translation_status
  ),
  (
    'clarify_dehydration_urine',
    'هل أصبح التبول أقل من المعتاد أو لون البول داكنًا؟',
    'Are you urinating less than usual or is your urine dark?',
    'yes_no_unsure'::public.question_type,
    'general',
    false, 207, false, 'draft'::public.review_status,
    'Source-backed clarifier draft; requires medical review before activation.',
    'not_started'::public.translation_status
  )
) AS v(
  code, question_ar, question_en, question_type, category,
  is_active, sort_order, is_demo, review_status,
  change_reason, translation_status
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.questions q WHERE q.code = v.code
);

-- Standard yes / no / unsure options for all clarifiers.
INSERT INTO public.question_options (
  question_id, value, label_ar, label_en, sort_order
)
SELECT q.id, option.value, option.label_ar, option.label_en, option.sort_order
FROM public.questions q
CROSS JOIN (VALUES
  ('yes', 'نعم', 'Yes', 1),
  ('no', 'لا', 'No', 2),
  ('unsure', 'غير متأكد', 'Not sure', 3)
) AS option(value, label_ar, label_en, sort_order)
WHERE q.code IN (
  'clarify_migraine_light',
  'clarify_migraine_sound',
  'clarify_migraine_nausea',
  'clarify_cold_runny_nose',
  'clarify_cold_sore_throat',
  'clarify_dehydration_thirst',
  'clarify_dehydration_urine'
)
AND NOT EXISTS (
  SELECT 1 FROM public.question_options existing
  WHERE existing.question_id = q.id AND existing.value = option.value
);

-- Question sources.
INSERT INTO public.question_sources (question_id, source_id)
SELECT q.id, s.id
FROM public.questions q
JOIN public.medical_sources s
  ON s.url IN (
    'https://www.moh.gov.sa/healthawareness/educationalcontent/diseases/nervous-system/pages/migraine.aspx',
    'https://www.nhs.uk/conditions/migraine/'
  )
WHERE q.code IN (
  'clarify_migraine_light',
  'clarify_migraine_sound',
  'clarify_migraine_nausea'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.question_sources (question_id, source_id)
SELECT q.id, s.id
FROM public.questions q
JOIN public.medical_sources s
  ON s.url IN (
    'https://www.moh.gov.sa/healthawareness/educationalcontent/diseases/infectious/pages/common-cold.aspx',
    'https://www.nhs.uk/conditions/common-cold/'
  )
WHERE q.code IN (
  'clarify_cold_runny_nose',
  'clarify_cold_sore_throat'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.question_sources (question_id, source_id)
SELECT q.id, s.id
FROM public.questions q
JOIN public.medical_sources s
  ON s.url IN (
    'https://www.moh.gov.sa/healthawareness/pilgrims-health/pages/dehydration.aspx',
    'https://www.nhs.uk/conditions/dehydration/'
  )
WHERE q.code IN (
  'clarify_dehydration_thirst',
  'clarify_dehydration_urine'
)
ON CONFLICT DO NOTHING;

-- Candidate-condition rules. These rules are inert until an authorized reviewer
-- publishes/activates the condition, question and confirmed symptom, then activates
-- the rule.
INSERT INTO public.question_rules (
  question_id, trigger_type, condition_id, confirms_symptom_id,
  operator, expected_value, priority, is_active
)
SELECT q.id, 'condition_candidate', c.id, s.id,
       'eq', 'yes', v.priority, false
FROM (VALUES
  ('clarify_migraine_light', 'migraine', 'light_sensitivity', 1),
  ('clarify_migraine_sound', 'migraine', 'sound_sensitivity', 2),
  ('clarify_migraine_nausea', 'migraine', 'nausea', 3),
  ('clarify_cold_runny_nose', 'common_cold', 'runny_nose', 4),
  ('clarify_cold_sore_throat', 'common_cold', 'sore_throat', 5),
  ('clarify_dehydration_thirst', 'dehydration', 'excessive_thirst', 6),
  ('clarify_dehydration_urine', 'dehydration', 'reduced_dark_urine', 7)
) AS v(question_code, condition_code, symptom_code, priority)
JOIN public.questions q ON q.code = v.question_code
JOIN public.conditions c ON c.code = v.condition_code
JOIN public.symptoms s ON s.code = v.symptom_code
WHERE NOT EXISTS (
  SELECT 1
  FROM public.question_rules existing
  WHERE existing.question_id = q.id
    AND existing.trigger_type = 'condition_candidate'
    AND existing.condition_id = c.id
    AND existing.confirms_symptom_id = s.id
);
