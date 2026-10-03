-- First-aid Stage 3 operator script.
-- Run only after Stage 1 schema repair and Stage 2 governance checks are READY.
-- Inserts authoritative sources, topic-source links, and 60 Draft sections.
-- Safe to re-run: source, link, and section inserts are idempotent.

-- ============================================================================
-- STAGE 3: authoritative sources, source links, and 12 x 5 Draft sections
-- ============================================================================
BEGIN;

-- ---------------------------------------------------------------------------
-- Restore the four original sourced first-aid packs.
-- ---------------------------------------------------------------------------


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

-- ============================================================================
-- Sources
-- ============================================================================

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
  'government_health_service',
  '2026-10-02T20:30:00Z'::timestamptz,
  'First-aid draft source for fainting. Medical review required before publication.',
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
  'Head, Neck, and Spinal Injury',
  'American Red Cross',
  'https://production.redcross.org/take-a-class/learn-fa-head-neck-spinal-injury.html',
  'reference'::public.source_type,
  'en',
  'US',
  'nonprofit',
  '2026-10-02T20:30:00Z'::timestamptz,
  'First-aid draft source for significant head injury. Medical review required before publication.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.medical_sources
  WHERE url = 'https://production.redcross.org/take-a-class/learn-fa-head-neck-spinal-injury.html'
);

INSERT INTO public.medical_sources (
  title, organization, url, source_type, language, country,
  organization_type, last_verified_at, notes, is_active
)
SELECT
  'Fractures: Types, Symptoms, and Treatment',
  'American Red Cross',
  'https://production.redcross.org/take-a-class/learn-fa-fractures.html',
  'reference'::public.source_type,
  'en',
  'US',
  'nonprofit',
  '2026-10-02T20:30:00Z'::timestamptz,
  'First-aid draft source for suspected fractures. Medical review required before publication.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.medical_sources
  WHERE url = 'https://production.redcross.org/take-a-class/learn-fa-fractures.html'
);

INSERT INTO public.medical_sources (
  title, organization, url, source_type, language, country,
  organization_type, last_verified_at, notes, is_active
)
SELECT
  'Poisoning',
  'NHS',
  'https://www.nhs.uk/conditions/Poisoning/',
  'government'::public.source_type,
  'en',
  'GB',
  'government_health_service',
  '2026-10-02T20:30:00Z'::timestamptz,
  'First-aid draft source for suspected poisoning. Medical review required before publication.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.medical_sources
  WHERE url = 'https://www.nhs.uk/conditions/Poisoning/'
);

INSERT INTO public.medical_sources (
  title, organization, url, source_type, language, country,
  organization_type, last_verified_at, notes, is_active
)
SELECT
  'Anaphylaxis',
  'NHS',
  'https://www.nhs.uk/conditions/anaphylaxis/',
  'government'::public.source_type,
  'en',
  'GB',
  'government_health_service',
  '2026-10-02T20:30:00Z'::timestamptz,
  'First-aid draft source for anaphylaxis. Medical review required before publication.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.medical_sources
  WHERE url = 'https://www.nhs.uk/conditions/anaphylaxis/'
);

INSERT INTO public.medical_sources (
  title, organization, url, source_type, language, country,
  organization_type, last_verified_at, notes, is_active
)
SELECT
  'Heart attack',
  'NHS',
  'https://www.nhs.uk/conditions/heart-attack/',
  'government'::public.source_type,
  'en',
  'GB',
  'government_health_service',
  '2026-10-02T20:30:00Z'::timestamptz,
  'First-aid draft source for emergency chest-pain guidance. Medication-specific advice is intentionally omitted from this consumer draft pending medical review.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.medical_sources
  WHERE url = 'https://www.nhs.uk/conditions/heart-attack/'
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
  'government_health_service',
  '2026-10-02T20:30:00Z'::timestamptz,
  'First-aid draft source for severe breathing difficulty. Medical review required before publication.',
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
  'Eye injuries',
  'NHS',
  'https://www.nhs.uk/conditions/Eye-injuries/',
  'government'::public.source_type,
  'en',
  'GB',
  'government_health_service',
  '2026-10-02T20:30:00Z'::timestamptz,
  'First-aid draft source for eye injury and chemical exposure. Medical review required before publication.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.medical_sources
  WHERE url = 'https://www.nhs.uk/conditions/Eye-injuries/'
);

-- ============================================================================
-- Topic-to-source links
-- ============================================================================

INSERT INTO public.first_aid_sources (first_aid_topic_id, source_id)
SELECT t.id, s.id
FROM public.first_aid_topics t
CROSS JOIN (
  VALUES
    ('fainting', 'https://www.nhs.uk/symptoms/fainting/'),
    ('head_injury', 'https://production.redcross.org/take-a-class/learn-fa-head-neck-spinal-injury.html'),
    ('fractures', 'https://production.redcross.org/take-a-class/learn-fa-fractures.html'),
    ('poisoning', 'https://www.nhs.uk/conditions/Poisoning/'),
    ('anaphylaxis', 'https://www.nhs.uk/conditions/anaphylaxis/'),
    ('chest_pain', 'https://www.nhs.uk/conditions/heart-attack/'),
    ('breathing', 'https://www.nhs.uk/symptoms/shortness-of-breath/'),
    ('eye_injury', 'https://www.nhs.uk/conditions/Eye-injuries/')
) AS v(code, url)
JOIN public.medical_sources s ON s.url = v.url
WHERE t.code = v.code
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Fainting
-- ============================================================================

INSERT INTO public.first_aid_sections (
  topic_id, section_type, title_ar, title_en, content_ar, content_en,
  sort_order, review_status, change_reason, translation_status
)
SELECT
  t.id, v.section_type, v.title_ar, v.title_en, v.content_ar, v.content_en,
  v.sort_order, 'draft'::public.review_status,
  'Source-backed first-aid draft; medical reviewer approval required.',
  'not_started'::public.translation_status
FROM public.first_aid_topics t
CROSS JOIN (VALUES
  (
    'what_is_happening',
    'ما الذي يحدث؟',
    'What is happening?',
    'الإغماء هو فقدان قصير للوعي. قد تكون أسبابه بسيطة أو تحتاج تقييمًا طبيًا، لذلك لا يفترض التطبيق سببًا محددًا.',
    'Fainting is a brief loss of consciousness. Causes vary, so the app does not assume a diagnosis.',
    1
  ),
  (
    'when_to_call',
    'متى أتصل بالطوارئ؟',
    'When should I call emergency services?',
    'اطلب الطوارئ إذا كان الشخص لا يتنفس، لا يستيقظ سريعًا، لم يتعافَ بالكامل، لديه ألم صدر أو إصابة خطيرة أو تشنج، أو حدث الإغماء أثناء المجهود أو الاستلقاء.',
    'Call emergency services for absent breathing, delayed waking, incomplete recovery, chest pain, serious injury, seizure, or fainting during exercise or while lying down.',
    2
  ),
  (
    'do_now',
    'ماذا أفعل الآن؟',
    'What should I do now?',
    'تحقق من الاستجابة والتنفس. إذا كان يتنفس طبيعيًا، اجعله مستلقيًا وارفع ساقيه إن كان ذلك آمنًا ومناسبًا.',
    'Check responsiveness and breathing. If breathing normally, lay the person down and raise the legs when safe and appropriate.',
    3
  ),
  (
    'dont_do',
    'ماذا لا أفعل؟',
    'What should I avoid?',
    'لا تترك شخصًا غير مستجيب وحده، ولا تفترض أن فقدان الوعي غير مهم إذا استمر أو صاحبه عرض خطير.',
    'Do not leave an unresponsive person alone or dismiss persistent loss of consciousness or associated danger signs.',
    4
  ),
  (
    'while_waiting',
    'أثناء انتظار الإسعاف',
    'While waiting for help',
    'راقب التنفس والاستجابة باستمرار، واتبع تعليمات مركز الطوارئ. إذا توقف التنفس الطبيعي فاتبع إرشادات الإنعاش حسب تدريبك.',
    'Keep monitoring breathing and responsiveness and follow emergency-dispatch instructions. If normal breathing stops, follow resuscitation guidance within your training.',
    5
  )
) AS v(section_type, title_ar, title_en, content_ar, content_en, sort_order)
WHERE t.code = 'fainting'
  AND NOT EXISTS (
    SELECT 1
    FROM public.first_aid_sections x
    WHERE x.topic_id = t.id
      AND x.section_type = v.section_type
  );

-- ============================================================================
-- Head injury
-- ============================================================================

INSERT INTO public.first_aid_sections (
  topic_id, section_type, title_ar, title_en, content_ar, content_en,
  sort_order, review_status, change_reason, translation_status
)
SELECT
  t.id, v.section_type, v.title_ar, v.title_en, v.content_ar, v.content_en,
  v.sort_order, 'draft'::public.review_status,
  'Source-backed first-aid draft; medical reviewer approval required.',
  'not_started'::public.translation_status
FROM public.first_aid_topics t
CROSS JOIN (VALUES
  (
    'what_is_happening',
    'ما الذي يحدث؟',
    'What is happening?',
    'إصابات الرأس قد تؤثر في الدماغ أو الرقبة أو العمود الفقري، وقد لا تظهر كل العلامات الخطرة مباشرة بعد الإصابة.',
    'Head injuries can involve the brain, neck or spine, and serious warning signs may not be immediately obvious.',
    1
  ),
  (
    'when_to_call',
    'متى أتصل بالطوارئ؟',
    'When should I call emergency services?',
    'اطلب الطوارئ عند ارتباك أو تغير الوعي، ضعف أو خدر، تشنج، نزيف شديد، قيء متكرر، صعوبة تنفس، أو إصابة قوية مع ألم أو تشوه بالرأس أو الرقبة أو الظهر.',
    'Call emergency services for confusion, altered alertness, weakness or numbness, seizure, heavy bleeding, repeated vomiting, breathing problems, or major injury with head, neck or back pain or deformity.',
    2
  ),
  (
    'do_now',
    'ماذا أفعل الآن؟',
    'What should I do now?',
    'اطلب من المصاب ألا يتحرك، واتركه في الوضع الذي وجدته عليه ما لم يكن هناك خطر مباشر أو حاجة للإنعاش أو السيطرة على نزيف شديد.',
    'Ask the person not to move and leave them in the position found unless safety, CPR or severe bleeding requires movement.',
    3
  ),
  (
    'dont_do',
    'ماذا لا أفعل؟',
    'What should I avoid?',
    'لا تحرك الرأس أو الرقبة بلا ضرورة، ولا تنزع خوذة الحماية لمجرد الفحص إذا كان الاشتباه بإصابة خطيرة قائمًا.',
    'Avoid unnecessary head or neck movement and do not remove a protective helmet solely for examination when serious injury is suspected.',
    4
  ),
  (
    'while_waiting',
    'أثناء انتظار الإسعاف',
    'While waiting for help',
    'راقب التنفس والاستجابة وأي تدهور جديد، وحافظ على راحة المصاب ودفئه دون تحريك موضع الإصابة.',
    'Monitor breathing, responsiveness and any deterioration while keeping the person comfortable and avoiding unnecessary movement.',
    5
  )
) AS v(section_type, title_ar, title_en, content_ar, content_en, sort_order)
WHERE t.code = 'head_injury'
  AND NOT EXISTS (
    SELECT 1
    FROM public.first_aid_sections x
    WHERE x.topic_id = t.id
      AND x.section_type = v.section_type
  );

-- ============================================================================
-- Fractures
-- ============================================================================

INSERT INTO public.first_aid_sections (
  topic_id, section_type, title_ar, title_en, content_ar, content_en,
  sort_order, review_status, change_reason, translation_status
)
SELECT
  t.id, v.section_type, v.title_ar, v.title_en, v.content_ar, v.content_en,
  v.sort_order, 'draft'::public.review_status,
  'Source-backed first-aid draft; medical reviewer approval required.',
  'not_started'::public.translation_status
FROM public.first_aid_topics t
CROSS JOIN (VALUES
  (
    'what_is_happening',
    'ما الذي يحدث؟',
    'What is happening?',
    'قد يكون الألم أو التورم أو التشوه بعد الإصابة كسرًا أو إصابة عضلية أو مفصلية، ولا يمكن تأكيد الكسر من التطبيق.',
    'Pain, swelling or deformity after injury may represent a fracture or another musculoskeletal injury; the app cannot confirm a fracture.',
    1
  ),
  (
    'when_to_call',
    'متى أتصل بالطوارئ؟',
    'When should I call emergency services?',
    'اطلب الطوارئ عند تشوه واضح، عظم ظاهر أو نزيف شديد، خدر أو برودة أسفل الإصابة، إصابة الرأس أو الرقبة أو العمود أو الحوض أو أعلى الساق، إصابات متعددة أو علامات صدمة.',
    'Call emergency services for major deformity, exposed bone or severe bleeding, distal numbness or coldness, head/neck/spine/pelvis/upper-leg injury, multiple severe injuries or shock.',
    2
  ),
  (
    'do_now',
    'ماذا أفعل الآن؟',
    'What should I do now?',
    'اجعل المصاب يرتاح ولا تحرك أو تفرد الجزء المصاب. للنزيف المفتوح اضغط للسيطرة عليه، وللإصابة المغلقة يمكن استخدام كمادة باردة ملفوفة.',
    'Let the person rest without moving or straightening the injured part. Control open bleeding with pressure; a wrapped cold pack may be used for a closed injury.',
    3
  ),
  (
    'dont_do',
    'ماذا لا أفعل؟',
    'What should I avoid?',
    'لا تحاول إعادة العظم أو المفصل إلى مكانه، ولا تختبر الحركة بالقوة للتأكد من وجود كسر.',
    'Do not attempt to realign a bone or joint and do not force movement to test whether a fracture is present.',
    4
  ),
  (
    'while_waiting',
    'أثناء انتظار الإسعاف',
    'While waiting for help',
    'راقب الدورة الدموية والتنفس والاستجابة، وحافظ على دفء المصاب وطمئنه حتى وصول المساعدة.',
    'Monitor circulation, breathing and responsiveness, keep the person comfortably warm and reassure them until help arrives.',
    5
  )
) AS v(section_type, title_ar, title_en, content_ar, content_en, sort_order)
WHERE t.code = 'fractures'
  AND NOT EXISTS (
    SELECT 1
    FROM public.first_aid_sections x
    WHERE x.topic_id = t.id
      AND x.section_type = v.section_type
  );

-- ============================================================================
-- Poisoning
-- ============================================================================

INSERT INTO public.first_aid_sections (
  topic_id, section_type, title_ar, title_en, content_ar, content_en,
  sort_order, review_status, change_reason, translation_status
)
SELECT
  t.id, v.section_type, v.title_ar, v.title_en, v.content_ar, v.content_en,
  v.sort_order, 'draft'::public.review_status,
  'Source-backed first-aid draft; medical reviewer approval required.',
  'not_started'::public.translation_status
FROM public.first_aid_topics t
CROSS JOIN (VALUES
  (
    'what_is_happening',
    'ما الذي يحدث؟',
    'What is happening?',
    'قد يحدث التسمم بعد ابتلاع أو لمس أو استنشاق مادة ضارة، وقد تتأخر الأعراض حسب المادة والكمية.',
    'Poisoning can follow swallowing, touching or breathing a harmful substance, and symptoms may be delayed.',
    1
  ),
  (
    'when_to_call',
    'متى أتصل بالطوارئ؟',
    'When should I call emergency services?',
    'اطلب المساعدة الطبية فورًا عند الاشتباه بالتسمم، وخاصة مع فقدان الوعي أو توقف التنفس أو صعوبة شديدة في التنفس أو حدوث تشنج.',
    'Seek immediate medical help for suspected poisoning, especially with unconsciousness, absent breathing, severe breathing difficulty or seizure.',
    2
  ),
  (
    'do_now',
    'ماذا أفعل الآن؟',
    'What should I do now?',
    'تحقق من التنفس والاستجابة، وحاول تحديد المادة أو العبوة دون تعريض نفسك للخطر، واحتفظ بها لعرضها على فريق الرعاية إن أمكن.',
    'Check breathing and responsiveness and identify the substance or container without putting yourself at risk; keep it for healthcare staff if possible.',
    3
  ),
  (
    'dont_do',
    'ماذا لا أفعل؟',
    'What should I avoid?',
    'لا تحاول إحداث القيء ولا تعطِ المصاب طعامًا أو شرابًا ما لم يطلب منك مختص أو مركز السموم ذلك.',
    'Do not induce vomiting or give food or drink unless a qualified professional or poison service specifically instructs you.',
    4
  ),
  (
    'while_waiting',
    'أثناء انتظار الإسعاف',
    'While waiting for help',
    'راقب التنفس والوعي. إذا كان فاقد الوعي لكنه يتنفس، استخدم وضع الإفاقة إن كان مناسبًا؛ وإذا توقف التنفس اتبع تعليمات الإنعاش.',
    'Monitor breathing and consciousness. Use a recovery position if unconscious but breathing when appropriate; if breathing stops, follow resuscitation instructions.',
    5
  )
) AS v(section_type, title_ar, title_en, content_ar, content_en, sort_order)
WHERE t.code = 'poisoning'
  AND NOT EXISTS (
    SELECT 1
    FROM public.first_aid_sections x
    WHERE x.topic_id = t.id
      AND x.section_type = v.section_type
  );

-- ============================================================================
-- Anaphylaxis
-- ============================================================================

INSERT INTO public.first_aid_sections (
  topic_id, section_type, title_ar, title_en, content_ar, content_en,
  sort_order, review_status, change_reason, translation_status
)
SELECT
  t.id, v.section_type, v.title_ar, v.title_en, v.content_ar, v.content_en,
  v.sort_order, 'draft'::public.review_status,
  'Source-backed first-aid draft; medical reviewer approval required.',
  'not_started'::public.translation_status
FROM public.first_aid_topics t
CROSS JOIN (VALUES
  (
    'what_is_happening',
    'ما الذي يحدث؟',
    'What is happening?',
    'الحساسية المفرطة تفاعل تحسسي شديد وسريع قد يهدد الحياة ويؤثر في مجرى الهواء أو التنفس أو الدورة الدموية.',
    'Anaphylaxis is a rapid, severe allergic reaction that can threaten the airway, breathing or circulation.',
    1
  ),
  (
    'when_to_call',
    'متى أتصل بالطوارئ؟',
    'When should I call emergency services?',
    'اتصل بالطوارئ فورًا عند تورم مفاجئ بالفم أو اللسان أو الحلق، صعوبة شديدة في التنفس أو البلع، دوخة شديدة أو ارتباك، أو إغماء وعدم استجابة.',
    'Call emergency services immediately for sudden mouth, tongue or throat swelling, severe breathing or swallowing difficulty, marked dizziness/confusion, or unresponsiveness.',
    2
  ),
  (
    'do_now',
    'ماذا أفعل الآن؟',
    'What should I do now?',
    'استخدم قلم الأدرينالين الذاتي الموصوف للشخص إذا كان متوفرًا واتبع تعليمات الجهاز، ثم اطلب الإسعاف. اجعله مستلقيًا، مع تعديل الوضع إذا كان التنفس صعبًا.',
    'Use the person’s prescribed adrenaline auto-injector if available and follow its instructions, then call emergency services. Keep them lying down, adjusting position for breathing difficulty.',
    3
  ),
  (
    'dont_do',
    'ماذا لا أفعل؟',
    'What should I avoid?',
    'لا تجعل المصاب يقف أو يمشي حتى لو بدأ يشعر بتحسن، ولا تؤخر الاتصال بالطوارئ انتظارًا لزوال الأعراض.',
    'Do not have the person stand or walk even if they improve, and do not delay emergency help while waiting for symptoms to settle.',
    4
  ),
  (
    'while_waiting',
    'أثناء انتظار الإسعاف',
    'While waiting for help',
    'راقب التنفس والاستجابة، واتبع تعليمات الطوارئ وتعليمات قلم الأدرينالين الموصوف. إذا تدهورت الحالة أخبر مركز الطوارئ فورًا.',
    'Monitor breathing and responsiveness and follow emergency-dispatch and prescribed auto-injector instructions. Report deterioration immediately.',
    5
  )
) AS v(section_type, title_ar, title_en, content_ar, content_en, sort_order)
WHERE t.code = 'anaphylaxis'
  AND NOT EXISTS (
    SELECT 1
    FROM public.first_aid_sections x
    WHERE x.topic_id = t.id
      AND x.section_type = v.section_type
  );

-- ============================================================================
-- Chest pain / possible heart attack
-- ============================================================================

INSERT INTO public.first_aid_sections (
  topic_id, section_type, title_ar, title_en, content_ar, content_en,
  sort_order, review_status, change_reason, translation_status
)
SELECT
  t.id, v.section_type, v.title_ar, v.title_en, v.content_ar, v.content_en,
  v.sort_order, 'draft'::public.review_status,
  'Source-backed first-aid draft; medical reviewer approval required.',
  'not_started'::public.translation_status
FROM public.first_aid_topics t
CROSS JOIN (VALUES
  (
    'what_is_happening',
    'ما الذي يحدث؟',
    'What is happening?',
    'ألم أو ثقل أو ضغط الصدر قد تكون له أسباب متعددة، وبعضها مثل النوبة القلبية يحتاج علاجًا طارئًا.',
    'Chest pain, pressure or heaviness has many possible causes, and some, including heart attack, require emergency treatment.',
    1
  ),
  (
    'when_to_call',
    'متى أتصل بالطوارئ؟',
    'When should I call emergency services?',
    'اتصل بالطوارئ عند ألم أو ضغط صدري شديد أو مستمر، خاصة إذا انتشر للذراع أو الظهر أو الرقبة أو الفك أو صاحبه ضيق نفس شديد أو فقدان استجابة.',
    'Call emergency services for severe or persistent chest pain or pressure, especially if it spreads to the arm, back, neck or jaw, or accompanies severe breathlessness or unresponsiveness.',
    2
  ),
  (
    'do_now',
    'ماذا أفعل الآن؟',
    'What should I do now?',
    'أوقف المجهود واجعل الشخص يجلس ويرتاح في وضع مريح، واتصل بالطوارئ إذا كانت العلامات مقلقة.',
    'Stop exertion, have the person sit and rest in a comfortable position, and contact emergency services when warning signs are present.',
    3
  ),
  (
    'dont_do',
    'ماذا لا أفعل؟',
    'What should I avoid?',
    'لا تجعل الشخص يقود نفسه للمستشفى، ولا تعطه دواءً جديدًا أو دواء شخص آخر. اتبع فقط تعليمات الطوارئ والأدوية الموصوفة له.',
    'Do not let the person drive themselves or give new or someone else’s medication. Follow emergency-dispatch instructions and the person’s prescribed emergency medicine only.',
    4
  ),
  (
    'while_waiting',
    'أثناء انتظار الإسعاف',
    'While waiting for help',
    'استمر في مراقبة التنفس والاستجابة، وأبقِ الشخص مرتاحًا. إذا أصبح غير مستجيب أو توقف التنفس الطبيعي فاتبع تعليمات الإنعاش.',
    'Continue monitoring breathing and responsiveness and keep the person at rest. If unresponsive or normal breathing stops, follow resuscitation instructions.',
    5
  )
) AS v(section_type, title_ar, title_en, content_ar, content_en, sort_order)
WHERE t.code = 'chest_pain'
  AND NOT EXISTS (
    SELECT 1
    FROM public.first_aid_sections x
    WHERE x.topic_id = t.id
      AND x.section_type = v.section_type
  );

-- ============================================================================
-- Breathing difficulty
-- ============================================================================

INSERT INTO public.first_aid_sections (
  topic_id, section_type, title_ar, title_en, content_ar, content_en,
  sort_order, review_status, change_reason, translation_status
)
SELECT
  t.id, v.section_type, v.title_ar, v.title_en, v.content_ar, v.content_en,
  v.sort_order, 'draft'::public.review_status,
  'Source-backed first-aid draft; medical reviewer approval required.',
  'not_started'::public.translation_status
FROM public.first_aid_topics t
CROSS JOIN (VALUES
  (
    'what_is_happening',
    'ما الذي يحدث؟',
    'What is happening?',
    'ضيق التنفس له أسباب كثيرة، ولا يمكن تحديد السبب من شدة الإحساس أو من رقم قياس واحد وحده.',
    'Shortness of breath has many causes, and the app cannot determine the cause from symptoms or a single measurement alone.',
    1
  ),
  (
    'when_to_call',
    'متى أتصل بالطوارئ؟',
    'When should I call emergency services?',
    'اطلب الطوارئ عند صعوبة شديدة في التنفس أو اللهاث أو الاختناق أو عدم القدرة على الكلام، أو ثقل الصدر، أو زرقة أو شحوب شديد، أو ارتباك مفاجئ.',
    'Call emergency services for severe breathing difficulty, gasping, choking, inability to speak, chest heaviness, marked pallor/blue-grey color, or sudden confusion.',
    2
  ),
  (
    'do_now',
    'ماذا أفعل الآن؟',
    'What should I do now?',
    'ساعد الشخص على اتخاذ وضع مريح للتنفس وأوقف المجهود، واتبع خطة الطوارئ أو الدواء الإسعافي الموصوف له إن كان لديه واحد.',
    'Help the person into a comfortable breathing position, stop exertion, and follow their prescribed emergency plan or reliever medication if they have one.',
    3
  ),
  (
    'dont_do',
    'ماذا لا أفعل؟',
    'What should I avoid?',
    'لا تحاول تشخيص سبب ضيق التنفس بنفسك، ولا تؤخر طلب الطوارئ عند وجود علامات خطورة.',
    'Do not try to self-diagnose the cause and do not delay emergency help when danger signs are present.',
    4
  ),
  (
    'while_waiting',
    'أثناء انتظار الإسعاف',
    'While waiting for help',
    'ابق مع الشخص وراقب التنفس والاستجابة. جهّز معلومات الأمراض والأدوية المعروفة للمسعفين إن أمكن.',
    'Stay with the person and monitor breathing and responsiveness. Have known medical and medication information ready for responders when possible.',
    5
  )
) AS v(section_type, title_ar, title_en, content_ar, content_en, sort_order)
WHERE t.code = 'breathing'
  AND NOT EXISTS (
    SELECT 1
    FROM public.first_aid_sections x
    WHERE x.topic_id = t.id
      AND x.section_type = v.section_type
  );

-- ============================================================================
-- Eye injury
-- ============================================================================

INSERT INTO public.first_aid_sections (
  topic_id, section_type, title_ar, title_en, content_ar, content_en,
  sort_order, review_status, change_reason, translation_status
)
SELECT
  t.id, v.section_type, v.title_ar, v.title_en, v.content_ar, v.content_en,
  v.sort_order, 'draft'::public.review_status,
  'Source-backed first-aid draft; medical reviewer approval required.',
  'not_started'::public.translation_status
FROM public.first_aid_topics t
CROSS JOIN (VALUES
  (
    'what_is_happening',
    'ما الذي يحدث؟',
    'What is happening?',
    'إصابات العين قد تنتج عن جسم غريب أو مادة كيميائية أو ضربة، وبعضها قد يهدد البصر ويحتاج تقييمًا عاجلًا.',
    'Eye injuries may involve foreign bodies, chemicals or impact, and some can threaten vision and require urgent assessment.',
    1
  ),
  (
    'when_to_call',
    'متى أتصل بالطوارئ؟',
    'When should I call emergency services?',
    'اطلب مساعدة طارئة عند مادة كيميائية قوية، جسم اخترق العين، إصابة عالية السرعة، تغير الرؤية، ألم شديد، عدم القدرة على فتح أو تحريك العين، أو خروج دم.',
    'Seek emergency help for strong chemical exposure, penetrating injury, high-speed impact, vision change, severe pain, inability to open or move the eye, or bleeding.',
    2
  ),
  (
    'do_now',
    'ماذا أفعل الآن؟',
    'What should I do now?',
    'عند التعرض لمادة كيميائية، ابدأ شطف العين فورًا بماء نظيف غير ساخن مع إبقاء العين مفتوحة واستمر بالشطف أثناء طلب المساعدة.',
    'For chemical exposure, immediately rinse with clean non-hot water while holding the eye open and continue rinsing while seeking help.',
    3
  ),
  (
    'dont_do',
    'ماذا لا أفعل؟',
    'What should I avoid?',
    'لا تفرك العين ولا تحاول إزالة جسم اخترقها، ولا تضغط على العين المصابة.',
    'Do not rub or press the injured eye and do not attempt to remove an object that has pierced it.',
    4
  ),
  (
    'while_waiting',
    'أثناء انتظار الإسعاف',
    'While waiting for help',
    'أبعد المصاب عن مصدر الخطر، واستمر في الشطف عند التعرض الكيميائي، واحتفظ بعبوة المادة إن أمكن لعرضها على فريق الرعاية.',
    'Move away from the hazard, continue irrigation for chemical exposure, and keep the product container for healthcare staff if possible.',
    5
  )
) AS v(section_type, title_ar, title_en, content_ar, content_en, sort_order)
WHERE t.code = 'eye_injury'
  AND NOT EXISTS (
    SELECT 1
    FROM public.first_aid_sections x
    WHERE x.topic_id = t.id
      AND x.section_type = v.section_type
  );

-- All INSERTs above are idempotent. Existing section workflow states are
-- deliberately preserved on re-run.

COMMIT;