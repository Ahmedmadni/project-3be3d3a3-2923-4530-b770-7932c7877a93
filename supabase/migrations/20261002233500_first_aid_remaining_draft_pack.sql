-- Remaining first-aid starter draft pack.
-- SAFETY:
--   * all instruction sections inserted here remain DRAFT;
--   * no topic is published or activated by this migration;
--   * GitHub/community repositories informed UX/architecture only and are not
--     clinical evidence;
--   * medical reviewer approval is required before publication.
--
-- Authoritative sources were re-checked on 2026-10-02.

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
JOIN public.medical_sources s ON s.url = v.url
CROSS JOIN LATERAL (
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
