-- Starter medical content pack.
-- SAFETY: all new clinical entities remain DRAFT and INACTIVE.
-- Existing first-aid topics remain draft. No content is published by this migration.
-- Medical reviewer approval is required before any activation/publication.

-- ---------------------------------------------------------------------------
-- Authoritative sources checked on 2026-09-29
-- ---------------------------------------------------------------------------

INSERT INTO public.medical_sources (
  title, organization, url, source_type, language, country,
  organization_type, last_verified_at, notes, is_active
)
SELECT
  'فقر الدم الناجم عن نقص الحديد',
  'وزارة الصحة السعودية',
  'https://www.moh.gov.sa/healthawareness/educationalcontent/diseases/hematology/pages/0010.aspx',
  'government'::public.source_type,
  'ar',
  'SA',
  'government',
  '2026-09-29T03:45:00Z'::timestamptz,
  'Starter pack source. Re-check before publication.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.medical_sources
  WHERE url = 'https://www.moh.gov.sa/healthawareness/educationalcontent/diseases/hematology/pages/0010.aspx'
);

INSERT INTO public.medical_sources (
  title, organization, url, source_type, language, country,
  organization_type, last_verified_at, notes, is_active
)
SELECT
  'Anaemia',
  'World Health Organization',
  'https://www.who.int/health-topics/anaemia',
  'reference'::public.source_type,
  'en',
  NULL,
  'intergovernmental',
  '2026-09-29T03:45:00Z'::timestamptz,
  'Starter pack source. Re-check before publication.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.medical_sources
  WHERE url = 'https://www.who.int/health-topics/anaemia'
);

INSERT INTO public.medical_sources (
  title, organization, url, source_type, language, country,
  organization_type, last_verified_at, notes, is_active
)
SELECT
  'السكري من النوع الثاني',
  'وزارة الصحة السعودية',
  'https://www.moh.gov.sa/healthawareness/educationalcontent/diseases/diabetic/pages/008.aspx',
  'government'::public.source_type,
  'ar',
  'SA',
  'government',
  '2026-09-29T03:45:00Z'::timestamptz,
  'Starter pack source. Re-check before publication.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.medical_sources
  WHERE url = 'https://www.moh.gov.sa/healthawareness/educationalcontent/diseases/diabetic/pages/008.aspx'
);

INSERT INTO public.medical_sources (
  title, organization, url, source_type, language, country,
  organization_type, last_verified_at, notes, is_active
)
SELECT
  'Symptoms of Diabetes',
  'Centers for Disease Control and Prevention',
  'https://www.cdc.gov/diabetes/signs-symptoms/index.html',
  'government'::public.source_type,
  'en',
  'US',
  'government',
  '2026-09-29T03:45:00Z'::timestamptz,
  'Starter pack source. Re-check before publication.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.medical_sources
  WHERE url = 'https://www.cdc.gov/diabetes/signs-symptoms/index.html'
);

INSERT INTO public.medical_sources (
  title, organization, url, source_type, language, country,
  organization_type, last_verified_at, notes, is_active
)
SELECT
  'Burns: Types, Symptoms, and How To Help',
  'American Red Cross',
  'https://www.redcross.org/take-a-class/resources/learn-first-aid/burns',
  'reference'::public.source_type,
  'en',
  'US',
  'nonprofit',
  '2026-09-29T03:45:00Z'::timestamptz,
  'First-aid draft source. Re-check and medically review before publication.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.medical_sources
  WHERE url = 'https://www.redcross.org/take-a-class/resources/learn-first-aid/burns'
);

INSERT INTO public.medical_sources (
  title, organization, url, source_type, language, country,
  organization_type, last_verified_at, notes, is_active
)
SELECT
  'Bleeding (Life-Threatening External)',
  'American Red Cross',
  'https://www.redcross.org/take-a-class/resources/learn-first-aid/bleeding-life-threatening-external',
  'reference'::public.source_type,
  'en',
  'US',
  'nonprofit',
  '2026-09-29T03:45:00Z'::timestamptz,
  'First-aid draft source. Re-check and medically review before publication.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.medical_sources
  WHERE url = 'https://www.redcross.org/take-a-class/resources/learn-first-aid/bleeding-life-threatening-external'
);

INSERT INTO public.medical_sources (
  title, organization, url, source_type, language, country,
  organization_type, last_verified_at, notes, is_active
)
SELECT
  'Adult & Child Choking: Symptoms and First Aid',
  'American Red Cross',
  'https://www.redcross.org/take-a-class/resources/learn-first-aid/adult-child-choking',
  'reference'::public.source_type,
  'en',
  'US',
  'nonprofit',
  '2026-09-29T03:45:00Z'::timestamptz,
  'First-aid draft source for adult/child choking; not infant instructions.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.medical_sources
  WHERE url = 'https://www.redcross.org/take-a-class/resources/learn-first-aid/adult-child-choking'
);

INSERT INTO public.medical_sources (
  title, organization, url, source_type, language, country,
  organization_type, last_verified_at, notes, is_active
)
SELECT
  'Seizures: Causes, Symptoms, and Types',
  'American Red Cross',
  'https://www.redcross.org/take-a-class/resources/learn-first-aid/seizures',
  'reference'::public.source_type,
  'en',
  'US',
  'nonprofit',
  '2026-09-29T03:45:00Z'::timestamptz,
  'First-aid draft source. Re-check and medically review before publication.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.medical_sources
  WHERE url = 'https://www.redcross.org/take-a-class/resources/learn-first-aid/seizures'
);

-- ---------------------------------------------------------------------------
-- Two common-condition drafts. They are intentionally inactive.
-- ---------------------------------------------------------------------------

INSERT INTO public.conditions (
  code, name_ar, name_en, summary_ar, summary_en, when_to_seek_care_ar,
  category, specialty, care_level, is_active, review_status, is_demo,
  change_reason, translation_status
)
SELECT
  'iron_deficiency_anemia',
  'فقر الدم الناجم عن نقص الحديد',
  'Iron deficiency anemia',
  'نوع شائع من فقر الدم يحدث عندما لا يتوفر للجسم ما يكفي من الحديد لإنتاج الهيموغلوبين. قد يرتبط بالتعب والدوخة والصداع وشحوب الجلد أو ضيق النفس، لكن هذه الأعراض غير نوعية ولا تكفي وحدها للتشخيص.',
  'A common type of anaemia that occurs when the body does not have enough iron to make haemoglobin. It may be associated with fatigue, dizziness, headache, pallor or shortness of breath, but symptoms alone are not diagnostic.',
  'رتّب تقييمًا طبيًا إذا كانت الأعراض مستمرة أو متكررة، خصوصًا مع شحوب واضح أو ضيق نفس أو وجود نزف معروف أو غزير. يحتاج التشخيص إلى تقييم سريري وفحوصات دم.',
  'hematology',
  'طب الأسرة / الباطنية / أمراض الدم',
  'routine'::public.care_level,
  false,
  'draft'::public.review_status,
  false,
  'Starter sourced draft; requires authorized medical review before activation.',
  'not_started'::public.translation_status
WHERE NOT EXISTS (
  SELECT 1 FROM public.conditions WHERE code = 'iron_deficiency_anemia'
);

INSERT INTO public.conditions (
  code, name_ar, name_en, summary_ar, summary_en, when_to_seek_care_ar,
  category, specialty, care_level, is_active, review_status, is_demo,
  change_reason, translation_status
)
SELECT
  'type2_diabetes',
  'السكري من النوع الثاني',
  'Type 2 diabetes',
  'حالة مزمنة يرتفع فيها سكر الدم، وقد تتطور أعراضها تدريجيًا أو لا تظهر أعراض واضحة. من الأعراض التي قد ترتبط بها كثرة التبول والعطش والتعب وفقدان الوزن غير المقصود أو تشوش الرؤية.',
  'A chronic condition with high blood glucose. Symptoms may develop gradually or may be absent; possible symptoms include frequent urination, increased thirst, fatigue, unintentional weight loss and blurred vision.',
  'راجع مقدم الرعاية لإجراء تقييم وفحوصات سكر الدم إذا كانت لديك أعراض متكررة مثل العطش وكثرة التبول أو كانت لديك عوامل خطورة. لا يُشخَّص السكري من الأعراض وحدها.',
  'endocrine',
  'طب الأسرة / الباطنية / الغدد الصماء',
  'routine'::public.care_level,
  false,
  'draft'::public.review_status,
  false,
  'Starter sourced draft; requires authorized medical review before activation.',
  'not_started'::public.translation_status
WHERE NOT EXISTS (
  SELECT 1 FROM public.conditions WHERE code = 'type2_diabetes'
);

-- Source links for the two draft conditions.
INSERT INTO public.condition_sources (condition_id, source_id)
SELECT c.id, s.id
FROM public.conditions c
JOIN public.medical_sources s
  ON s.url IN (
    'https://www.moh.gov.sa/healthawareness/educationalcontent/diseases/hematology/pages/0010.aspx',
    'https://www.who.int/health-topics/anaemia'
  )
WHERE c.code = 'iron_deficiency_anemia'
ON CONFLICT DO NOTHING;

INSERT INTO public.condition_sources (condition_id, source_id)
SELECT c.id, s.id
FROM public.conditions c
JOIN public.medical_sources s
  ON s.url IN (
    'https://www.moh.gov.sa/healthawareness/educationalcontent/diseases/diabetic/pages/008.aspx',
    'https://www.cdc.gov/diabetes/signs-symptoms/index.html'
  )
WHERE c.code = 'type2_diabetes'
ON CONFLICT DO NOTHING;

-- Draft matching relationships. The parent conditions remain inactive until review.
INSERT INTO public.condition_symptoms (
  condition_id, symptom_id, relationship_type, weight, is_core_symptom, is_demo
)
SELECT c.id, s.id, v.relationship_type::public.relationship_type, v.weight, v.is_core, false
FROM (VALUES
  ('iron_deficiency_anemia', 'fatigue', 'supports', 1.0::numeric, true),
  ('iron_deficiency_anemia', 'dizziness', 'supports', 1.0::numeric, true),
  ('iron_deficiency_anemia', 'headache', 'weak_support', 1.0::numeric, false),
  ('iron_deficiency_anemia', 'shortness_of_breath', 'weak_support', 1.0::numeric, false),
  ('type2_diabetes', 'excessive_thirst', 'supports', 1.0::numeric, true),
  ('type2_diabetes', 'frequent_urination', 'supports', 1.0::numeric, true),
  ('type2_diabetes', 'fatigue', 'weak_support', 1.0::numeric, false)
) AS v(condition_code, symptom_code, relationship_type, weight, is_core)
JOIN public.conditions c ON c.code = v.condition_code
JOIN public.symptoms s ON s.code = v.symptom_code
ON CONFLICT (condition_id, symptom_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- First-aid topic source links.
-- Existing topics remain draft; the new instruction bodies are also draft.
-- ---------------------------------------------------------------------------

INSERT INTO public.first_aid_sources (first_aid_topic_id, source_id)
SELECT t.id, s.id
FROM public.first_aid_topics t
JOIN public.medical_sources s
  ON s.url = 'https://www.redcross.org/take-a-class/resources/learn-first-aid/bleeding-life-threatening-external'
WHERE t.code = 'bleeding'
ON CONFLICT DO NOTHING;

INSERT INTO public.first_aid_sources (first_aid_topic_id, source_id)
SELECT t.id, s.id
FROM public.first_aid_topics t
JOIN public.medical_sources s
  ON s.url = 'https://www.redcross.org/take-a-class/resources/learn-first-aid/burns'
WHERE t.code = 'burns'
ON CONFLICT DO NOTHING;

INSERT INTO public.first_aid_sources (first_aid_topic_id, source_id)
SELECT t.id, s.id
FROM public.first_aid_topics t
JOIN public.medical_sources s
  ON s.url = 'https://www.redcross.org/take-a-class/resources/learn-first-aid/adult-child-choking'
WHERE t.code = 'choking'
ON CONFLICT DO NOTHING;

INSERT INTO public.first_aid_sources (first_aid_topic_id, source_id)
SELECT t.id, s.id
FROM public.first_aid_topics t
JOIN public.medical_sources s
  ON s.url = 'https://www.redcross.org/take-a-class/resources/learn-first-aid/seizures'
WHERE t.code = 'seizures'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Bleeding
-- ---------------------------------------------------------------------------

INSERT INTO public.first_aid_sections (
  topic_id, section_type, title_ar, title_en, content_ar, content_en,
  sort_order, review_status, change_reason, translation_status
)
SELECT t.id, v.section_type, v.title_ar, v.title_en, v.content_ar, v.content_en,
       v.sort_order, 'draft'::public.review_status,
       'Starter sourced draft; medical reviewer approval required.',
       'not_started'::public.translation_status
FROM public.first_aid_topics t
CROSS JOIN (VALUES
  ('what_is_happening', 'ما الذي يحدث؟', 'What is happening?',
   'قد يكون النزيف الخارجي مهددًا للحياة عندما يكون غزيرًا أو مستمرًا أو يندفع بقوة، وقد يصاحبه شحوب أو دوخة أو تغير في الاستجابة.',
   'External bleeding may be life-threatening when it is heavy, continuous or spurting, and may be accompanied by pallor, dizziness or altered responsiveness.', 1),
  ('when_to_call', 'متى أتصل بالطوارئ؟', 'When should I call emergency services?',
   'اطلب المساعدة الطارئة فورًا عند النزيف الغزير أو المستمر، أو اندفاع الدم، أو ظهور علامات صدمة، أو تدهور الوعي أو التنفس.',
   'Call emergency services immediately for heavy or continuous bleeding, spurting blood, signs of shock, or worsening responsiveness or breathing.', 2),
  ('do_now', 'ماذا أفعل الآن؟', 'What should I do now?',
   'تأكد من أمان المكان واستخدم حاجزًا مثل القفازات إن توفر. ضع ضمادة أو قطعة قماش نظيفة مباشرة على مصدر النزيف واضغط ضغطًا ثابتًا وقويًا. استمر بالضغط حتى يتوقف النزيف أو تصل المساعدة. استخدام العاصبة للنزيف المهدد للحياة من الأطراف يكون فقط إذا كانت متاحة وكنت مدربًا على استخدامها.',
   'Make sure the scene is safe and use a barrier such as gloves if available. Place a dressing or clean cloth directly over the bleeding source and apply firm, steady pressure. Continue until bleeding stops or help arrives. A tourniquet for life-threatening limb bleeding should be used only when available and within your training.', 3),
  ('dont_do', 'ماذا لا أفعل؟', 'What should I avoid?',
   'لا تنزع جسمًا مغروسًا في الجرح؛ اضغط حوله بدلًا من ذلك. لا ترفع الضمادة الأصلية لمجرد تشبعها بالدم أثناء الضغط.',
   'Do not remove an embedded object; apply pressure around it instead. Do not lift the original dressing simply because it becomes blood-soaked while pressure is being applied.', 4),
  ('while_waiting', 'أثناء انتظار الإسعاف', 'While waiting for help',
   'ابق مع المصاب وراقب التنفس والاستجابة. حافظ على دفئه قدر الإمكان واستمر في مراقبة عودة النزيف حتى وصول فريق الطوارئ.',
   'Stay with the person and monitor breathing and responsiveness. Keep them comfortably warm and continue watching for renewed bleeding until emergency help arrives.', 5)
) AS v(section_type, title_ar, title_en, content_ar, content_en, sort_order)
WHERE t.code = 'bleeding'
  AND NOT EXISTS (
    SELECT 1 FROM public.first_aid_sections x
    WHERE x.topic_id = t.id AND x.section_type = v.section_type
  );

-- ---------------------------------------------------------------------------
-- Burns
-- ---------------------------------------------------------------------------

INSERT INTO public.first_aid_sections (
  topic_id, section_type, title_ar, title_en, content_ar, content_en,
  sort_order, review_status, change_reason, translation_status
)
SELECT t.id, v.section_type, v.title_ar, v.title_en, v.content_ar, v.content_en,
       v.sort_order, 'draft'::public.review_status,
       'Starter sourced draft; medical reviewer approval required.',
       'not_started'::public.translation_status
FROM public.first_aid_topics t
CROSS JOIN (VALUES
  ('what_is_happening', 'ما الذي يحدث؟', 'What is happening?',
   'الحرق إصابة للجلد وقد تمتد للأنسجة الأعمق، وقد ينتج عن الحرارة أو المواد الكيميائية أو الكهرباء أو الإشعاع.',
   'A burn is an injury to the skin and sometimes deeper tissues, and may be caused by heat, chemicals, electricity or radiation.', 1),
  ('when_to_call', 'متى أتصل بالطوارئ؟', 'When should I call emergency services?',
   'اطلب مساعدة طارئة للحروق العميقة أو الواسعة، أو حروق الوجه أو الفم أو الرقبة أو اليدين أو القدمين أو المفاصل أو المنطقة الحساسة، وكذلك الحروق الكهربائية أو الكيميائية أو عند وجود صعوبة في التنفس.',
   'Seek emergency help for deep or extensive burns, burns involving the face, mouth, neck, hands, feet, joints or groin, electrical or chemical burns, or any associated breathing difficulty.', 2),
  ('do_now', 'ماذا أفعل الآن؟', 'What should I do now?',
   'أوقف مصدر الحرق إذا كان ذلك آمنًا. أزل الحلي أو الملابس غير الملتصقة بمكان الحرق. برّد المنطقة بماء جارٍ نظيف وبارد لمدة نحو 5 إلى 20 دقيقة. إذا تعذر الماء الجاري يمكن استخدام كمادة باردة نظيفة.',
   'Stop the burning source if it is safe to do so. Remove jewelry or clothing that is not stuck to the burn. Cool the area with clean, cool running water for about 5 to 20 minutes. If running water is unavailable, use a clean cool compress.', 3),
  ('dont_do', 'ماذا لا أفعل؟', 'What should I avoid?',
   'لا تنزع الملابس الملتصقة بالجلد، ولا تضع الزبدة أو الزيوت أو المواد الدهنية على الحرق. لا تحاول تنظيف الحروق الشديدة بعنف.',
   'Do not pull away clothing stuck to the skin, and do not apply butter, oils or greasy substances to a burn. Do not aggressively clean a severe burn.', 4),
  ('while_waiting', 'أثناء انتظار الإسعاف', 'While waiting for help',
   'بعد التبريد، راقب التنفس والاستجابة. إذا لزم النقل أو تأخر وصول المساعدة يمكن تغطية الحرق تغطية خفيفة بضمادة نظيفة دون ضغط، مع تجنب انخفاض حرارة الجسم عند الحروق الواسعة.',
   'After cooling, monitor breathing and responsiveness. If transport is needed or help is delayed, the burn may be loosely covered with a clean dressing without pressure, while avoiding excessive cooling in large burns.', 5)
) AS v(section_type, title_ar, title_en, content_ar, content_en, sort_order)
WHERE t.code = 'burns'
  AND NOT EXISTS (
    SELECT 1 FROM public.first_aid_sections x
    WHERE x.topic_id = t.id AND x.section_type = v.section_type
  );

-- ---------------------------------------------------------------------------
-- Adult/child choking (not infant instructions)
-- ---------------------------------------------------------------------------

INSERT INTO public.first_aid_sections (
  topic_id, section_type, title_ar, title_en, content_ar, content_en,
  sort_order, review_status, change_reason, translation_status
)
SELECT t.id, v.section_type, v.title_ar, v.title_en, v.content_ar, v.content_en,
       v.sort_order, 'draft'::public.review_status,
       'Starter sourced draft for adult/child choking; medical reviewer approval required.',
       'not_started'::public.translation_status
FROM public.first_aid_topics t
CROSS JOIN (VALUES
  ('what_is_happening', 'ما الذي يحدث؟', 'What is happening?',
   'يحدث الاختناق عندما ينسد مجرى الهواء جزئيًا أو كليًا. عدم القدرة على الكلام أو السعال أو إصدار صوت، أو وجود سعال ضعيف جدًا أو تغير لون الجلد، علامات تستدعي تصرفًا عاجلًا.',
   'Choking occurs when the airway is partly or completely blocked. Inability to speak, cough or make sound, a very weak cough, or color change are signs requiring urgent action.', 1),
  ('when_to_call', 'متى أتصل بالطوارئ؟', 'When should I call emergency services?',
   'اطلب الطوارئ فورًا إذا كان الشخص لا يستطيع السعال أو الكلام أو البكاء، أو أصبح شاحبًا أو مزرقًا، أو فقد الاستجابة.',
   'Call emergency services immediately if the person cannot cough, speak or cry, becomes pale or blue, or becomes unresponsive.', 2),
  ('do_now', 'ماذا أفعل الآن؟', 'What should I do now?',
   'إذا كان البالغ أو الطفل قادرًا على السعال بقوة فشجعه على الاستمرار وراقبه. إذا كان غير قادر على السعال أو الكلام، فتعليمات الصليب الأحمر للبالغ والطفل هي 5 ضربات بين لوحي الكتف ثم 5 ضغطات بطنية، وتكرر حتى يتحسن أو يفقد الاستجابة. للحامل أو من يتعذر إحاطة البطن لديه تُستخدم ضغطات الصدر بدل الضغطات البطنية.',
   'If an adult or child can cough forcefully, encourage continued coughing and monitor. If unable to cough or speak, Red Cross adult/child guidance uses 5 back blows followed by 5 abdominal thrusts, repeated until the obstruction clears or the person becomes unresponsive. Chest thrusts are used instead of abdominal thrusts for pregnancy or when the abdomen cannot be encircled.', 3),
  ('dont_do', 'ماذا لا أفعل؟', 'What should I avoid?',
   'لا تُدخل إصبعك داخل الفم بشكل أعمى. أزل الجسم فقط إذا كان ظاهرًا ويمكن الوصول إليه بأمان. هذه الخطوات ليست تعليمات للرضّع.',
   'Do not perform a blind finger sweep. Remove an object only if it is visible and can be reached safely. These steps are not infant choking instructions.', 4),
  ('while_waiting', 'أثناء انتظار الإسعاف', 'While waiting for help',
   'استمر في المراقبة والتدخل حسب التدريب. إذا أصبح الشخص غير مستجيب، اتبع تعليمات مركز الطوارئ وابدأ الإنعاش القلبي الرئوي فقط حسب مستوى تدريبك وتعليمات المرسل.',
   'Continue to monitor and provide care within your training. If the person becomes unresponsive, follow emergency-dispatch instructions and begin CPR according to your training and dispatcher guidance.', 5)
) AS v(section_type, title_ar, title_en, content_ar, content_en, sort_order)
WHERE t.code = 'choking'
  AND NOT EXISTS (
    SELECT 1 FROM public.first_aid_sections x
    WHERE x.topic_id = t.id AND x.section_type = v.section_type
  );

-- ---------------------------------------------------------------------------
-- Seizures
-- ---------------------------------------------------------------------------

INSERT INTO public.first_aid_sections (
  topic_id, section_type, title_ar, title_en, content_ar, content_en,
  sort_order, review_status, change_reason, translation_status
)
SELECT t.id, v.section_type, v.title_ar, v.title_en, v.content_ar, v.content_en,
       v.sort_order, 'draft'::public.review_status,
       'Starter sourced draft; medical reviewer approval required.',
       'not_started'::public.translation_status
FROM public.first_aid_topics t
CROSS JOIN (VALUES
  ('what_is_happening', 'ما الذي يحدث؟', 'What is happening?',
   'التشنج ناتج عن نشاط كهربائي غير طبيعي مؤقت في الدماغ وقد يسبب تغيرات لا إرادية في الحركة أو الوعي أو السلوك. توجد أسباب متعددة للتشنجات ولا يمكن تحديد السبب من التطبيق وحده.',
   'A seizure results from temporary abnormal electrical activity in the brain and can cause involuntary changes in movement, awareness or behavior. Seizures have many possible causes and the app cannot determine the cause.', 1),
  ('when_to_call', 'متى أتصل بالطوارئ؟', 'When should I call emergency services?',
   'اطلب الطوارئ إذا استمرت النوبة أكثر من 5 دقائق، أو تكررت النوبات دون تعافٍ، أو كانت أول نوبة معروفة، أو حدثت إصابة، أو وقعت النوبة في الماء، أو لم يعد الشخص يتنفس بصورة طبيعية.',
   'Call emergency services if a seizure lasts more than 5 minutes, repeats without recovery, is a first known seizure, causes injury, occurs in water, or the person does not resume normal breathing.', 2),
  ('do_now', 'ماذا أفعل الآن؟', 'What should I do now?',
   'اترك النوبة تأخذ مجراها ولا تحاول إيقاف الحركة بالقوة. أبعد الأشياء التي قد تسبب إصابة، وراقب التنفس والاستجابة. بعد توقف الحركات، ضع الشخص على جانبه إذا كان ذلك آمنًا ومناسبًا.',
   'Let the seizure run its course and do not try to stop the movements by force. Move objects that could cause injury and monitor breathing and responsiveness. After convulsions stop, place the person on their side if it is safe and appropriate.', 3),
  ('dont_do', 'ماذا لا أفعل؟', 'What should I avoid?',
   'لا تقيد حركة الشخص، ولا تضع أي جسم أو طعام أو شراب داخل فمه أثناء النوبة.',
   'Do not restrain the person and do not put any object, food or drink into the mouth during a seizure.', 4),
  ('while_waiting', 'أثناء انتظار الإسعاف', 'While waiting for help',
   'ابق مع الشخص وراقب التنفس والوعي بعد النوبة. إذا كان غير مستجيب لكنه يتنفس، ضعه في وضع الإفاقة إذا أمكن بأمان. إذا كان لا يتنفس بصورة طبيعية فاتبع تعليمات الطوارئ والإنعاش حسب تدريبك.',
   'Stay with the person and monitor breathing and awareness after the seizure. If unresponsive but breathing, use a recovery position when safe. If not breathing normally, follow emergency-dispatch and resuscitation guidance according to your training.', 5)
) AS v(section_type, title_ar, title_en, content_ar, content_en, sort_order)
WHERE t.code = 'seizures'
  AND NOT EXISTS (
    SELECT 1 FROM public.first_aid_sections x
    WHERE x.topic_id = t.id AND x.section_type = v.section_type
  );
