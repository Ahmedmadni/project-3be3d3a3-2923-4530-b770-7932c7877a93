-- Blood glucose source-backed draft pack.
-- Diagnostic criteria are restricted to documented laboratory venous plasma.
-- Home capillary meters are monitoring tools here, not diagnostic tests.
-- All clinical rules remain Draft + Inactive.

DO $$
DECLARE
  glucose_id uuid;
  ada_2026_id uuid;
  niddk_diag_id uuid;
  fda_meter_id uuid;
  nhs_hypo_id uuid;
BEGIN
  SELECT id INTO glucose_id
  FROM public.measurement_types
  WHERE code = 'blood_glucose';

  IF glucose_id IS NULL THEN
    RAISE EXCEPTION 'MEASUREMENT_FOUNDATION_REQUIRED: blood_glucose type is missing';
  END IF;

  SELECT id INTO ada_2026_id
  FROM public.medical_sources
  WHERE url = 'https://diabetesjournals.org/care/article/49/Supplement_1/S27/163926/2-Diagnosis-and-Classification-of-Diabetes'
  LIMIT 1;

  IF ada_2026_id IS NULL THEN
    INSERT INTO public.medical_sources (
      title, organization, url, source_type, is_active, language, country,
      organization_type, evidence_level, published_at, last_checked_at,
      last_verified_at, expires_review_at, notes
    )
    VALUES (
      'Standards of Care in Diabetes—2026: Diagnosis and Classification of Diabetes',
      'American Diabetes Association',
      'https://diabetesjournals.org/care/article/49/Supplement_1/S27/163926/2-Diagnosis-and-Classification-of-Diabetes',
      'clinical_guideline',
      true,
      'en',
      'US',
      'professional_association',
      'clinical_guideline',
      '2026-01-01',
      '2026-10-02T00:00:00Z',
      '2026-10-02T00:00:00Z',
      '2027-01-01',
      'Primary source for nonpregnant adult plasma-glucose diagnostic criteria. Diagnosis generally requires confirmatory testing unless hyperglycemia is unequivocal.'
    )
    RETURNING id INTO ada_2026_id;
  END IF;

  SELECT id INTO niddk_diag_id
  FROM public.medical_sources
  WHERE url = 'https://www.niddk.nih.gov/health-information/diabetes/overview/tests-diagnosis'
  LIMIT 1;

  IF niddk_diag_id IS NULL THEN
    INSERT INTO public.medical_sources (
      title, organization, url, source_type, is_active, language, country,
      organization_type, evidence_level, last_checked_at, last_verified_at,
      expires_review_at, notes
    )
    VALUES (
      'Diabetes Tests & Diagnosis',
      'National Institute of Diabetes and Digestive and Kidney Diseases',
      'https://www.niddk.nih.gov/health-information/diabetes/overview/tests-diagnosis',
      'government',
      true,
      'en',
      'US',
      'government',
      'patient_diagnostic_guidance',
      '2026-10-02T00:00:00Z',
      '2026-10-02T00:00:00Z',
      '2027-10-02',
      'Secondary diagnostic-method source. Distinguishes fasting plasma, OGTT, random plasma with symptoms, and pregnancy-specific testing.'
    )
    RETURNING id INTO niddk_diag_id;
  END IF;

  SELECT id INTO fda_meter_id
  FROM public.medical_sources
  WHERE url = 'https://www.fda.gov/medical-devices/home-health-and-consumer-devices/home-healthcare-medical-devices-blood-glucose-meters-getting-most-out-your-meter'
  LIMIT 1;

  IF fda_meter_id IS NULL THEN
    INSERT INTO public.medical_sources (
      title, organization, url, source_type, is_active, language, country,
      organization_type, evidence_level, last_checked_at, last_verified_at,
      expires_review_at, notes
    )
    VALUES (
      'Blood Glucose Meters - Getting the Most Out of Your Meter',
      'U.S. Food and Drug Administration',
      'https://www.fda.gov/medical-devices/home-health-and-consumer-devices/home-healthcare-medical-devices-blood-glucose-meters-getting-most-out-your-meter',
      'government',
      true,
      'en',
      'US',
      'government',
      'device_safety_guidance',
      '2026-10-02T00:00:00Z',
      '2026-10-02T00:00:00Z',
      '2027-10-02',
      'Home-meter capture-quality source: washed hands, compatible/nonexpired strips, sufficient sample, no finger squeezing, and awareness that meters are imperfect.'
    )
    RETURNING id INTO fda_meter_id;
  END IF;

  SELECT id INTO nhs_hypo_id
  FROM public.medical_sources
  WHERE url = 'https://www.nhs.uk/conditions/low-blood-sugar-hypoglycaemia/'
  LIMIT 1;

  IF nhs_hypo_id IS NULL THEN
    INSERT INTO public.medical_sources (
      title, organization, url, source_type, is_active, language, country,
      organization_type, evidence_level, last_checked_at, last_verified_at,
      expires_review_at, notes
    )
    VALUES (
      'Low blood sugar (hypoglycaemia)',
      'NHS',
      'https://www.nhs.uk/conditions/low-blood-sugar-hypoglycaemia/',
      'government',
      true,
      'en',
      'GB',
      'government_health_service',
      'patient_emergency_guidance',
      '2026-10-02T00:00:00Z',
      '2026-10-02T00:00:00Z',
      '2027-10-02',
      'Hypoglycaemia source: usually below 4 mmol/L; severe episodes may include seizures or unconsciousness and require emergency response.'
    )
    RETURNING id INTO nhs_hypo_id;
  END IF;

  INSERT INTO public.measurement_sources (
    measurement_type_id, source_id, use_scope, last_verified_at, notes
  )
  VALUES
    (
      glucose_id, ada_2026_id, 'reference_range', '2026-10-02T00:00:00Z',
      'Nonpregnant laboratory plasma diagnostic ranges and confirmatory-testing requirement.'
    ),
    (
      glucose_id, niddk_diag_id, 'reference_range', '2026-10-02T00:00:00Z',
      'Diagnostic method and pregnancy-separation cross-check.'
    ),
    (
      glucose_id, fda_meter_id, 'capture_guidance', '2026-10-02T00:00:00Z',
      'Home glucose-meter quality and safe-use guidance.'
    ),
    (
      glucose_id, nhs_hypo_id, 'safety_threshold', '2026-10-02T00:00:00Z',
      'Low-glucose and severe-hypoglycaemia draft logic.'
    )
  ON CONFLICT (measurement_type_id, source_id, use_scope) DO UPDATE SET
    last_verified_at = EXCLUDED.last_verified_at,
    notes = EXCLUDED.notes;

  UPDATE public.measurement_types
  SET
    canonical_unit = 'mg/dL',
    allowed_units = ARRAY['mg/dL','mmol/L'],
    capture_context_schema = '{
      "age_years":{"type":"number","required":true},
      "pregnant":{"type":"boolean","required":true},
      "known_diabetes":{"type":"boolean"},
      "glucose_lowering_medication":{"type":"boolean"},
      "measurement_method":{"type":"string","required":true,"allowed":["laboratory","home_meter","cgm","other"]},
      "sample_source":{"type":"string","allowed":["venous_plasma","capillary_whole_blood","interstitial","other"]},
      "sample_site":{"type":"string"},
      "timing":{"type":"string","required":true,"allowed":["fasting","random","ogtt_2h","post_meal","pre_meal","other"]},
      "fasting_hours":{"type":"number"},
      "minutes_since_meal":{"type":"number"},
      "ogtt_glucose_load_g":{"type":"number"},
      "diagnostic_intent":{"type":"boolean"},
      "classic_hyperglycemia_symptoms":{"type":"boolean"},
      "severe_hypoglycemia_symptoms_present":{"type":"boolean"},
      "meter_supported":{"type":"boolean"},
      "hands_washed_and_dry":{"type":"boolean"},
      "strip_compatible":{"type":"boolean"},
      "strip_expired":{"type":"boolean"},
      "strip_storage_ok":{"type":"boolean"},
      "sample_sufficient":{"type":"boolean"},
      "rapid_glucose_change_expected":{"type":"boolean"}
    }'::jsonb,
    description_ar = 'قياس سكر الدم مع توثيق التوقيت، نوع العينة، طريقة القياس، الحمل والسكري المعروف. التحويل بين mg/dL و mmol/L مسموح، لكن القياس المنزلي لا يُستخدم لتشخيص السكري.',
    updated_at = now()
  WHERE id = glucose_id;

  INSERT INTO public.measurement_reference_rules (
    measurement_type_id, code, label_ar, label_en, interpretation_code,
    predicate, care_level, source_id, review_status, is_active, is_demo,
    priority, version, change_reason
  )
  VALUES
    (
      glucose_id,
      'ada_2026_nonpregnant_fpg_prediabetes_range',
      'مسودة: جلوكوز صيام مخبري ضمن نطاق ما قبل السكري',
      'Draft: fasting plasma glucose in prediabetes range',
      'prediabetes_range_fpg',
      '{"all":[
        {"path":"context.age_years","operator":"gte","value":18},
        {"path":"context.pregnant","operator":"eq","value":false},
        {"path":"context.measurement_method","operator":"eq","value":"laboratory"},
        {"path":"context.sample_source","operator":"eq","value":"venous_plasma"},
        {"path":"context.timing","operator":"eq","value":"fasting"},
        {"path":"context.fasting_hours","operator":"gte","value":8},
        {"path":"value","operator":"gte","value":100},
        {"path":"value","operator":"lte","value":125}
      ]}'::jsonb,
      NULL, ada_2026_id, 'draft', false, false, 30, 1,
      'ADA 2026 nonpregnant FPG draft. Laboratory plasma only; not a home-meter diagnosis.'
    ),
    (
      glucose_id,
      'ada_2026_nonpregnant_fpg_diabetes_range',
      'مسودة: جلوكوز صيام مخبري ضمن نطاق تشخيص السكري',
      'Draft: fasting plasma glucose in diabetes diagnostic range',
      'diabetes_range_fpg',
      '{"all":[
        {"path":"context.age_years","operator":"gte","value":18},
        {"path":"context.pregnant","operator":"eq","value":false},
        {"path":"context.measurement_method","operator":"eq","value":"laboratory"},
        {"path":"context.sample_source","operator":"eq","value":"venous_plasma"},
        {"path":"context.timing","operator":"eq","value":"fasting"},
        {"path":"context.fasting_hours","operator":"gte","value":8},
        {"path":"value","operator":"gte","value":126}
      ]}'::jsonb,
      NULL, ada_2026_id, 'draft', false, false, 20, 1,
      'ADA 2026 diagnostic-range draft; generally requires confirmatory testing absent unequivocal hyperglycemia.'
    ),
    (
      glucose_id,
      'ada_2026_nonpregnant_ogtt2h_prediabetes_range',
      'مسودة: اختبار تحمل الجلوكوز بعد ساعتين ضمن نطاق ما قبل السكري',
      'Draft: 2-hour 75-g OGTT in prediabetes range',
      'prediabetes_range_ogtt_2h',
      '{"all":[
        {"path":"context.age_years","operator":"gte","value":18},
        {"path":"context.pregnant","operator":"eq","value":false},
        {"path":"context.measurement_method","operator":"eq","value":"laboratory"},
        {"path":"context.sample_source","operator":"eq","value":"venous_plasma"},
        {"path":"context.timing","operator":"eq","value":"ogtt_2h"},
        {"path":"context.ogtt_glucose_load_g","operator":"eq","value":75},
        {"path":"value","operator":"gte","value":140},
        {"path":"value","operator":"lte","value":199}
      ]}'::jsonb,
      NULL, ada_2026_id, 'draft', false, false, 30, 1,
      'ADA 2026 nonpregnant 75-g OGTT draft; laboratory plasma only.'
    ),
    (
      glucose_id,
      'ada_2026_nonpregnant_ogtt2h_diabetes_range',
      'مسودة: اختبار تحمل الجلوكوز بعد ساعتين ضمن نطاق تشخيص السكري',
      'Draft: 2-hour 75-g OGTT in diabetes diagnostic range',
      'diabetes_range_ogtt_2h',
      '{"all":[
        {"path":"context.age_years","operator":"gte","value":18},
        {"path":"context.pregnant","operator":"eq","value":false},
        {"path":"context.measurement_method","operator":"eq","value":"laboratory"},
        {"path":"context.sample_source","operator":"eq","value":"venous_plasma"},
        {"path":"context.timing","operator":"eq","value":"ogtt_2h"},
        {"path":"context.ogtt_glucose_load_g","operator":"eq","value":75},
        {"path":"value","operator":"gte","value":200}
      ]}'::jsonb,
      NULL, ada_2026_id, 'draft', false, false, 20, 1,
      'ADA 2026 diagnostic-range draft; generally requires confirmation absent unequivocal hyperglycemia.'
    ),
    (
      glucose_id,
      'ada_2026_nonpregnant_random_symptomatic_diabetes_range',
      'مسودة: جلوكوز عشوائي مخبري مرتفع مع أعراض كلاسيكية',
      'Draft: random plasma glucose with classic hyperglycemia symptoms',
      'diabetes_range_random_symptomatic',
      '{"all":[
        {"path":"context.age_years","operator":"gte","value":18},
        {"path":"context.pregnant","operator":"eq","value":false},
        {"path":"context.measurement_method","operator":"eq","value":"laboratory"},
        {"path":"context.sample_source","operator":"eq","value":"venous_plasma"},
        {"path":"context.timing","operator":"eq","value":"random"},
        {"path":"context.classic_hyperglycemia_symptoms","operator":"eq","value":true},
        {"path":"value","operator":"gte","value":200}
      ]}'::jsonb,
      NULL, ada_2026_id, 'draft', false, false, 10, 1,
      'ADA 2026 random-plasma criterion requires classic hyperglycemia symptoms or hyperglycemic crisis.'
    ),
    (
      glucose_id,
      'nhs_known_diabetes_hypoglycaemia_below_4mmol',
      'مسودة: سكر منخفض أقل من 4 mmol/L لدى مريض سكري',
      'Draft: low glucose below 4 mmol/L in known diabetes',
      'hypoglycaemia_below_4mmol',
      '{"all":[
        {"path":"context.age_years","operator":"gte","value":18},
        {"path":"context.pregnant","operator":"eq","value":false},
        {"path":"context.known_diabetes","operator":"eq","value":true},
        {"path":"value","operator":"lt","value":72.0728}
      ]}'::jsonb,
      NULL, nhs_hypo_id, 'draft', false, false, 5, 1,
      'NHS low-glucose draft converted from <4 mmol/L to canonical mg/dL. No treatment instructions are activated by this rule.'
    )
  ON CONFLICT (measurement_type_id, code, version) DO UPDATE SET
    predicate = EXCLUDED.predicate,
    source_id = EXCLUDED.source_id,
    review_status = 'draft',
    is_active = false,
    is_demo = false,
    priority = EXCLUDED.priority,
    change_reason = EXCLUDED.change_reason,
    updated_at = now();

  INSERT INTO public.measurement_red_flags (
    measurement_type_id, code, title_ar, title_en, predicate,
    care_level, source_id, review_status, is_active, is_demo,
    priority, version, change_reason
  )
  VALUES (
    glucose_id,
    'nhs_low_glucose_with_severe_neuroglycopenic_symptoms',
    'مسودة: سكر منخفض مع تشنج أو فقدان وعي/استجابة غير طبيعية',
    'Draft: low glucose with severe hypoglycaemia symptoms',
    '{"all":[
      {"path":"context.age_years","operator":"gte","value":18},
      {"path":"context.pregnant","operator":"eq","value":false},
      {"path":"context.severe_hypoglycemia_symptoms_present","operator":"eq","value":true},
      {"path":"value","operator":"lt","value":72.0728}
    ]}'::jsonb,
    'emergency',
    nhs_hypo_id,
    'draft',
    false,
    false,
    1,
    1,
    'Symptom-led severe-hypoglycaemia emergency draft. Remains inactive pending medical review and symptom-engine integration.'
  )
  ON CONFLICT (measurement_type_id, code, version) DO UPDATE SET
    predicate = EXCLUDED.predicate,
    source_id = EXCLUDED.source_id,
    review_status = 'draft',
    is_active = false,
    is_demo = false,
    priority = EXCLUDED.priority,
    change_reason = EXCLUDED.change_reason,
    updated_at = now();
END
$$;
