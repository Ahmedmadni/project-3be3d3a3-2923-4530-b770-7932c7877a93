-- Starter medical content pack 2.
-- SAFETY: every new condition and clinical link is DRAFT/INACTIVE.
-- This migration DOES NOT publish or activate medical content.

-- ---------------------------------------------------------------------------
-- Sources checked on 2026-09-29
-- ---------------------------------------------------------------------------

INSERT INTO public.medical_sources (
  title, organization, url, source_type, language, country,
  organization_type, last_verified_at, notes, is_active
)
SELECT
  'التعرض للجفاف أثناء الحج',
  'وزارة الصحة السعودية',
  'https://www.moh.gov.sa/healthawareness/pilgrims-health/pages/dehydration.aspx',
  'government'::public.source_type,
  'ar',
  'SA',
  'government',
  '2026-09-29T03:58:00Z'::timestamptz,
  'General dehydration definition/signs from Saudi MOH pilgrim-health guidance. Re-check before publication.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.medical_sources
  WHERE url = 'https://www.moh.gov.sa/healthawareness/pilgrims-health/pages/dehydration.aspx'
);

INSERT INTO public.medical_sources (
  title, organization, url, source_type, language, country,
  organization_type, last_verified_at, notes, is_active
)
SELECT
  'Dehydration',
  'NHS',
  'https://www.nhs.uk/conditions/dehydration/',
  'government'::public.source_type,
  'en',
  'GB',
  'government',
  '2026-09-29T03:58:00Z'::timestamptz,
  'General dehydration signs and escalation source. Re-check before publication.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.medical_sources
  WHERE url = 'https://www.nhs.uk/conditions/dehydration/'
);

INSERT INTO public.medical_sources (
  title, organization, url, source_type, language, country,
  organization_type, last_verified_at, notes, is_active
)
SELECT
  'نزلات البرد الشائعة',
  'وزارة الصحة السعودية',
  'https://www.moh.gov.sa/healthawareness/educationalcontent/diseases/infectious/pages/common-cold.aspx',
  'government'::public.source_type,
  'ar',
  'SA',
  'government',
  '2026-09-29T03:58:00Z'::timestamptz,
  'Common-cold draft source. Re-check before publication.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.medical_sources
  WHERE url = 'https://www.moh.gov.sa/healthawareness/educationalcontent/diseases/infectious/pages/common-cold.aspx'
);

INSERT INTO public.medical_sources (
  title, organization, url, source_type, language, country,
  organization_type, last_verified_at, notes, is_active
)
SELECT
  'الصداع النصفي (الشقيقة)',
  'وزارة الصحة السعودية',
  'https://www.moh.gov.sa/healthawareness/educationalcontent/diseases/nervous-system/pages/migraine.aspx',
  'government'::public.source_type,
  'ar',
  'SA',
  'government',
  '2026-09-29T03:58:00Z'::timestamptz,
  'Migraine draft source. Re-check before publication.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.medical_sources
  WHERE url = 'https://www.moh.gov.sa/healthawareness/educationalcontent/diseases/nervous-system/pages/migraine.aspx'
);

-- ---------------------------------------------------------------------------
-- Inactive condition drafts
-- ---------------------------------------------------------------------------

INSERT INTO public.conditions (
  code, name_ar, name_en, summary_ar, summary_en, when_to_seek_care_ar,
  category, specialty, care_level, is_active, review_status, is_demo,
  change_reason, translation_status
)
SELECT
  'dehydration',
  'الجفاف',
  'Dehydration',
  'يحدث الجفاف عندما يفقد الجسم سوائل أكثر مما يحصل عليه. قد يرتبط بالعطش الشديد، وجفاف الفم، وقلة أو غمقان البول، والدوخة، والتعب. يمكن أن يحدث مع القيء أو الإسهال أو التعرق الشديد أو الحرارة، لكن الأعراض وحدها لا تحدد السبب أو شدة الحالة.',
  'Dehydration happens when the body loses more fluid than it takes in. It may be associated with thirst, dry mouth, reduced or dark urine, dizziness and tiredness. It can occur with vomiting, diarrhoea, heavy sweating or heat exposure, but symptoms alone do not determine the cause or severity.',
  'اطلب تقييمًا طبيًا عاجلًا إذا كان هناك ارتباك، إغماء، دوخة شديدة تمنع الوقوف، قلة شديدة في البول، تدهور واضح، أو عدم القدرة على الاحتفاظ بالسوائل. الأطفال وكبار السن وبعض أصحاب الأمراض المزمنة قد يحتاجون تقييمًا أبكر.',
  'general',
  'طب الأسرة / الباطنية',
  'routine'::public.care_level,
  false,
  'draft'::public.review_status,
  false,
  'Starter sourced draft; requires medical review before activation.',
  'not_started'::public.translation_status
WHERE NOT EXISTS (
  SELECT 1 FROM public.conditions WHERE code = 'dehydration'
);

INSERT INTO public.conditions (
  code, name_ar, name_en, summary_ar, summary_en, when_to_seek_care_ar,
  category, specialty, care_level, is_active, review_status, is_demo,
  change_reason, translation_status
)
SELECT
  'common_cold',
  'نزلة البرد الشائعة',
  'Common cold',
  'نزلة البرد عدوى فيروسية شائعة في الجهاز التنفسي العلوي. قد تبدأ بسيلان الأنف أو التهاب الحلق ثم يظهر السعال والعطاس والصداع وآلام الجسم، وغالبًا تتحسن خلال نحو 7 إلى 10 أيام. تتشابه بعض أعراضها مع أمراض تنفسية أخرى، لذلك لا تكفي الأعراض وحدها للتشخيص.',
  'The common cold is a common viral upper-respiratory infection. It may start with a runny nose or sore throat followed by cough, sneezing, headache and body aches, and often improves within about 7 to 10 days. Symptoms overlap with other respiratory illnesses, so symptoms alone are not diagnostic.',
  'رتّب تقييمًا طبيًا إذا استمرت الأعراض أكثر من 10 أيام، أو كانت شديدة أو غير معتادة، أو كان المصاب صغيرًا جدًا مع حرارة أو قلة نشاط، أو لديه مرض مزمن قد يزيد الخطورة.',
  'infectious',
  'طب الأسرة / الأنف والأذن والحنجرة',
  'self_care'::public.care_level,
  false,
  'draft'::public.review_status,
  false,
  'Starter sourced draft; current symptom catalog lacks runny nose/sore throat, so matching must be reviewed before activation.',
  'not_started'::public.translation_status
WHERE NOT EXISTS (
  SELECT 1 FROM public.conditions WHERE code = 'common_cold'
);

INSERT INTO public.conditions (
  code, name_ar, name_en, summary_ar, summary_en, when_to_seek_care_ar,
  category, specialty, care_level, is_active, review_status, is_demo,
  change_reason, translation_status
)
SELECT
  'migraine',
  'الصداع النصفي (الشقيقة)',
  'Migraine',
  'الصداع النصفي نوع شائع من الصداع قد يسبب نوبات من الألم الشديد أو النابض، وغالبًا يصاحبه غثيان أو قيء وحساسية للضوء أو الصوت. قد يستمر من ساعات إلى عدة أيام، لكن الصداع له أسباب متعددة ولا يمكن تأكيد الشقيقة من الأعراض وحدها.',
  'Migraine is a common headache disorder that can cause attacks of severe or throbbing pain, often with nausea or vomiting and sensitivity to light or sound. Attacks may last from hours to several days, but headache has many causes and migraine cannot be confirmed from symptoms alone.',
  'اطلب تقييمًا طبيًا سريعًا عند الصداع المفاجئ الشديد غير المعتاد، أو الصداع مع حمى وتيبس الرقبة أو ضعف أو صعوبة في الكلام أو بعد إصابة في الرأس. راجع الطبيب أيضًا إذا كانت النوبات متكررة أو تعطل النشاط اليومي.',
  'nervous_system',
  'طب الأسرة / الأعصاب',
  'routine'::public.care_level,
  false,
  'draft'::public.review_status,
  false,
  'Starter sourced draft; requires medical review before activation.',
  'not_started'::public.translation_status
WHERE NOT EXISTS (
  SELECT 1 FROM public.conditions WHERE code = 'migraine'
);

-- ---------------------------------------------------------------------------
-- Source links
-- ---------------------------------------------------------------------------

INSERT INTO public.condition_sources (condition_id, source_id)
SELECT c.id, s.id
FROM public.conditions c
JOIN public.medical_sources s
  ON s.url IN (
    'https://www.moh.gov.sa/healthawareness/pilgrims-health/pages/dehydration.aspx',
    'https://www.nhs.uk/conditions/dehydration/'
  )
WHERE c.code = 'dehydration'
ON CONFLICT DO NOTHING;

INSERT INTO public.condition_sources (condition_id, source_id)
SELECT c.id, s.id
FROM public.conditions c
JOIN public.medical_sources s
  ON s.url = 'https://www.moh.gov.sa/healthawareness/educationalcontent/diseases/infectious/pages/common-cold.aspx'
WHERE c.code = 'common_cold'
ON CONFLICT DO NOTHING;

INSERT INTO public.condition_sources (condition_id, source_id)
SELECT c.id, s.id
FROM public.conditions c
JOIN public.medical_sources s
  ON s.url = 'https://www.moh.gov.sa/healthawareness/educationalcontent/diseases/nervous-system/pages/migraine.aspx'
WHERE c.code = 'migraine'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Inactive matching links using only the symptom vocabulary already present.
-- These links do not affect the app until a reviewer activates them.
-- ---------------------------------------------------------------------------

INSERT INTO public.condition_symptoms (
  condition_id, symptom_id, relationship_type, weight,
  is_core_symptom, is_demo, is_active
)
SELECT c.id, s.id, v.relationship_type::public.relationship_type, v.weight,
       v.is_core, false, false
FROM (VALUES
  ('dehydration', 'excessive_thirst', 'supports', 1.0::numeric, true),
  ('dehydration', 'dizziness', 'supports', 1.0::numeric, true),
  ('dehydration', 'fatigue', 'weak_support', 1.0::numeric, false),
  ('dehydration', 'nausea', 'weak_support', 1.0::numeric, false),

  ('common_cold', 'cough', 'supports', 1.0::numeric, true),
  ('common_cold', 'headache', 'weak_support', 1.0::numeric, false),
  ('common_cold', 'fatigue', 'weak_support', 1.0::numeric, false),
  ('common_cold', 'fever', 'weak_support', 1.0::numeric, false),

  ('migraine', 'headache', 'supports', 1.0::numeric, true),
  ('migraine', 'nausea', 'supports', 1.0::numeric, false),
  ('migraine', 'vomiting', 'weak_support', 1.0::numeric, false),
  ('migraine', 'dizziness', 'weak_support', 1.0::numeric, false)
) AS v(condition_code, symptom_code, relationship_type, weight, is_core)
JOIN public.conditions c ON c.code = v.condition_code
JOIN public.symptoms s ON s.code = v.symptom_code
ON CONFLICT (condition_id, symptom_id) DO NOTHING;
