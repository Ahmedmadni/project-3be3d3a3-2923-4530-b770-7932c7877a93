-- Source-backed safety/red-flag draft pack.
-- SAFETY:
--   * Every new question, red flag, symptom and rule is inactive/draft.
--   * Nothing in this migration is published automatically.
--   * Activation requires reviewed/published source-backed prerequisites.

-- Smart follow-up added a condition_candidate trigger type. Align the database
-- check constraint so those already-created draft rows can be applied safely.
ALTER TABLE public.question_rules
  DROP CONSTRAINT IF EXISTS question_rules_trigger_type_check;

ALTER TABLE public.question_rules
  ADD CONSTRAINT question_rules_trigger_type_check
  CHECK (trigger_type IN ('symptom_selected','answer_equals','condition_candidate','always'));

-- ---------------------------------------------------------------------------
-- Strengthen clinical-rule activation prerequisites.
-- ---------------------------------------------------------------------------

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

  IF activating AND TG_TABLE_NAME = 'question_rules' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.questions q
      WHERE q.id = NEW.question_id
        AND q.is_active = true
        AND q.review_status = 'published'
        AND q.is_demo = false
    ) THEN
      RAISE EXCEPTION 'QUESTION_NOT_PUBLISHED: publish and activate the question first';
    END IF;

    IF NEW.symptom_id IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM public.symptoms s
      WHERE s.id = NEW.symptom_id
        AND s.is_active = true
        AND s.review_status = 'published'
        AND s.is_demo = false
    ) THEN
      RAISE EXCEPTION 'TRIGGER_SYMPTOM_NOT_PUBLISHED: publish and activate the trigger symptom first';
    END IF;

    IF NEW.parent_question_id IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM public.questions q
      WHERE q.id = NEW.parent_question_id
        AND q.is_active = true
        AND q.review_status = 'published'
        AND q.is_demo = false
    ) THEN
      RAISE EXCEPTION 'PARENT_QUESTION_NOT_PUBLISHED: publish and activate the parent question first';
    END IF;

    IF NEW.condition_id IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM public.conditions c
      WHERE c.id = NEW.condition_id
        AND c.is_active = true
        AND c.review_status = 'published'
        AND c.is_demo = false
    ) THEN
      RAISE EXCEPTION 'CONDITION_NOT_PUBLISHED: publish and activate the candidate condition first';
    END IF;

    IF NEW.confirms_symptom_id IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM public.symptoms s
      WHERE s.id = NEW.confirms_symptom_id
        AND s.is_active = true
        AND s.review_status = 'published'
        AND s.is_demo = false
    ) THEN
      RAISE EXCEPTION 'CONFIRMED_SYMPTOM_NOT_PUBLISHED: publish and activate the confirmed symptom first';
    END IF;
  END IF;

  IF activating AND TG_TABLE_NAME = 'red_flag_rules' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.red_flags f
      WHERE f.id = NEW.red_flag_id
        AND f.is_active = true
        AND f.review_status = 'published'
        AND f.is_demo = false
    ) THEN
      RAISE EXCEPTION 'RED_FLAG_NOT_PUBLISHED: publish and activate the red flag first';
    END IF;

    IF NEW.symptom_id IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM public.symptoms s
      WHERE s.id = NEW.symptom_id
        AND s.is_active = true
        AND s.review_status = 'published'
        AND s.is_demo = false
    ) THEN
      RAISE EXCEPTION 'RED_FLAG_SYMPTOM_NOT_PUBLISHED: publish and activate the symptom first';
    END IF;

    IF NEW.question_id IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM public.questions q
      WHERE q.id = NEW.question_id
        AND q.is_active = true
        AND q.review_status = 'published'
        AND q.is_demo = false
    ) THEN
      RAISE EXCEPTION 'RED_FLAG_QUESTION_NOT_PUBLISHED: publish and activate the question first';
    END IF;
  END IF;

  RETURN NEW;
END
$$;

REVOKE EXECUTE ON FUNCTION public.clinical_rule_activation_guard() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clinical_rule_activation_guard() TO service_role;

-- ---------------------------------------------------------------------------
-- Sources checked on 2026-09-29.
-- ---------------------------------------------------------------------------

INSERT INTO public.medical_sources (
  title, organization, url, source_type, language, country,
  organization_type, last_verified_at, notes, is_active
)
SELECT
  'Heart attacks',
  'Saudi Ministry of Health',
  'https://www.moh.gov.sa/en/healthawareness/educationalcontent/diseases/heartcirculatory/pages/heart-attacks.aspx',
  'government'::public.source_type,
  'en',
  'SA',
  'government',
  '2026-09-29T05:30:00Z'::timestamptz,
  'Supports emergency chest-pain warning patterns. Re-check before publication.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.medical_sources
  WHERE url = 'https://www.moh.gov.sa/en/healthawareness/educationalcontent/diseases/heartcirculatory/pages/heart-attacks.aspx'
);

INSERT INTO public.medical_sources (
  title, organization, url, source_type, language, country,
  organization_type, last_verified_at, notes, is_active
)
SELECT
  'Stroke',
  'Saudi Ministry of Health',
  'https://www.moh.gov.sa/en/healthawareness/educationalcontent/diseases/nervous-system/pages/006.aspx',
  'government'::public.source_type,
  'en',
  'SA',
  'government',
  '2026-09-29T05:30:00Z'::timestamptz,
  'Supports sudden severe headache and new neurologic deficit warnings. Re-check before publication.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.medical_sources
  WHERE url = 'https://www.moh.gov.sa/en/healthawareness/educationalcontent/diseases/nervous-system/pages/006.aspx'
);

INSERT INTO public.medical_sources (
  title, organization, url, source_type, language, country,
  organization_type, last_verified_at, notes, is_active
)
SELECT
  'Headaches',
  'NHS',
  'https://www.nhs.uk/symptoms/headaches/',
  'government'::public.source_type,
  'en',
  'GB',
  'government',
  '2026-09-29T05:30:00Z'::timestamptz,
  'Supports emergency headache warning features. Re-check before publication.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.medical_sources
  WHERE url = 'https://www.nhs.uk/symptoms/headaches/'
);

INSERT INTO public.medical_sources (
  title, organization, url, source_type, language, country,
  organization_type, last_verified_at, notes, is_active
)
SELECT
  'Shortness of breath',
  'NHS',
  'https://www.nhs.uk/symptoms/shortness-of-breath/',
  'government'::public.source_type,
  'en',
  'GB',
  'government',
  '2026-09-29T05:30:00Z'::timestamptz,
  'Supports severe breathing-distress warning features. Re-check before publication.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.medical_sources
  WHERE url = 'https://www.nhs.uk/symptoms/shortness-of-breath/'
);

INSERT INTO public.medical_sources (
  title, organization, url, source_type, language, country,
  organization_type, last_verified_at, notes, is_active
)
SELECT
  'Fainting',
  'NHS',
  'https://www.nhs.uk/symptoms/fainting/',
  'government'::public.source_type,
  'en',
  'GB',
  'government',
  '2026-09-29T05:30:00Z'::timestamptz,
  'Supports high-risk features after fainting. Re-check before publication.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.medical_sources
  WHERE url = 'https://www.nhs.uk/symptoms/fainting/'
);

INSERT INTO public.medical_sources (
  title, organization, url, source_type, language, country,
  organization_type, last_verified_at, notes, is_active
)
SELECT
  'Vomiting blood',
  'NHS',
  'https://www.nhs.uk/symptoms/vomiting-blood/',
  'government'::public.source_type,
  'en',
  'GB',
  'government',
  '2026-09-29T05:30:00Z'::timestamptz,
  'Supports emergency escalation when vomiting blood. Re-check before publication.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.medical_sources
  WHERE url = 'https://www.nhs.uk/symptoms/vomiting-blood/'
);

INSERT INTO public.medical_sources (
  title, organization, url, source_type, language, country,
  organization_type, last_verified_at, notes, is_active
)
SELECT
  'Diarrhoea and vomiting',
  'NHS',
  'https://www.nhs.uk/symptoms/diarrhoea-and-vomiting/',
  'government'::public.source_type,
  'en',
  'GB',
  'government',
  '2026-09-29T05:30:00Z'::timestamptz,
  'Supports urgent escalation for persistent vomiting / inability to keep fluids down. Re-check before publication.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.medical_sources
  WHERE url = 'https://www.nhs.uk/symptoms/diarrhoea-and-vomiting/'
);

-- ---------------------------------------------------------------------------
-- One explicit severe-bleeding symptom. It remains inactive until review.
-- ---------------------------------------------------------------------------

INSERT INTO public.symptoms (
  code, name_ar, name_en, description_ar, description_en,
  category, body_system, is_red_flag_candidate, is_active,
  sort_order, is_demo, review_status, change_reason, translation_status
)
SELECT
  'heavy_bleeding',
  'نزيف غزير أو مستمر',
  'Heavy or continuous bleeding',
  'نزيف خارجي يبدو غزيرًا أو مستمرًا أو يندفع بقوة. هذا العرض مخصص للتعرف على حالة قد تحتاج مساعدة طارئة ولا يحدد سبب النزيف.',
  'External bleeding that appears heavy, continuous or spurting. This symptom is intended to identify a potentially life-threatening situation and does not identify the cause.',
  'emergency',
  'circulatory',
  true,
  false,
  109,
  false,
  'draft'::public.review_status,
  'Source-backed red-flag symptom draft; requires medical review before activation.',
  'not_started'::public.translation_status
WHERE NOT EXISTS (
  SELECT 1 FROM public.symptoms WHERE code = 'heavy_bleeding'
);

INSERT INTO public.symptom_sources (symptom_id, source_id)
SELECT symptom.id, source.id
FROM public.symptoms symptom
JOIN public.medical_sources source
  ON source.url = 'https://www.redcross.org/take-a-class/resources/learn-first-aid/bleeding-life-threatening-external'
WHERE symptom.code = 'heavy_bleeding'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Safety questions. All remain inactive drafts.
-- ---------------------------------------------------------------------------

INSERT INTO public.questions (
  code, question_ar, question_en, question_type, category,
  is_active, sort_order, is_demo, review_status,
  change_reason, translation_status
)
SELECT * FROM (VALUES
  (
    'rf_headache_sudden_severe',
    'هل بدأ الصداع فجأة وكان شديدًا جدًا أو مختلفًا بشكل واضح عن المعتاد؟',
    'Did the headache start suddenly and become extremely severe or clearly different from usual?',
    'yes_no_unsure'::public.question_type,
    'neurological', false, 301, false, 'draft'::public.review_status,
    'Source-backed red-flag question draft; requires medical review before activation.',
    'not_started'::public.translation_status
  ),
  (
    'rf_headache_neuro',
    'مع الصداع، هل ظهر ضعف أو تنميل جديد في الوجه أو الذراع أو الساق، أو صعوبة في الكلام أو الرؤية أو المشي؟',
    'With the headache, is there new weakness or numbness of the face, arm or leg, or difficulty speaking, seeing or walking?',
    'yes_no_unsure'::public.question_type,
    'neurological', false, 302, false, 'draft'::public.review_status,
    'Source-backed red-flag question draft; requires medical review before activation.',
    'not_started'::public.translation_status
  ),
  (
    'rf_chest_radiation',
    'هل يمتد ألم أو انزعاج الصدر إلى الذراع أو الكتف أو الظهر أو الرقبة أو الفك؟',
    'Does the chest pain or discomfort spread to the arm, shoulder, back, neck or jaw?',
    'yes_no_unsure'::public.question_type,
    'cardiovascular', false, 303, false, 'draft'::public.review_status,
    'Source-backed red-flag question draft; requires medical review before activation.',
    'not_started'::public.translation_status
  ),
  (
    'rf_chest_associated',
    'هل يصاحب ألم الصدر ضيق نفس أو تعرّق بارد أو غثيان أو دوخة أو إغماء؟',
    'Is the chest pain accompanied by shortness of breath, cold sweating, nausea, dizziness or fainting?',
    'yes_no_unsure'::public.question_type,
    'cardiovascular', false, 304, false, 'draft'::public.review_status,
    'Source-backed red-flag question draft; requires medical review before activation.',
    'not_started'::public.translation_status
  ),
  (
    'rf_breathing_cannot_speak',
    'هل صعوبة التنفس شديدة لدرجة اللهاث أو الاختناق أو عدم القدرة على قول جملة كاملة؟',
    'Is the breathing difficulty severe enough that you are gasping, choking or unable to say a full sentence?',
    'yes_no_unsure'::public.question_type,
    'respiratory', false, 305, false, 'draft'::public.review_status,
    'Source-backed red-flag question draft; requires medical review before activation.',
    'not_started'::public.translation_status
  ),
  (
    'rf_breathing_color_confusion',
    'هل يوجد ازرقاق أو شحوب شديد في الشفاه أو الجلد، أو ارتباك مفاجئ مع ضيق التنفس؟',
    'Are the lips or skin turning blue/very pale, or is there sudden confusion with the breathing difficulty?',
    'yes_no_unsure'::public.question_type,
    'respiratory', false, 306, false, 'draft'::public.review_status,
    'Source-backed red-flag question draft; requires medical review before activation.',
    'not_started'::public.translation_status
  ),
  (
    'rf_faint_not_recovered',
    'بعد الإغماء، هل لم يعد الشخص إلى حالته المعتادة أو توجد صعوبة جديدة في الكلام أو الحركة؟',
    'After fainting, has the person not fully recovered or developed new difficulty speaking or moving?',
    'yes_no_unsure'::public.question_type,
    'neurological', false, 307, false, 'draft'::public.review_status,
    'Source-backed red-flag question draft; requires medical review before activation.',
    'not_started'::public.translation_status
  ),
  (
    'rf_faint_chest_palpitations',
    'هل صاحب الإغماء ألم في الصدر أو خفقان قوي أو غير منتظم؟',
    'Was the fainting associated with chest pain or a strong/irregular heartbeat?',
    'yes_no_unsure'::public.question_type,
    'cardiovascular', false, 308, false, 'draft'::public.review_status,
    'Source-backed red-flag question draft; requires medical review before activation.',
    'not_started'::public.translation_status
  ),
  (
    'rf_vomit_blood',
    'هل يوجد دم في القيء أو يبدو القيء داكنًا مثل حبيبات القهوة؟',
    'Is there blood in the vomit or does it look dark like coffee grounds?',
    'yes_no_unsure'::public.question_type,
    'gastrointestinal', false, 309, false, 'draft'::public.review_status,
    'Source-backed red-flag question draft; requires medical review before activation.',
    'not_started'::public.translation_status
  ),
  (
    'rf_vomit_cannot_keep_fluids',
    'هل يستمر القيء لدرجة عدم القدرة على الاحتفاظ بالسوائل؟',
    'Is the vomiting continuing so that you cannot keep fluids down?',
    'yes_no_unsure'::public.question_type,
    'gastrointestinal', false, 310, false, 'draft'::public.review_status,
    'Source-backed urgent-care question draft; requires medical review before activation.',
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
  'rf_headache_sudden_severe',
  'rf_headache_neuro',
  'rf_chest_radiation',
  'rf_chest_associated',
  'rf_breathing_cannot_speak',
  'rf_breathing_color_confusion',
  'rf_faint_not_recovered',
  'rf_faint_chest_palpitations',
  'rf_vomit_blood',
  'rf_vomit_cannot_keep_fluids'
)
AND NOT EXISTS (
  SELECT 1 FROM public.question_options existing
  WHERE existing.question_id = q.id AND existing.value = option.value
);

-- Question source links.
INSERT INTO public.question_sources (question_id, source_id)
SELECT q.id, s.id
FROM public.questions q
JOIN public.medical_sources s
  ON s.url IN (
    'https://www.moh.gov.sa/en/healthawareness/educationalcontent/diseases/nervous-system/pages/006.aspx',
    'https://www.nhs.uk/symptoms/headaches/'
  )
WHERE q.code IN ('rf_headache_sudden_severe','rf_headache_neuro')
ON CONFLICT DO NOTHING;

INSERT INTO public.question_sources (question_id, source_id)
SELECT q.id, s.id
FROM public.questions q
JOIN public.medical_sources s
  ON s.url = 'https://www.moh.gov.sa/en/healthawareness/educationalcontent/diseases/heartcirculatory/pages/heart-attacks.aspx'
WHERE q.code IN ('rf_chest_radiation','rf_chest_associated')
ON CONFLICT DO NOTHING;

INSERT INTO public.question_sources (question_id, source_id)
SELECT q.id, s.id
FROM public.questions q
JOIN public.medical_sources s
  ON s.url = 'https://www.nhs.uk/symptoms/shortness-of-breath/'
WHERE q.code IN ('rf_breathing_cannot_speak','rf_breathing_color_confusion')
ON CONFLICT DO NOTHING;

INSERT INTO public.question_sources (question_id, source_id)
SELECT q.id, s.id
FROM public.questions q
JOIN public.medical_sources s
  ON s.url = 'https://www.nhs.uk/symptoms/fainting/'
WHERE q.code IN ('rf_faint_not_recovered','rf_faint_chest_palpitations')
ON CONFLICT DO NOTHING;

INSERT INTO public.question_sources (question_id, source_id)
SELECT q.id, s.id
FROM public.questions q
JOIN public.medical_sources s
  ON s.url = 'https://www.nhs.uk/symptoms/vomiting-blood/'
WHERE q.code = 'rf_vomit_blood'
ON CONFLICT DO NOTHING;

INSERT INTO public.question_sources (question_id, source_id)
SELECT q.id, s.id
FROM public.questions q
JOIN public.medical_sources s
  ON s.url = 'https://www.nhs.uk/symptoms/diarrhoea-and-vomiting/'
WHERE q.code = 'rf_vomit_cannot_keep_fluids'
ON CONFLICT DO NOTHING;

-- Visibility rules. All inactive until reviewed.
INSERT INTO public.question_rules (
  question_id, trigger_type, symptom_id, operator,
  priority, is_active
)
SELECT q.id, 'symptom_selected', s.id, 'eq', v.priority, false
FROM (VALUES
  ('rf_headache_sudden_severe','headache',1),
  ('rf_headache_neuro','headache',2),
  ('rf_chest_radiation','chest_pain',1),
  ('rf_chest_associated','chest_pain',2),
  ('rf_breathing_cannot_speak','shortness_of_breath',1),
  ('rf_breathing_color_confusion','shortness_of_breath',2),
  ('rf_faint_not_recovered','fainting',1),
  ('rf_faint_chest_palpitations','fainting',2),
  ('rf_vomit_blood','vomiting',1),
  ('rf_vomit_cannot_keep_fluids','vomiting',2)
) AS v(question_code, symptom_code, priority)
JOIN public.questions q ON q.code = v.question_code
JOIN public.symptoms s ON s.code = v.symptom_code
WHERE NOT EXISTS (
  SELECT 1 FROM public.question_rules existing
  WHERE existing.question_id = q.id
    AND existing.trigger_type = 'symptom_selected'
    AND existing.symptom_id = s.id
);

-- ---------------------------------------------------------------------------
-- Draft red flags.
-- ---------------------------------------------------------------------------

INSERT INTO public.red_flags (
  code, title_ar, title_en, description_ar, description_en,
  care_level, priority, is_active, review_status, is_demo,
  change_reason, translation_status
)
SELECT * FROM (VALUES
  (
    'source_sudden_severe_headache',
    'صداع شديد ومفاجئ',
    'Sudden severe headache',
    'صداع بدأ فجأة وكان شديدًا جدًا قد يحتاج تقييمًا طارئًا.',
    'A suddenly starting extremely severe headache may require emergency evaluation.',
    'emergency'::public.care_level, 120, false, 'draft'::public.review_status, false,
    'Source-backed safety draft; requires medical review before activation.',
    'not_started'::public.translation_status
  ),
  (
    'source_headache_neuro_deficit',
    'صداع مع أعراض عصبية جديدة',
    'Headache with new neurologic symptoms',
    'صداع مع ضعف أو تنميل جديد أو صعوبة الكلام أو الرؤية أو المشي.',
    'Headache with new weakness, numbness, or difficulty speaking, seeing or walking.',
    'emergency'::public.care_level, 125, false, 'draft'::public.review_status, false,
    'Source-backed safety draft; requires medical review before activation.',
    'not_started'::public.translation_status
  ),
  (
    'source_possible_heart_attack',
    'نمط ألم صدر يستدعي الطوارئ',
    'Emergency chest-pain pattern',
    'ألم صدر شديد أو ممتد أو مصحوب بعلامات قد تتوافق مع حالة قلبية طارئة.',
    'Severe, spreading or associated chest-pain features that may represent a cardiac emergency.',
    'emergency'::public.care_level, 130, false, 'draft'::public.review_status, false,
    'Source-backed safety draft; requires medical review before activation.',
    'not_started'::public.translation_status
  ),
  (
    'source_severe_breathing_distress',
    'ضيق تنفس شديد',
    'Severe breathing distress',
    'ضيق تنفس شديد مع عدم القدرة على الكلام بشكل طبيعي أو تغير اللون أو الارتباك.',
    'Severe breathing difficulty with inability to speak normally, color change or confusion.',
    'emergency'::public.care_level, 130, false, 'draft'::public.review_status, false,
    'Source-backed safety draft; requires medical review before activation.',
    'not_started'::public.translation_status
  ),
  (
    'source_high_risk_fainting',
    'إغماء مع علامات خطورة',
    'Fainting with high-risk features',
    'إغماء مع عدم التعافي الكامل أو أعراض عصبية أو ألم صدر أو خفقان غير طبيعي.',
    'Fainting with incomplete recovery, neurologic symptoms, chest pain or abnormal palpitations.',
    'emergency'::public.care_level, 120, false, 'draft'::public.review_status, false,
    'Source-backed safety draft; requires medical review before activation.',
    'not_started'::public.translation_status
  ),
  (
    'source_vomiting_blood',
    'قيء دموي',
    'Vomiting blood',
    'وجود دم في القيء أو مظهر يشبه حبيبات القهوة يحتاج تقييمًا عاجلًا وقد يكون طارئًا.',
    'Blood in vomit or coffee-ground-like vomit requires urgent assessment and may be an emergency.',
    'emergency'::public.care_level, 125, false, 'draft'::public.review_status, false,
    'Source-backed safety draft; requires medical review before activation.',
    'not_started'::public.translation_status
  ),
  (
    'source_persistent_vomiting',
    'قيء مستمر مع عدم الاحتفاظ بالسوائل',
    'Persistent vomiting with inability to keep fluids down',
    'استمرار القيء مع عدم القدرة على الاحتفاظ بالسوائل قد يحتاج تقييمًا طبيًا عاجلًا.',
    'Ongoing vomiting with inability to keep fluids down may require urgent medical assessment.',
    'urgent'::public.care_level, 70, false, 'draft'::public.review_status, false,
    'Source-backed urgent-care draft; requires medical review before activation.',
    'not_started'::public.translation_status
  ),
  (
    'source_life_threatening_bleeding',
    'نزيف قد يهدد الحياة',
    'Potentially life-threatening bleeding',
    'نزيف خارجي غزير أو مستمر أو يندفع بقوة يحتاج مساعدة طارئة.',
    'Heavy, continuous or spurting external bleeding requires emergency help.',
    'emergency'::public.care_level, 140, false, 'draft'::public.review_status, false,
    'Source-backed safety draft; requires medical review before activation.',
    'not_started'::public.translation_status
  )
) AS v(
  code, title_ar, title_en, description_ar, description_en,
  care_level, priority, is_active, review_status, is_demo,
  change_reason, translation_status
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.red_flags f WHERE f.code = v.code
);

-- Red flag source links.
INSERT INTO public.red_flag_sources (red_flag_id, source_id)
SELECT f.id, s.id
FROM public.red_flags f
JOIN public.medical_sources s
  ON s.url IN (
    'https://www.moh.gov.sa/en/healthawareness/educationalcontent/diseases/nervous-system/pages/006.aspx',
    'https://www.nhs.uk/symptoms/headaches/'
  )
WHERE f.code IN ('source_sudden_severe_headache','source_headache_neuro_deficit')
ON CONFLICT DO NOTHING;

INSERT INTO public.red_flag_sources (red_flag_id, source_id)
SELECT f.id, s.id
FROM public.red_flags f
JOIN public.medical_sources s
  ON s.url = 'https://www.moh.gov.sa/en/healthawareness/educationalcontent/diseases/heartcirculatory/pages/heart-attacks.aspx'
WHERE f.code = 'source_possible_heart_attack'
ON CONFLICT DO NOTHING;

INSERT INTO public.red_flag_sources (red_flag_id, source_id)
SELECT f.id, s.id
FROM public.red_flags f
JOIN public.medical_sources s
  ON s.url = 'https://www.nhs.uk/symptoms/shortness-of-breath/'
WHERE f.code = 'source_severe_breathing_distress'
ON CONFLICT DO NOTHING;

INSERT INTO public.red_flag_sources (red_flag_id, source_id)
SELECT f.id, s.id
FROM public.red_flags f
JOIN public.medical_sources s
  ON s.url = 'https://www.nhs.uk/symptoms/fainting/'
WHERE f.code = 'source_high_risk_fainting'
ON CONFLICT DO NOTHING;

INSERT INTO public.red_flag_sources (red_flag_id, source_id)
SELECT f.id, s.id
FROM public.red_flags f
JOIN public.medical_sources s
  ON s.url = 'https://www.nhs.uk/symptoms/vomiting-blood/'
WHERE f.code = 'source_vomiting_blood'
ON CONFLICT DO NOTHING;

INSERT INTO public.red_flag_sources (red_flag_id, source_id)
SELECT f.id, s.id
FROM public.red_flags f
JOIN public.medical_sources s
  ON s.url = 'https://www.nhs.uk/symptoms/diarrhoea-and-vomiting/'
WHERE f.code = 'source_persistent_vomiting'
ON CONFLICT DO NOTHING;

INSERT INTO public.red_flag_sources (red_flag_id, source_id)
SELECT f.id, s.id
FROM public.red_flags f
JOIN public.medical_sources s
  ON s.url = 'https://www.redcross.org/take-a-class/resources/learn-first-aid/bleeding-life-threatening-external'
WHERE f.code = 'source_life_threatening_bleeding'
ON CONFLICT DO NOTHING;

-- Red-flag rules. All inactive until an authorized reviewer publishes/activates
-- the prerequisite entities and then enables each rule.
INSERT INTO public.red_flag_rules (
  red_flag_id, symptom_id, question_id, operator, value,
  severity, is_active
)
SELECT f.id, s.id, q.id, v.operator, v.value,
       v.severity::public.severity_level, false
FROM (VALUES
  ('source_sudden_severe_headache',NULL,'rf_headache_sudden_severe','eq','yes',NULL),
  ('source_headache_neuro_deficit',NULL,'rf_headache_neuro','eq','yes',NULL),

  ('source_possible_heart_attack','chest_pain',NULL,'selected',NULL,'severe'),
  ('source_possible_heart_attack',NULL,'rf_chest_radiation','eq','yes',NULL),
  ('source_possible_heart_attack',NULL,'rf_chest_associated','eq','yes',NULL),

  ('source_severe_breathing_distress','shortness_of_breath',NULL,'selected',NULL,'severe'),
  ('source_severe_breathing_distress',NULL,'rf_breathing_cannot_speak','eq','yes',NULL),
  ('source_severe_breathing_distress',NULL,'rf_breathing_color_confusion','eq','yes',NULL),

  ('source_high_risk_fainting',NULL,'rf_faint_not_recovered','eq','yes',NULL),
  ('source_high_risk_fainting',NULL,'rf_faint_chest_palpitations','eq','yes',NULL),

  ('source_vomiting_blood',NULL,'rf_vomit_blood','eq','yes',NULL),
  ('source_persistent_vomiting',NULL,'rf_vomit_cannot_keep_fluids','eq','yes',NULL),

  ('source_life_threatening_bleeding','heavy_bleeding',NULL,'selected',NULL,NULL)
) AS v(flag_code, symptom_code, question_code, operator, value, severity)
JOIN public.red_flags f ON f.code = v.flag_code
LEFT JOIN public.symptoms s ON s.code = v.symptom_code
LEFT JOIN public.questions q ON q.code = v.question_code
WHERE NOT EXISTS (
  SELECT 1
  FROM public.red_flag_rules existing
  WHERE existing.red_flag_id = f.id
    AND coalesce(existing.symptom_id::text, '') = coalesce(s.id::text, '')
    AND coalesce(existing.question_id::text, '') = coalesce(q.id::text, '')
    AND existing.operator = v.operator
    AND coalesce(existing.value, '') = coalesce(v.value, '')
    AND coalesce(existing.severity::text, '') = coalesce(v.severity, '')
);
