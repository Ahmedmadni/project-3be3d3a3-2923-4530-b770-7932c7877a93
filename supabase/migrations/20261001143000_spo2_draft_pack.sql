-- SpO2 / pulse-oximetry source-backed draft pack.
-- All clinical thresholds remain Draft + Inactive.
-- The first thresholds are scoped to an acute respiratory home-monitoring
-- pathway and MUST NOT be generalized to all users.

DO $$
DECLARE
  spo2_id uuid;
  fda_basics_id uuid;
  fda_2025_id uuid;
  nhs_home_id uuid;
BEGIN
  SELECT id INTO spo2_id
  FROM public.measurement_types
  WHERE code = 'oxygen_saturation';

  IF spo2_id IS NULL THEN
    RAISE EXCEPTION 'MEASUREMENT_FOUNDATION_REQUIRED: oxygen_saturation type is missing';
  END IF;

  SELECT id INTO fda_basics_id
  FROM public.medical_sources
  WHERE url = 'https://www.fda.gov/consumers/consumer-updates/pulse-oximeter-basics'
  LIMIT 1;

  IF fda_basics_id IS NULL THEN
    INSERT INTO public.medical_sources (
      title, organization, url, source_type, is_active, language, country,
      organization_type, evidence_level, last_checked_at, last_verified_at,
      expires_review_at, notes
    )
    VALUES (
      'Pulse Oximeter Basics',
      'U.S. Food and Drug Administration',
      'https://www.fda.gov/consumers/consumer-updates/pulse-oximeter-basics',
      'government',
      true,
      'en',
      'US',
      'government',
      'regulatory_patient_guidance',
      '2026-10-01T00:00:00Z',
      '2026-10-01T00:00:00Z',
      '2027-10-01',
      'Capture-quality and device-limitation source. FDA states pulse oximetry is an estimate and should not be used alone for clinical decisions.'
    )
    RETURNING id INTO fda_basics_id;
  END IF;

  SELECT id INTO fda_2025_id
  FROM public.medical_sources
  WHERE url = 'https://www.fda.gov/regulatory-information/search-fda-guidance-documents/pulse-oximeters-medical-purposes-non-clinical-and-clinical-performance-testing-labeling-and'
  LIMIT 1;

  IF fda_2025_id IS NULL THEN
    INSERT INTO public.medical_sources (
      title, organization, url, publication_date, source_type, is_active,
      language, country, organization_type, evidence_level, published_at,
      last_checked_at, last_verified_at, expires_review_at, notes
    )
    VALUES (
      'Pulse Oximeters for Medical Purposes - Draft Guidance',
      'U.S. Food and Drug Administration',
      'https://www.fda.gov/regulatory-information/search-fda-guidance-documents/pulse-oximeters-medical-purposes-non-clinical-and-clinical-performance-testing-labeling-and',
      '2025-01-06',
      'government',
      true,
      'en',
      'US',
      'government',
      'draft_regulatory_guidance',
      '2025-01-06',
      '2026-10-01T00:00:00Z',
      '2026-10-01T00:00:00Z',
      '2027-01-06',
      'Draft/non-binding FDA guidance. Used only to document performance/accuracy concerns, including skin-pigmentation performance, not as a clinical threshold source.'
    )
    RETURNING id INTO fda_2025_id;
  END IF;

  SELECT id INTO nhs_home_id
  FROM public.medical_sources
  WHERE url = 'https://www.england.nhs.uk/coronavirus/documents/c0445-pulse-oximetry-to-detect-early-deterioration-of-patients-with-covid-19-in-primary-and-community-care-settings-12-january-2021/'
  LIMIT 1;

  IF nhs_home_id IS NULL THEN
    INSERT INTO public.medical_sources (
      title, organization, url, publication_date, source_type, is_active,
      language, country, organization_type, evidence_level, published_at,
      last_checked_at, last_verified_at, expires_review_at, notes
    )
    VALUES (
      'Pulse oximetry to detect early deterioration in primary and community care',
      'NHS England',
      'https://www.england.nhs.uk/coronavirus/documents/c0445-pulse-oximetry-to-detect-early-deterioration-of-patients-with-covid-19-in-primary-and-community-care-settings-12-january-2021/',
      '2021-01-12',
      'guideline',
      true,
      'en',
      'GB',
      'government_health_service',
      'care_pathway_guidance',
      '2021-01-12',
      '2026-10-01T00:00:00Z',
      '2026-10-01T00:00:00Z',
      '2027-01-12',
      'Thresholds are retained only as a draft acute respiratory home-monitoring pathway. They are not a universal SpO2 interpretation rule.'
    )
    RETURNING id INTO nhs_home_id;
  END IF;

  INSERT INTO public.measurement_sources (
    measurement_type_id, source_id, use_scope, last_verified_at, notes
  )
  VALUES
    (
      spo2_id, fda_basics_id, 'capture_guidance', '2026-10-01T00:00:00Z',
      'Pulse-oximeter use, reading-quality and device limitations.'
    ),
    (
      spo2_id, fda_2025_id, 'capture_guidance', '2026-10-01T00:00:00Z',
      'Device-performance and accuracy limitations; not a threshold source.'
    ),
    (
      spo2_id, nhs_home_id, 'safety_threshold', '2026-10-01T00:00:00Z',
      'Draft acute respiratory home-monitoring thresholds only.'
    )
  ON CONFLICT (measurement_type_id, source_id, use_scope) DO UPDATE SET
    last_verified_at = EXCLUDED.last_verified_at,
    notes = EXCLUDED.notes;

  UPDATE public.measurement_types
  SET
    capture_context_schema = '{
      "age_years":{"type":"number","required":true},
      "pregnant":{"type":"boolean","required":true},
      "monitoring_pathway":{"type":"string"},
      "usual_spo2_below_95":{"type":"boolean"},
      "baseline_spo2":{"type":"number"},
      "repeat_confirmed":{"type":"boolean"},
      "measurement_setting":{"type":"string","allowed":["home","clinic","other"]},
      "device_intended_for_medical_use":{"type":"boolean"},
      "hand_warm":{"type":"boolean"},
      "nail_polish_removed":{"type":"boolean"},
      "motion_free":{"type":"boolean"},
      "reading_stable":{"type":"boolean"},
      "poor_circulation":{"type":"boolean"},
      "current_tobacco_use":{"type":"boolean"},
      "signal_quality_ok":{"type":"boolean"},
      "symptoms_present":{"type":"boolean"}
    }'::jsonb,
    description_ar = 'قياس تقديري لتشبع الأكسجين بالنبض. التفسير يعتمد على السياق وجودة الجهاز والقراءة والأعراض وخط الأساس؛ القواعد السريرية الحالية مسودات غير مفعلة.',
    updated_at = now()
  WHERE id = spo2_id;

  INSERT INTO public.measurement_reference_rules (
    measurement_type_id, code, label_ar, label_en, interpretation_code,
    predicate, care_level, source_id, review_status, is_active, is_demo,
    priority, version, change_reason
  )
  VALUES (
    spo2_id,
    'nhs_acute_home_adult_nonpregnant_95_plus',
    'مسودة: قراءة 95% فأعلى ضمن مسار المتابعة التنفسية المنزلية',
    'Draft: 95% or above in acute respiratory home monitoring',
    'pathway_monitoring_range',
    '{"all":[
      {"path":"context.age_years","operator":"gte","value":18},
      {"path":"context.pregnant","operator":"eq","value":false},
      {"path":"context.monitoring_pathway","operator":"eq","value":"acute_respiratory_home_monitoring"},
      {"path":"context.usual_spo2_below_95","operator":"eq","value":false},
      {"path":"value","operator":"gte","value":95}
    ]}'::jsonb,
    NULL,
    nhs_home_id,
    'draft',
    false,
    false,
    50,
    1,
    'Context-specific NHS home-monitoring draft. Not a universal normal-range rule.'
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
  VALUES
    (
      spo2_id,
      'nhs_acute_home_adult_nonpregnant_93_94',
      'مسودة: قراءة 93-94% بعد إعادة القياس ضمن مسار متابعة تنفسية',
      'Draft: repeat-confirmed 93-94% in acute respiratory home monitoring',
      '{"all":[
        {"path":"context.age_years","operator":"gte","value":18},
        {"path":"context.pregnant","operator":"eq","value":false},
        {"path":"context.monitoring_pathway","operator":"eq","value":"acute_respiratory_home_monitoring"},
        {"path":"context.usual_spo2_below_95","operator":"eq","value":false},
        {"path":"context.repeat_confirmed","operator":"eq","value":true},
        {"path":"value","operator":"gte","value":93},
        {"path":"value","operator":"lte","value":94}
      ]}'::jsonb,
      'urgent',
      nhs_home_id,
      'draft',
      false,
      false,
      10,
      1,
      'Draft pathway escalation rule. Medical review required before activation.'
    ),
    (
      spo2_id,
      'nhs_acute_home_adult_nonpregnant_92_or_less',
      'مسودة: قراءة 92% أو أقل بعد إعادة القياس ضمن مسار متابعة تنفسية',
      'Draft: repeat-confirmed 92% or less in acute respiratory home monitoring',
      '{"all":[
        {"path":"context.age_years","operator":"gte","value":18},
        {"path":"context.pregnant","operator":"eq","value":false},
        {"path":"context.monitoring_pathway","operator":"eq","value":"acute_respiratory_home_monitoring"},
        {"path":"context.usual_spo2_below_95","operator":"eq","value":false},
        {"path":"context.repeat_confirmed","operator":"eq","value":true},
        {"path":"value","operator":"lte","value":92}
      ]}'::jsonb,
      'emergency',
      nhs_home_id,
      'draft',
      false,
      false,
      1,
      1,
      'Draft pathway emergency rule. Medical review required before activation.'
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
