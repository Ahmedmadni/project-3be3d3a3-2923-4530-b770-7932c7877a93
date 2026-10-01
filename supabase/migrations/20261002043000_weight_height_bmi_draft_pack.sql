-- Weight / Height / BMI source-backed draft pack.
-- BMI is a screening measure, not a diagnosis.
-- Adult BMI categories are limited to age >= 20 and nonpregnant context.

DO $$
DECLARE
  weight_id uuid;
  height_id uuid;
  bmi_id uuid;
  nhs_weight_id uuid;
  cdc_bmi_id uuid;
  cdc_calc_id uuid;
  who_obesity_id uuid;
BEGIN
  SELECT id INTO weight_id FROM public.measurement_types WHERE code='weight';
  SELECT id INTO height_id FROM public.measurement_types WHERE code='height';
  SELECT id INTO bmi_id FROM public.measurement_types WHERE code='bmi';

  IF weight_id IS NULL OR height_id IS NULL OR bmi_id IS NULL THEN
    RAISE EXCEPTION 'MEASUREMENT_FOUNDATION_REQUIRED: weight, height and bmi types are required';
  END IF;

  SELECT id INTO nhs_weight_id
  FROM public.medical_sources
  WHERE url='https://www.england.nhs.uk/long-read/how-to-record-your-weight/'
  LIMIT 1;

  IF nhs_weight_id IS NULL THEN
    INSERT INTO public.medical_sources (
      title, organization, url, publication_date, source_type, is_active,
      language, country, organization_type, evidence_level, published_at,
      last_checked_at, last_verified_at, expires_review_at, notes
    ) VALUES (
      'How to record your weight',
      'NHS England',
      'https://www.england.nhs.uk/long-read/how-to-record-your-weight/',
      '2023-12-01',
      'government',
      true,
      'en','GB','government_health_service','patient_measurement_guidance',
      '2023-12-01',
      '2026-10-02T00:00:00Z','2026-10-02T00:00:00Z','2027-10-02',
      'Weight-capture source: consistent timing, same scales/location, firm level floor, light clothing, no shoes/heavy items, remain still until stable.'
    )
    RETURNING id INTO nhs_weight_id;
  END IF;

  SELECT id INTO cdc_bmi_id
  FROM public.medical_sources
  WHERE url='https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html'
  LIMIT 1;

  IF cdc_bmi_id IS NULL THEN
    INSERT INTO public.medical_sources (
      title, organization, url, publication_date, source_type, is_active,
      language, country, organization_type, evidence_level, published_at,
      last_checked_at, last_verified_at, expires_review_at, notes
    ) VALUES (
      'Adult BMI Categories',
      'Centers for Disease Control and Prevention',
      'https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html',
      '2024-03-19',
      'government',
      true,
      'en','US','government','public_health_reference',
      '2024-03-19',
      '2026-10-02T00:00:00Z','2026-10-02T00:00:00Z','2027-10-02',
      'Adult BMI categories for age 20+: underweight <18.5, healthy 18.5-<25, overweight 25-<30, obesity >=30; BMI is a screening measure.'
    )
    RETURNING id INTO cdc_bmi_id;
  END IF;

  SELECT id INTO cdc_calc_id
  FROM public.medical_sources
  WHERE url='https://www.cdc.gov/bmi/about/index.html'
  LIMIT 1;

  IF cdc_calc_id IS NULL THEN
    INSERT INTO public.medical_sources (
      title, organization, url, publication_date, source_type, is_active,
      language, country, organization_type, evidence_level, published_at,
      last_checked_at, last_verified_at, expires_review_at, notes
    ) VALUES (
      'About Body Mass Index (BMI)',
      'Centers for Disease Control and Prevention',
      'https://www.cdc.gov/bmi/about/index.html',
      '2025-12-16',
      'government',
      true,
      'en','US','government','public_health_reference',
      '2025-12-16',
      '2026-10-02T00:00:00Z','2026-10-02T00:00:00Z','2027-10-02',
      'BMI formula and limitation source. BMI is weight in kg divided by height in meters squared and should be interpreted with other health factors.'
    )
    RETURNING id INTO cdc_calc_id;
  END IF;

  SELECT id INTO who_obesity_id
  FROM public.medical_sources
  WHERE url='https://www.who.int/en/news-room/fact-sheets/detail/obesity-and-overweight'
  LIMIT 1;

  IF who_obesity_id IS NULL THEN
    INSERT INTO public.medical_sources (
      title, organization, url, publication_date, source_type, is_active,
      language, country, organization_type, evidence_level, published_at,
      last_checked_at, last_verified_at, expires_review_at, notes
    ) VALUES (
      'Obesity and overweight',
      'World Health Organization',
      'https://www.who.int/en/news-room/fact-sheets/detail/obesity-and-overweight',
      '2025-12-08',
      'government',
      true,
      'en','INT','international_health_agency','global_public_health_reference',
      '2025-12-08',
      '2026-10-02T00:00:00Z','2026-10-02T00:00:00Z','2027-10-02',
      'Supporting source for adult overweight BMI >=25 and obesity BMI >=30 and for separating child interpretation by age.'
    )
    RETURNING id INTO who_obesity_id;
  END IF;

  INSERT INTO public.measurement_sources(measurement_type_id,source_id,use_scope,last_verified_at,notes)
  VALUES
    (weight_id,nhs_weight_id,'capture_guidance','2026-10-02T00:00:00Z','Consistent home weight measurement technique.'),
    (bmi_id,cdc_bmi_id,'reference_range','2026-10-02T00:00:00Z','Adult 20+ BMI categories.'),
    (bmi_id,cdc_calc_id,'capture_guidance','2026-10-02T00:00:00Z','BMI calculation formula and screening limitation.'),
    (bmi_id,who_obesity_id,'reference_range','2026-10-02T00:00:00Z','Supporting adult overweight/obesity definitions.')
  ON CONFLICT (measurement_type_id,source_id,use_scope) DO UPDATE SET
    last_verified_at=EXCLUDED.last_verified_at,
    notes=EXCLUDED.notes;

  UPDATE public.measurement_types
  SET canonical_unit='kg',
      allowed_units=ARRAY['kg','lb'],
      capture_context_schema='{
        "age_years":{"type":"number","required":true},
        "pregnant":{"type":"boolean","required":true},
        "scale_level_surface":{"type":"boolean"},
        "same_scale_for_trend":{"type":"boolean"},
        "shoes_or_heavy_items_removed":{"type":"boolean"},
        "still_until_stable":{"type":"boolean"},
        "time_of_day":{"type":"string"}
      }'::jsonb,
      description_ar='قياس الوزن مع توثيق ثبات ظروف القياس. الاتجاه عبر الوقت أكثر فائدة عندما يُستخدم نفس الميزان وفي وقت وظروف متقاربة.',
      updated_at=now()
  WHERE id=weight_id;

  UPDATE public.measurement_types
  SET canonical_unit='cm',
      allowed_units=ARRAY['cm','m','in'],
      capture_context_schema='{
        "age_years":{"type":"number","required":true},
        "pregnant":{"type":"boolean","required":true},
        "shoes_removed":{"type":"boolean"},
        "upright_posture":{"type":"boolean"},
        "head_position_neutral":{"type":"boolean"},
        "height_method":{"type":"string"}
      }'::jsonb,
      description_ar='قياس الطول بوحدة معيارية مع توثيق طريقة القياس ووضع الجسم. الدقة مهمة لأن أي خطأ في الطول يؤثر تربيعيًا على BMI.',
      updated_at=now()
  WHERE id=height_id;

  UPDATE public.measurement_types
  SET canonical_unit='kg/m²',
      allowed_units=ARRAY['kg/m²'],
      capture_context_schema='{
        "age_years":{"type":"number","required":true},
        "pregnant":{"type":"boolean","required":true},
        "weight_reading_id":{"type":"string"},
        "height_reading_id":{"type":"string"},
        "high_muscularity":{"type":"boolean"},
        "body_composition_available":{"type":"boolean"}
      }'::jsonb,
      description_ar='مؤشر كتلة الجسم = الوزن بالكيلوغرام ÷ مربع الطول بالمتر. أداة فرز وليست تشخيصًا، ويجب تفسيرها مع عوامل صحية أخرى.',
      updated_at=now()
  WHERE id=bmi_id;

  INSERT INTO public.measurement_reference_rules (
    measurement_type_id,code,label_ar,label_en,interpretation_code,
    predicate,care_level,source_id,review_status,is_active,is_demo,
    priority,version,change_reason
  )
  VALUES
    (
      bmi_id,'cdc_adult_bmi_underweight_below_18_5',
      'مسودة: BMI ضمن فئة نقص الوزن للبالغين',
      'Draft: adult BMI underweight category',
      'underweight',
      '{"all":[
        {"path":"context.age_years","operator":"gte","value":20},
        {"path":"context.pregnant","operator":"eq","value":false},
        {"path":"value","operator":"lt","value":18.5}
      ]}'::jsonb,
      NULL,cdc_bmi_id,'draft',false,false,40,1,
      'CDC adult 20+ BMI screening category. Not diagnostic.'
    ),
    (
      bmi_id,'cdc_adult_bmi_healthy_18_5_24_9',
      'مسودة: BMI ضمن فئة الوزن الصحي للبالغين',
      'Draft: adult BMI healthy-weight category',
      'healthy_weight',
      '{"all":[
        {"path":"context.age_years","operator":"gte","value":20},
        {"path":"context.pregnant","operator":"eq","value":false},
        {"path":"value","operator":"gte","value":18.5},
        {"path":"value","operator":"lt","value":25}
      ]}'::jsonb,
      NULL,cdc_bmi_id,'draft',false,false,30,1,
      'CDC adult 20+ BMI screening category. Not diagnostic.'
    ),
    (
      bmi_id,'cdc_adult_bmi_overweight_25_29_9',
      'مسودة: BMI ضمن فئة زيادة الوزن للبالغين',
      'Draft: adult BMI overweight category',
      'overweight',
      '{"all":[
        {"path":"context.age_years","operator":"gte","value":20},
        {"path":"context.pregnant","operator":"eq","value":false},
        {"path":"value","operator":"gte","value":25},
        {"path":"value","operator":"lt","value":30}
      ]}'::jsonb,
      NULL,cdc_bmi_id,'draft',false,false,20,1,
      'CDC adult 20+ BMI screening category. Not diagnostic.'
    ),
    (
      bmi_id,'cdc_adult_bmi_obesity_class_1',
      'مسودة: BMI ضمن السمنة - الفئة الأولى',
      'Draft: adult BMI obesity class 1',
      'obesity_class_1',
      '{"all":[
        {"path":"context.age_years","operator":"gte","value":20},
        {"path":"context.pregnant","operator":"eq","value":false},
        {"path":"value","operator":"gte","value":30},
        {"path":"value","operator":"lt","value":35}
      ]}'::jsonb,
      NULL,cdc_bmi_id,'draft',false,false,10,1,
      'CDC adult 20+ BMI screening category. Person-first language required in UI.'
    ),
    (
      bmi_id,'cdc_adult_bmi_obesity_class_2',
      'مسودة: BMI ضمن السمنة - الفئة الثانية',
      'Draft: adult BMI obesity class 2',
      'obesity_class_2',
      '{"all":[
        {"path":"context.age_years","operator":"gte","value":20},
        {"path":"context.pregnant","operator":"eq","value":false},
        {"path":"value","operator":"gte","value":35},
        {"path":"value","operator":"lt","value":40}
      ]}'::jsonb,
      NULL,cdc_bmi_id,'draft',false,false,9,1,
      'CDC adult 20+ BMI screening category. Person-first language required in UI.'
    ),
    (
      bmi_id,'cdc_adult_bmi_obesity_class_3',
      'مسودة: BMI ضمن السمنة - الفئة الثالثة',
      'Draft: adult BMI obesity class 3',
      'obesity_class_3',
      '{"all":[
        {"path":"context.age_years","operator":"gte","value":20},
        {"path":"context.pregnant","operator":"eq","value":false},
        {"path":"value","operator":"gte","value":40}
      ]}'::jsonb,
      NULL,cdc_bmi_id,'draft',false,false,8,1,
      'CDC adult 20+ BMI screening category. Person-first language required in UI.'
    )
  ON CONFLICT (measurement_type_id,code,version) DO UPDATE SET
    predicate=EXCLUDED.predicate,
    source_id=EXCLUDED.source_id,
    review_status='draft',
    is_active=false,
    is_demo=false,
    priority=EXCLUDED.priority,
    change_reason=EXCLUDED.change_reason,
    updated_at=now();

  -- Knowledge article for BMI, kept Draft + Inactive.
  INSERT INTO public.measurement_knowledge_articles (
    measurement_type_id,code,audience,title_ar,summary_ar,
    review_status,is_active,is_demo,version,change_reason
  ) VALUES (
    bmi_id,'bmi_guide','general','دليل مؤشر كتلة الجسم BMI',
    'شرح داخلي لطريقة الحساب، فئات البالغين، حدود استخدام BMI، ولماذا يجب قراءته كأداة فرز مع مؤشرات صحية أخرى.',
    'draft',false,false,1,
    'Initial BMI knowledge draft derived from CDC, WHO and NHS measurement guidance.'
  )
  ON CONFLICT (measurement_type_id,code,audience,version)
  DO UPDATE SET summary_ar=EXCLUDED.summary_ar,review_status='draft',is_active=false;

  DECLARE
    kb_id uuid;
  BEGIN
    SELECT id INTO kb_id
    FROM public.measurement_knowledge_articles
    WHERE measurement_type_id=bmi_id AND code='bmi_guide'
      AND audience='general' AND version=1;

    DELETE FROM public.measurement_knowledge_sections WHERE article_id=kb_id;

    INSERT INTO public.measurement_knowledge_sections
      (article_id,section_type,title_ar,body_ar,sort_order)
    VALUES
      (kb_id,'overview','ما هو BMI؟',
       'BMI هو الوزن بالكيلوغرام مقسومًا على مربع الطول بالمتر. هو أداة فرز بسيطة تساعد على وصف الوزن بالنسبة للطول، لكنه لا يقيس الدهون مباشرة ولا يشخّص مرضًا بمفرده.',10),
      (kb_id,'how_to_measure','اجعل الوزن والطول قابلين للمقارنة',
       'للاتجاهات عبر الوقت استخدم نفس الميزان وفي نفس المكان وعلى سطح مستوٍ، وفي وقت متقارب من اليوم، مع ملابس خفيفة ومن دون أحذية أو أشياء ثقيلة. قف ثابتًا حتى تستقر القراءة. دقة الطول مهمة لأن الخطأ فيه يؤثر على BMI بصورة تربيعية.',20),
      (kb_id,'what_it_means','فئات البالغين',
       'للبالغين من عمر 20 سنة فأكثر: أقل من 18.5 فئة نقص الوزن، 18.5 إلى أقل من 25 وزن صحي، 25 إلى أقل من 30 زيادة وزن، و30 فأكثر ضمن فئات السمنة. هذه فئات فرز وليست تشخيصًا فرديًا كاملًا.',30),
      (kb_id,'limitations','حدود BMI',
       'BMI لا يميز مباشرة بين الدهون والعضلات ولا يصف توزيع الدهون. لذلك يجب تفسيره مع مؤشرات أخرى مثل التاريخ الصحي، الفحص، ضغط الدم، التحاليل، محيط الخصر عند الحاجة، والسلوك الصحي.',40),
      (kb_id,'special_context','متى لا تستخدم فئات البالغين نفسها؟',
       'الأطفال والمراهقون يحتاجون BMI-for-age وليس فئات البالغين. كما أن الحمل لا يُفسر بهذه الفئات العامة، وقد يحتاج أصحاب الكتلة العضلية المرتفعة إلى مؤشرات إضافية بجانب BMI.',50);

    INSERT INTO public.measurement_knowledge_sources(article_id,source_id,source_role,notes)
    VALUES
      (kb_id,cdc_bmi_id,'primary','Adult BMI categories and screening limitation'),
      (kb_id,cdc_calc_id,'supporting','BMI formula and interpretation limitations'),
      (kb_id,who_obesity_id,'supporting','Adult overweight/obesity definitions'),
      (kb_id,nhs_weight_id,'capture','Consistent weight measurement technique')
    ON CONFLICT DO NOTHING;
  END;
END
$$;
