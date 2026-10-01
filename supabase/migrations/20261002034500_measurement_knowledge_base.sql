-- Measurement Knowledge Base
-- Converts source-backed measurement guidance into reviewed, localized,
-- first-party in-app content so users do not need to leave the application.
-- Initial content remains Draft + Inactive pending medical review.

CREATE TABLE IF NOT EXISTS public.measurement_knowledge_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_type_id uuid NOT NULL REFERENCES public.measurement_types(id) ON DELETE CASCADE,
  code text NOT NULL,
  audience text NOT NULL CHECK (audience IN ('general','professional')),
  title_ar text NOT NULL,
  title_en text,
  summary_ar text NOT NULL,
  summary_en text,
  review_status public.review_status NOT NULL DEFAULT 'draft',
  is_active boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at timestamptz,
  last_medical_review_at timestamptz,
  review_note text,
  change_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (measurement_type_id, code, audience, version)
);

CREATE TABLE IF NOT EXISTS public.measurement_knowledge_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.measurement_knowledge_articles(id) ON DELETE CASCADE,
  section_type text NOT NULL CHECK (section_type IN (
    'overview','how_to_measure','common_errors','what_it_means',
    'when_to_repeat','warning_signs','special_context','limitations'
  )),
  title_ar text NOT NULL,
  title_en text,
  body_ar text NOT NULL,
  body_en text,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.measurement_knowledge_sources (
  article_id uuid NOT NULL REFERENCES public.measurement_knowledge_articles(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.medical_sources(id) ON DELETE RESTRICT,
  source_role text NOT NULL CHECK (source_role IN ('primary','supporting','safety','capture')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (article_id, source_id, source_role)
);

CREATE INDEX IF NOT EXISTS measurement_knowledge_article_type_idx
  ON public.measurement_knowledge_articles
    (measurement_type_id, audience, review_status, is_active, version DESC);
CREATE INDEX IF NOT EXISTS measurement_knowledge_section_article_idx
  ON public.measurement_knowledge_sections (article_id, sort_order);

ALTER TABLE public.measurement_knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_knowledge_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_knowledge_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "knowledge articles public published read"
  ON public.measurement_knowledge_articles;
CREATE POLICY "knowledge articles public published read"
ON public.measurement_knowledge_articles FOR SELECT TO anon, authenticated
USING (review_status = 'published' AND is_active = true AND is_demo = false);

DROP POLICY IF EXISTS "knowledge articles staff manage"
  ON public.measurement_knowledge_articles;
CREATE POLICY "knowledge articles staff manage"
ON public.measurement_knowledge_articles FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['content_editor','medical_reviewer','admin','super_admin']))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['content_editor','medical_reviewer','admin','super_admin']));

DROP POLICY IF EXISTS "knowledge sections public published read"
  ON public.measurement_knowledge_sections;
CREATE POLICY "knowledge sections public published read"
ON public.measurement_knowledge_sections FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.measurement_knowledge_articles a
    WHERE a.id = article_id
      AND a.review_status = 'published'
      AND a.is_active = true
      AND a.is_demo = false
  )
);

DROP POLICY IF EXISTS "knowledge sections staff manage"
  ON public.measurement_knowledge_sections;
CREATE POLICY "knowledge sections staff manage"
ON public.measurement_knowledge_sections FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['content_editor','medical_reviewer','admin','super_admin']))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['content_editor','medical_reviewer','admin','super_admin']));

DROP POLICY IF EXISTS "knowledge sources public published read"
  ON public.measurement_knowledge_sources;
CREATE POLICY "knowledge sources public published read"
ON public.measurement_knowledge_sources FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.measurement_knowledge_articles a
    WHERE a.id = article_id
      AND a.review_status = 'published'
      AND a.is_active = true
      AND a.is_demo = false
  )
);

DROP POLICY IF EXISTS "knowledge sources staff manage"
  ON public.measurement_knowledge_sources;
CREATE POLICY "knowledge sources staff manage"
ON public.measurement_knowledge_sources FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['content_editor','medical_reviewer','admin','super_admin']))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['content_editor','medical_reviewer','admin','super_admin']));

GRANT SELECT ON public.measurement_knowledge_articles,
  public.measurement_knowledge_sections,
  public.measurement_knowledge_sources TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.measurement_knowledge_articles,
  public.measurement_knowledge_sections,
  public.measurement_knowledge_sources TO authenticated;
GRANT ALL ON public.measurement_knowledge_articles,
  public.measurement_knowledge_sections,
  public.measurement_knowledge_sources TO service_role;

CREATE OR REPLACE FUNCTION public.guard_measurement_knowledge_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_ok boolean;
  source_ok boolean;
BEGIN
  IF NEW.is_active = false THEN
    RETURN NEW;
  END IF;

  IF NEW.review_status <> 'published' OR NEW.is_demo = true THEN
    RAISE EXCEPTION
      'MEASUREMENT_KNOWLEDGE_NOT_RELEASE_READY: active knowledge must be published and non-demo';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.measurement_types mt
    WHERE mt.id = NEW.measurement_type_id
      AND mt.review_status = 'published'
      AND mt.is_active = true
      AND mt.is_demo = false
  ) INTO parent_ok;

  IF NOT parent_ok THEN
    RAISE EXCEPTION
      'MEASUREMENT_KNOWLEDGE_PARENT_NOT_READY: parent measurement type must be published and active';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.measurement_knowledge_sources ks
    JOIN public.medical_sources src ON src.id = ks.source_id
    WHERE ks.article_id = NEW.id
      AND src.is_active = true
  ) INTO source_ok;

  IF NOT source_ok THEN
    RAISE EXCEPTION
      'MEASUREMENT_KNOWLEDGE_SOURCE_REQUIRED: active knowledge requires an active medical source';
  END IF;

  RETURN NEW;
END
$$;

REVOKE EXECUTE ON FUNCTION public.guard_measurement_knowledge_activation()
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_measurement_knowledge_activation()
  TO service_role;

DROP TRIGGER IF EXISTS measurement_knowledge_activation_guard
  ON public.measurement_knowledge_articles;
CREATE TRIGGER measurement_knowledge_activation_guard
BEFORE INSERT OR UPDATE ON public.measurement_knowledge_articles
FOR EACH ROW EXECUTE FUNCTION public.guard_measurement_knowledge_activation();

-- Published articles are versioned; sections of a published article are immutable.
CREATE OR REPLACE FUNCTION public.guard_published_measurement_knowledge_sections()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_v_article_id uuid;
  published_parent boolean;
BEGIN
  target_article_id := COALESCE(NEW.article_id, OLD.article_id);

  SELECT EXISTS (
    SELECT 1 FROM public.measurement_knowledge_articles a
    WHERE a.id = target_article_id AND a.review_status = 'published'
  ) INTO published_parent;

  IF published_parent THEN
    RAISE EXCEPTION
      'PUBLISHED_MEASUREMENT_KNOWLEDGE_IMMUTABLE: create a new draft article version';
  END IF;

  RETURN COALESCE(NEW, OLD);
END
$$;

DROP TRIGGER IF EXISTS measurement_knowledge_sections_immutable
  ON public.measurement_knowledge_sections;
CREATE TRIGGER measurement_knowledge_sections_immutable
BEFORE INSERT OR UPDATE OR DELETE ON public.measurement_knowledge_sections
FOR EACH ROW EXECUTE FUNCTION public.guard_published_measurement_knowledge_sections();

-- Seed initial internal Arabic knowledge. These are paraphrased, source-backed
-- drafts for review; external URLs remain provenance metadata, not required UX.

DO $$
DECLARE
  mt_id uuid;
  v_article_id uuid;
  src1 uuid;
  src2 uuid;
BEGIN
  -- Blood pressure
  SELECT id INTO mt_id FROM public.measurement_types WHERE code='blood_pressure';
  SELECT id INTO src1 FROM public.medical_sources
    WHERE url='https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings/monitoring-your-blood-pressure-at-home'
    LIMIT 1;
  SELECT id INTO src2 FROM public.medical_sources
    WHERE url='https://professional.heart.org/en/science-news/2025-high-blood-pressure-guideline'
    LIMIT 1;

  IF mt_id IS NOT NULL THEN
    INSERT INTO public.measurement_knowledge_articles (
      measurement_type_id, code, audience, title_ar, summary_ar,
      review_status, is_active, is_demo, version, change_reason
    ) VALUES (
      mt_id, 'blood_pressure_guide', 'general', 'دليل قياس ضغط الدم',
      'دليل داخلي يشرح طريقة القياس المنزلي، أسباب القراءات غير الدقيقة، معنى الأرقام بصورة غير تشخيصية، ومتى تستدعي القراءة الانتباه.',
      'draft', false, false, 1,
      'Initial in-app knowledge draft derived from reviewed AHA sources.'
    )
    ON CONFLICT (measurement_type_id, code, audience, version)
    DO UPDATE SET summary_ar=EXCLUDED.summary_ar, review_status='draft', is_active=false
    RETURNING id INTO v_article_id;

    DELETE FROM public.measurement_knowledge_sections WHERE article_id=v_article_id;
    INSERT INTO public.measurement_knowledge_sections
      (article_id,section_type,title_ar,body_ar,sort_order)
    VALUES
      (v_article_id,'overview','ما الذي يقيسه ضغط الدم؟',
       'القراءة تتكون من رقم انقباضي ورقم انبساطي بوحدة mmHg. القراءة المنزلية تعطي لقطة في لحظة محددة، بينما متابعة القراءات عبر الوقت تعطي صورة أدق من الاعتماد على قراءة منفردة.',10),
      (v_article_id,'how_to_measure','طريقة القياس الصحيحة',
       'استخدم جهازًا آليًا مع كفة للذراع العلوي وبمقاس مناسب. تجنب التدخين والكافيين والرياضة خلال 30 دقيقة قبل القياس، واجلس بهدوء خمس دقائق على الأقل. ضع الكفة على جلد مكشوف، اسند الظهر والذراع، واجعل الذراع في مستوى القلب، ولا تتحدث أثناء القياس. عند المتابعة المنزلية خذ قراءتين بفاصل دقيقة وسجل النتائج.',20),
      (v_article_id,'common_errors','أسباب قراءة غير دقيقة',
       'من الأخطاء الشائعة: كفة غير مناسبة، القياس فوق الملابس، عدم الراحة قبل القياس، الحديث أو الحركة، وضع الذراع أسفل أو أعلى مستوى القلب، أو القياس مباشرة بعد الكافيين أو التدخين أو المجهود.',30),
      (v_article_id,'when_to_repeat','متى تعيد القياس؟',
       'إذا ظهرت قراءة أعلى من المعتاد فلا تعتمد على رقم واحد. أعد القياس بعد الالتزام بوضعية صحيحة، وسجل القراءة الثانية مع الأولى. القراءات الشديدة الارتفاع لها مسار منفصل داخل نظام التنبيهات.',40),
      (v_article_id,'limitations','مهم',
       'القياس المنزلي يساعد على المتابعة لكنه لا يؤكد التشخيص وحده ولا يبرر إيقاف أو تغيير دواء موصوف دون مراجعة مختص.',50);

    IF src1 IS NOT NULL THEN
      INSERT INTO public.measurement_knowledge_sources(article_id,source_id,source_role,notes)
      VALUES(v_article_id,src1,'capture','Home measurement technique and limitations')
      ON CONFLICT DO NOTHING;
    END IF;
    IF src2 IS NOT NULL THEN
      INSERT INTO public.measurement_knowledge_sources(article_id,source_id,source_role,notes)
      VALUES(v_article_id,src2,'primary','Classification and guideline context')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- SpO2
  SELECT id INTO mt_id FROM public.measurement_types WHERE code='oxygen_saturation';
  SELECT id INTO src1 FROM public.medical_sources
    WHERE url='https://www.fda.gov/consumers/consumer-updates/pulse-oximeter-basics'
    LIMIT 1;

  IF mt_id IS NOT NULL THEN
    INSERT INTO public.measurement_knowledge_articles (
      measurement_type_id, code, audience, title_ar, summary_ar,
      review_status, is_active, is_demo, version, change_reason
    ) VALUES (
      mt_id, 'spo2_guide', 'general', 'دليل قياس تشبع الأكسجين',
      'شرح داخلي لاستخدام جهاز قياس الأكسجين بالنبض، العوامل التي تؤثر على دقته، وكيفية قراءة النتيجة مع الأعراض والسياق.',
      'draft', false, false, 1,
      'Initial in-app knowledge draft derived from FDA pulse-oximetry guidance.'
    )
    ON CONFLICT (measurement_type_id, code, audience, version)
    DO UPDATE SET summary_ar=EXCLUDED.summary_ar, review_status='draft', is_active=false
    RETURNING id INTO v_article_id;

    DELETE FROM public.measurement_knowledge_sections WHERE article_id=v_article_id;
    INSERT INTO public.measurement_knowledge_sections
      (article_id,section_type,title_ar,body_ar,sort_order)
    VALUES
      (v_article_id,'overview','ما هو SpO₂؟',
       'جهاز قياس الأكسجين بالنبض يقدّر نسبة تشبع الأكسجين في الدم دون سحب عينة. النتيجة تقديرية ويجب قراءتها مع الأعراض والحالة العامة، وليس كرقم منفصل.',10),
      (v_article_id,'how_to_measure','كيف تحصل على قراءة أفضل؟',
       'استخدم الجهاز وفق تعليماته. اجعل اليد دافئة ومرتخية، أزل طلاء الأظافر من الإصبع المستخدم، ابق ثابتًا، وانتظر حتى تستقر القراءة قبل تسجيلها مع الوقت والتاريخ.',20),
      (v_article_id,'common_errors','ما الذي قد يؤثر على الدقة؟',
       'قد تتأثر القراءة بضعف الدورة الدموية، حرارة الجلد، الحركة، طلاء الأظافر، التدخين، وبعض الفروق المرتبطة بتصبغ الجلد. جودة الجهاز نفسه مهمة أيضًا.',30),
      (v_article_id,'what_it_means','كيف تفسر الرقم؟',
       'لا تعتمد على SpO₂ وحده لاتخاذ قرار طبي. راقب اتجاه القراءات والأعراض وكيف تشعر. وجود مرض قلبي أو رئوي أو الإقامة على ارتفاع قد يغير خط الأساس المتوقع.',40),
      (v_article_id,'limitations','حدود الجهاز',
       'الأجهزة المخصصة للرفاهية أو الرياضة قد لا تكون مقيّمة للاستخدام في القرارات الطبية. إذا تعارضت القراءة مع الأعراض أو بدت غير منطقية فأعد القياس وتحقق من جودة الالتقاط.',50);

    IF src1 IS NOT NULL THEN
      INSERT INTO public.measurement_knowledge_sources(article_id,source_id,source_role,notes)
      VALUES(v_article_id,src1,'primary','FDA pulse oximeter use and limitations')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Temperature
  SELECT id INTO mt_id FROM public.measurement_types WHERE code='temperature';
  SELECT id INTO src1 FROM public.medical_sources
    WHERE url='https://www.nhs.uk/symptoms/fever-in-adults/'
    LIMIT 1;
  SELECT id INTO src2 FROM public.medical_sources
    WHERE url='https://www.cdc.gov/nhsn/faqs/faqs-miscellaneous.html'
    LIMIT 1;

  IF mt_id IS NOT NULL THEN
    INSERT INTO public.measurement_knowledge_articles (
      measurement_type_id, code, audience, title_ar, summary_ar,
      review_status, is_active, is_demo, version, change_reason
    ) VALUES (
      mt_id, 'temperature_guide', 'general', 'دليل قياس درجة الحرارة',
      'شرح داخلي يوضح موضع القياس، الفرق بين تحويل الوحدة وتحويل موضع القياس، وأسباب اختلاف القراءات.',
      'draft', false, false, 1,
      'Initial in-app temperature knowledge draft.'
    )
    ON CONFLICT (measurement_type_id, code, audience, version)
    DO UPDATE SET summary_ar=EXCLUDED.summary_ar, review_status='draft', is_active=false
    RETURNING id INTO v_article_id;

    DELETE FROM public.measurement_knowledge_sections WHERE article_id=v_article_id;
    INSERT INTO public.measurement_knowledge_sections
      (article_id,section_type,title_ar,body_ar,sort_order)
    VALUES
      (v_article_id,'overview','الحرارة ليست رقمًا بلا سياق',
       'سجل دائمًا موضع القياس مثل الفم أو الإبط أو الأذن ونوع الجهاز. نفس الشخص قد يحصل على قراءات مختلفة باختلاف موضع القياس.',10),
      (v_article_id,'how_to_measure','طريقة القياس',
       'استخدم ميزان حرارة رقميًا مناسبًا واتبع تعليمات الجهاز. عند القياس الفموي تجنب القياس مباشرة بعد طعام أو شراب. في القياس الإبطي يجب أن يلامس الجهاز الجلد جيدًا، وفي الأذن يجب اتباع وضعية الجهاز الصحيحة.',20),
      (v_article_id,'common_errors','خطأ شائع: تحويل موضع القياس',
       'يمكن تحويل °C إلى °F والعكس رياضيًا، لكن لا ينبغي إضافة أو طرح رقم ثابت لتحويل قراءة الفم إلى الإبط أو الأذن. احتفظ بموضع القياس الأصلي وقارن الاتجاهات باستخدام نفس الموضع قدر الإمكان.',30),
      (v_article_id,'what_it_means','الحمّى وانخفاض الحرارة',
       'لدى البالغين تُستخدم 38°C أو أكثر عادة كعلامة على حرارة مرتفعة، بينما انخفاض حرارة الجسم إلى أقل من 35°C حالة خطرة. قواعد التطبيق السريرية تبقى منفصلة ومقيدة بالسياق والمراجعة.',40),
      (v_article_id,'special_context','حالات تحتاج قواعد منفصلة',
       'الرضع والأطفال والحمل ونقص المناعة وحالات ما بعد الجراحة وفرط الحرارة الناتج عن الجو لا ينبغي تفسيرها بقواعد البالغ العام نفسها.',50);

    IF src1 IS NOT NULL THEN
      INSERT INTO public.measurement_knowledge_sources(article_id,source_id,source_role)
      VALUES(v_article_id,src1,'primary') ON CONFLICT DO NOTHING;
    END IF;
    IF src2 IS NOT NULL THEN
      INSERT INTO public.measurement_knowledge_sources(article_id,source_id,source_role)
      VALUES(v_article_id,src2,'supporting') ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Pulse
  SELECT id INTO mt_id FROM public.measurement_types WHERE code='pulse';
  SELECT id INTO src1 FROM public.medical_sources
    WHERE url='https://www.heart.org/en/health-topics/high-blood-pressure/the-facts-about-high-blood-pressure/all-about-heart-rate-pulse'
    LIMIT 1;
  SELECT id INTO src2 FROM public.medical_sources
    WHERE url='https://www.nhs.uk/symptoms/heart-palpitations/'
    LIMIT 1;

  IF mt_id IS NOT NULL THEN
    INSERT INTO public.measurement_knowledge_articles (
      measurement_type_id, code, audience, title_ar, summary_ar,
      review_status, is_active, is_demo, version, change_reason
    ) VALUES (
      mt_id, 'pulse_guide', 'general', 'دليل قياس النبض',
      'دليل داخلي يفرق بين نبض الراحة ونبض المجهود، ويشرح القياس اليدوي والعوامل التي تغيّر النبض وعلامات الخطر المصاحبة للخفقان.',
      'draft', false, false, 1,
      'Initial in-app pulse knowledge draft.'
    )
    ON CONFLICT (measurement_type_id, code, audience, version)
    DO UPDATE SET summary_ar=EXCLUDED.summary_ar, review_status='draft', is_active=false
    RETURNING id INTO v_article_id;

    DELETE FROM public.measurement_knowledge_sections WHERE article_id=v_article_id;
    INSERT INTO public.measurement_knowledge_sections
      (article_id,section_type,title_ar,body_ar,sort_order)
    VALUES
      (v_article_id,'overview','نبض الراحة يختلف عن نبض المجهود',
       'فسر النبض مع معرفة ما إذا كنت في راحة أو بعد مجهود أو أثناء النوم. النبض يرتفع طبيعيًا مع التمرين ولا يعود فورًا إلى قيمة الراحة.',10),
      (v_article_id,'how_to_measure','القياس اليدوي',
       'للحصول على قراءة يدوية دقيقة أثناء الراحة، اجلس أو استلقِ بهدوء، ضع السبابة والوسطى بخفة على موضع النبض، واحسب الضربات لمدة 60 ثانية.',20),
      (v_article_id,'what_it_means','النطاق الشائع للراحة',
       'عند معظم البالغين يكون نبض الراحة الشائع بين 60 و100 ضربة/دقيقة. رقم أقل من 60 قد يظهر طبيعيًا أثناء النوم أو لدى بعض الرياضيين أو مع أدوية معينة، ورقم أعلى من 100 في الراحة يحتاج تفسيرًا ضمن الحالة والأعراض.',30),
      (v_article_id,'common_errors','ما الذي يغيّر النبض؟',
       'المجهود، حرارة الجسم، الانفعال، بعض الأدوية، اللياقة، وضع الجسم والحالة الصحية قد تغير النبض. لذلك لا تقارن قراءة بعد مجهود بقراءة راحة وكأنهما الحالة نفسها.',40),
      (v_article_id,'warning_signs','الخفقان مع علامات إنذار',
       'الخفقان المستمر المصحوب بألم صدر أو ضيق نفس أو شعور بالإغماء أو إغماء له مسار طوارئ مستقل داخل التطبيق، حتى لو لم يكن رقم النبض وحده شديدًا.',50);

    IF src1 IS NOT NULL THEN
      INSERT INTO public.measurement_knowledge_sources(article_id,source_id,source_role)
      VALUES(v_article_id,src1,'primary') ON CONFLICT DO NOTHING;
    END IF;
    IF src2 IS NOT NULL THEN
      INSERT INTO public.measurement_knowledge_sources(article_id,source_id,source_role)
      VALUES(v_article_id,src2,'safety') ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Glucose
  SELECT id INTO mt_id FROM public.measurement_types WHERE code='blood_glucose';
  SELECT id INTO src1 FROM public.medical_sources
    WHERE url='https://www.fda.gov/medical-devices/home-health-and-consumer-devices/home-healthcare-medical-devices-blood-glucose-meters-getting-most-out-your-meter'
    LIMIT 1;
  SELECT id INTO src2 FROM public.medical_sources
    WHERE url='https://diabetesjournals.org/care/article/49/Supplement_1/S27/163926/2-Diagnosis-and-Classification-of-Diabetes'
    LIMIT 1;

  IF mt_id IS NOT NULL THEN
    INSERT INTO public.measurement_knowledge_articles (
      measurement_type_id, code, audience, title_ar, summary_ar,
      review_status, is_active, is_demo, version, change_reason
    ) VALUES (
      mt_id, 'glucose_guide', 'general', 'دليل قياس سكر الدم',
      'شرح داخلي يفرق بين المراقبة المنزلية والتشخيص المخبري، ويغطي التوقيت، نوع العينة، جودة جهاز القياس، والوحدات.',
      'draft', false, false, 1,
      'Initial in-app glucose knowledge draft.'
    )
    ON CONFLICT (measurement_type_id, code, audience, version)
    DO UPDATE SET summary_ar=EXCLUDED.summary_ar, review_status='draft', is_active=false
    RETURNING id INTO v_article_id;

    DELETE FROM public.measurement_knowledge_sections WHERE article_id=v_article_id;
    INSERT INTO public.measurement_knowledge_sections
      (article_id,section_type,title_ar,body_ar,sort_order)
    VALUES
      (v_article_id,'overview','التوقيت ونوع العينة جزء من القراءة',
       'لا يكفي رقم السكر وحده. يجب معرفة هل القياس صائم أو عشوائي أو بعد وجبة أو ضمن اختبار تحمل الجلوكوز، وهل العينة مخبرية من البلازما الوريدية أم قياسًا منزليًا شعيريًا.',10),
      (v_article_id,'how_to_measure','استخدام جهاز القياس المنزلي',
       'اغسل يديك وجففهما، استخدم شرائط متوافقة وغير منتهية ومحفوظة بطريقة صحيحة، واحصل على عينة دم كافية. إذا شككت في النتيجة فأعد القياس وفق تعليمات الجهاز.',20),
      (v_article_id,'common_errors','أسباب نتائج غير دقيقة',
       'بقايا الطعام أو السكر على الأصابع، الشرائط غير الصحيحة أو المنتهية، عينة دم غير كافية، سوء التخزين أو بعض الظروف الفسيولوجية قد تؤثر على القراءة. القياس من مواقع بديلة قد يكون أقل ملاءمة عندما يتغير السكر بسرعة.',30),
      (v_article_id,'what_it_means','المراقبة ليست تشخيصًا',
       'جهاز المنزل مفيد للمراقبة لكنه أقل دقة من المختبر ولا يُستخدم داخل التطبيق لتأكيد تشخيص السكري. القواعد التشخيصية مقيّدة بنتائج البلازما المخبرية والسياق المطلوب لكل اختبار.',40),
      (v_article_id,'limitations','الوحدات والسياق',
       'يمكن تحويل mg/dL وmmol/L رياضيًا، لكن هذا لا يحول عينة منزلية إلى اختبار مخبري ولا يغيّر كون القياس صائمًا أو بعد الطعام.',50);

    IF src1 IS NOT NULL THEN
      INSERT INTO public.measurement_knowledge_sources(article_id,source_id,source_role)
      VALUES(v_article_id,src1,'capture') ON CONFLICT DO NOTHING;
    END IF;
    IF src2 IS NOT NULL THEN
      INSERT INTO public.measurement_knowledge_sources(article_id,source_id,source_role)
      VALUES(v_article_id,src2,'primary') ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Respiratory rate
  SELECT id INTO mt_id FROM public.measurement_types WHERE code='respiratory_rate';
  SELECT id INTO src1 FROM public.medical_sources
    WHERE url='https://www.hee.nhs.uk/sites/default/files/documents/Work%20Experience%20in%20Nursing%20-%20Best%20Practice%20Guide.pdf'
    LIMIT 1;
  SELECT id INTO src2 FROM public.medical_sources
    WHERE url IN ('https://www.nhs.uk/symptoms/shortness-of-breath/','https://www.nhs.uk/conditions/shortness-of-breath/')
    ORDER BY CASE WHEN url='https://www.nhs.uk/conditions/shortness-of-breath/' THEN 0 ELSE 1 END
    LIMIT 1;

  IF mt_id IS NOT NULL THEN
    INSERT INTO public.measurement_knowledge_articles (
      measurement_type_id, code, audience, title_ar, summary_ar,
      review_status, is_active, is_demo, version, change_reason
    ) VALUES (
      mt_id, 'respiratory_rate_guide', 'general', 'دليل قياس معدل التنفس',
      'شرح داخلي يوضح طريقة عد التنفس أثناء الراحة، أهمية النمط والعمق، ولماذا لا يكفي الرقم وحده لتحديد الخطورة.',
      'draft', false, false, 1,
      'Initial in-app respiratory-rate knowledge draft.'
    )
    ON CONFLICT (measurement_type_id, code, audience, version)
    DO UPDATE SET summary_ar=EXCLUDED.summary_ar, review_status='draft', is_active=false
    RETURNING id INTO v_article_id;

    DELETE FROM public.measurement_knowledge_sections WHERE article_id=v_article_id;
    INSERT INTO public.measurement_knowledge_sections
      (article_id,section_type,title_ar,body_ar,sort_order)
    VALUES
      (v_article_id,'overview','ما الذي تسجله؟',
       'معدل التنفس هو عدد الأنفاس في الدقيقة، لكن التقييم الأفضل يسجل أيضًا انتظام النفس وعمقه ووجود جهد أو ضيق تنفس.',10),
      (v_article_id,'how_to_measure','طريقة العد',
       'اجعل الشخص في راحة واسترخاء، وراقب حركة الصدر أو البطن وعد الأنفاس لمدة دقيقة كاملة. سجل ما إذا كان التنفس منتظمًا وعميقًا أو سطحيًا، وما إذا ظهرت علامات ضيق.',20),
      (v_article_id,'common_errors','ما الذي يشوّه القراءة؟',
       'العد بعد مجهود، مدة عد قصيرة جدًا، القلق، أو إدراك الشخص أنه تتم مراقبة تنفسه قد تغير المعدل وتجعل القراءة أقل تمثيلًا للراحة.',30),
      (v_article_id,'what_it_means','الرقم ليس كل شيء',
       'النطاق المرجعي أثناء الراحة ليس تشخيصًا بحد ذاته، ولا يحول المعدل المرتفع أو المنخفض تلقائيًا إلى طوارئ. الأعراض والسياق السريري أهم في تحديد مستوى الرعاية.',40),
      (v_article_id,'warning_signs','متى تصبح صعوبة التنفس طارئة؟',
       'صعوبة التنفس الشديدة مثل اللهاث أو الاختناق أو عدم القدرة على إخراج الكلمات، أو العلامات الخطرة المصاحبة، تتبع مسار طوارئ مستقل داخل التطبيق ولا تنتظر رقمًا محددًا لمعدل التنفس.',50);

    IF src1 IS NOT NULL THEN
      INSERT INTO public.measurement_knowledge_sources(article_id,source_id,source_role)
      VALUES(v_article_id,src1,'primary') ON CONFLICT DO NOTHING;
    END IF;
    IF src2 IS NOT NULL THEN
      INSERT INTO public.measurement_knowledge_sources(article_id,source_id,source_role)
      VALUES(v_article_id,src2,'safety') ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END
$$;
