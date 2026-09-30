-- Blood pressure draft clinical-content pack.
-- Source-backed but intentionally Draft + Inactive.
-- No rule in this migration is visible to production users.

DO $$
DECLARE
  bp_id uuid;
  aha_guideline_id uuid;
  aha_home_id uuid;
BEGIN
  SELECT id INTO bp_id
  FROM public.measurement_types
  WHERE code = 'blood_pressure';

  IF bp_id IS NULL THEN
    RAISE EXCEPTION 'MEASUREMENT_FOUNDATION_REQUIRED: blood_pressure measurement type is missing';
  END IF;

  SELECT id INTO aha_guideline_id
  FROM public.medical_sources
  WHERE url = 'https://professional.heart.org/en/science-news/2025-high-blood-pressure-guideline'
  LIMIT 1;

  IF aha_guideline_id IS NULL THEN
    INSERT INTO public.medical_sources (
      title, organization, url, publication_date, source_type, is_active,
      language, country, organization_type, evidence_level,
      published_at, last_checked_at, last_verified_at, expires_review_at, notes
    )
    VALUES (
      '2025 AHA/ACC High Blood Pressure Guideline',
      'American Heart Association / American College of Cardiology',
      'https://professional.heart.org/en/science-news/2025-high-blood-pressure-guideline',
      '2025-08-14',
      'clinical_guideline',
      true,
      'en',
      'US',
      'professional_association',
      'clinical_guideline',
      '2025-08-14',
      '2026-10-01T00:00:00Z',
      '2026-10-01T00:00:00Z',
      '2027-10-01',
      'Primary source for the draft nonpregnant-adult BP category and severe-hypertension rules. Draft use only until medical review.'
    )
    RETURNING id INTO aha_guideline_id;
  END IF;

  SELECT id INTO aha_home_id
  FROM public.medical_sources
  WHERE url = 'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings/monitoring-your-blood-pressure-at-home'
  LIMIT 1;

  IF aha_home_id IS NULL THEN
    INSERT INTO public.medical_sources (
      title, organization, url, publication_date, source_type, is_active,
      language, country, organization_type, evidence_level,
      last_checked_at, last_verified_at, expires_review_at, notes
    )
    VALUES (
      'Home Blood Pressure Monitoring',
      'American Heart Association',
      'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings/monitoring-your-blood-pressure-at-home',
      '2025-08-14',
      'guideline',
      true,
      'en',
      'US',
      'professional_association',
      'patient_measurement_guidance',
      '2026-10-01T00:00:00Z',
      '2026-10-01T00:00:00Z',
      '2027-10-01',
      'Used for draft capture-quality guidance and the high-reading repeat/symptom workflow. Not a substitute for clinician diagnosis.'
    )
    RETURNING id INTO aha_home_id;
  END IF;

  INSERT INTO public.measurement_sources (
    measurement_type_id, source_id, use_scope, last_verified_at, notes
  )
  VALUES
    (
      bp_id, aha_guideline_id, 'reference_range', '2026-10-01T00:00:00Z',
      'Draft adult, nonpregnant blood-pressure categories only.'
    ),
    (
      bp_id, aha_guideline_id, 'safety_threshold', '2026-10-01T00:00:00Z',
      'Draft severe-hypertension / hypertensive-emergency threshold logic.'
    ),
    (
      bp_id, aha_home_id, 'capture_guidance', '2026-10-01T00:00:00Z',
      'Validated upper-arm cuff, positioning, rest, repeat-reading and home-measurement technique.'
    )
  ON CONFLICT (measurement_type_id, source_id, use_scope) DO UPDATE SET
    last_verified_at = EXCLUDED.last_verified_at,
    notes = EXCLUDED.notes;

  UPDATE public.measurement_types
  SET
    capture_context_schema = '{
      "age_years":{"type":"number","required":true},
      "pregnant":{"type":"boolean","required":true},
      "measurement_setting":{"type":"string","allowed":["home","clinic","other"]},
      "device_validated":{"type":"boolean"},
      "cuff_size_confirmed":{"type":"boolean"},
      "rest_minutes":{"type":"number"},
      "back_supported":{"type":"boolean"},
      "feet_flat":{"type":"boolean"},
      "legs_crossed":{"type":"boolean"},
      "arm_supported_at_heart_level":{"type":"boolean"},
      "cuff_over_clothing":{"type":"boolean"},
      "talking_during_measurement":{"type":"boolean"},
      "recent_smoking_caffeine_or_exercise_30m":{"type":"boolean"},
      "bp_red_flag_symptoms_present":{"type":"boolean"}
    }'::jsonb,
    description_ar = 'التقاط ضغط الدم الانقباضي والانبساطي مع سياق القياس. قواعد التصنيف الحالية مسودات غير مفعلة ومحصورة مبدئيًا في البالغين غير الحوامل.',
    updated_at = now()
  WHERE id = bp_id;

  INSERT INTO public.measurement_reference_rules (
    measurement_type_id, code, label_ar, label_en, interpretation_code,
    predicate, care_level, source_id, review_status, is_active, is_demo, priority, version,
    change_reason
  )
  VALUES
    (
      bp_id,
      'aha_2025_adult_nonpregnant_normal',
      'مسودة: ضغط دم ضمن التصنيف الطبيعي للبالغ غير الحامل',
      'Draft: normal BP category for nonpregnant adult',
      'normal',
      '{"all":[
        {"path":"context.age_years","operator":"gte","value":18},
        {"path":"context.pregnant","operator":"eq","value":false},
        {"path":"components.systolic","operator":"lt","value":120},
        {"path":"components.diastolic","operator":"lt","value":80}
      ]}'::jsonb,
      NULL, aha_guideline_id, 'draft', false, false, 50, 1,
      'Initial source-backed draft from 2025 AHA/ACC guideline. Requires medical review before activation.'
    ),
    (
      bp_id,
      'aha_2025_adult_nonpregnant_elevated',
      'مسودة: ضغط دم مرتفع عن الطبيعي للبالغ غير الحامل',
      'Draft: elevated BP category for nonpregnant adult',
      'elevated',
      '{"all":[
        {"path":"context.age_years","operator":"gte","value":18},
        {"path":"context.pregnant","operator":"eq","value":false},
        {"path":"components.systolic","operator":"gte","value":120},
        {"path":"components.systolic","operator":"lt","value":130},
        {"path":"components.diastolic","operator":"lt","value":80}
      ]}'::jsonb,
      NULL, aha_guideline_id, 'draft', false, false, 40, 1,
      'Initial source-backed draft from 2025 AHA/ACC guideline. Requires medical review before activation.'
    ),
    (
      bp_id,
      'aha_2025_adult_nonpregnant_stage_1',
      'مسودة: ارتفاع ضغط الدم - المرحلة الأولى',
      'Draft: stage 1 hypertension category',
      'stage_1',
      '{"all":[
        {"path":"context.age_years","operator":"gte","value":18},
        {"path":"context.pregnant","operator":"eq","value":false}
      ],"anyOf":[
        [
          {"path":"components.systolic","operator":"gte","value":130},
          {"path":"components.systolic","operator":"lt","value":140}
        ],
        [
          {"path":"components.diastolic","operator":"gte","value":80},
          {"path":"components.diastolic","operator":"lt","value":90}
        ]
      ]}'::jsonb,
      NULL, aha_guideline_id, 'draft', false, false, 30, 1,
      'Initial source-backed draft from 2025 AHA/ACC guideline. Requires medical review before activation.'
    ),
    (
      bp_id,
      'aha_2025_adult_nonpregnant_stage_2',
      'مسودة: ارتفاع ضغط الدم - المرحلة الثانية',
      'Draft: stage 2 hypertension category',
      'stage_2',
      '{"all":[
        {"path":"context.age_years","operator":"gte","value":18},
        {"path":"context.pregnant","operator":"eq","value":false}
      ],"any":[
        {"path":"components.systolic","operator":"gte","value":140},
        {"path":"components.diastolic","operator":"gte","value":90}
      ]}'::jsonb,
      NULL, aha_guideline_id, 'draft', false, false, 20, 1,
      'Initial source-backed draft from 2025 AHA/ACC guideline. Requires medical review before activation.'
    ),
    (
      bp_id,
      'aha_2025_adult_nonpregnant_severe',
      'مسودة: ارتفاع شديد في ضغط الدم',
      'Draft: severe hypertension',
      'severe_hypertension',
      '{"all":[
        {"path":"context.age_years","operator":"gte","value":18},
        {"path":"context.pregnant","operator":"eq","value":false}
      ],"any":[
        {"path":"components.systolic","operator":"gt","value":180},
        {"path":"components.diastolic","operator":"gt","value":120}
      ]}'::jsonb,
      NULL, aha_guideline_id, 'draft', false, false, 5, 1,
      'Draft severe-hypertension classification. Must not be presented as diagnosis and requires medical review.'
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
    care_level, source_id, review_status, is_active, is_demo, priority, version,
    change_reason
  )
  VALUES (
    bp_id,
    'aha_2025_adult_nonpregnant_hypertensive_emergency_symptoms',
    'مسودة: ارتفاع شديد في الضغط مع أعراض إنذار',
    'Draft: severely elevated BP with emergency warning symptoms',
    '{"all":[
      {"path":"context.age_years","operator":"gte","value":18},
      {"path":"context.pregnant","operator":"eq","value":false},
      {"path":"context.bp_red_flag_symptoms_present","operator":"eq","value":true}
    ],"any":[
      {"path":"components.systolic","operator":"gt","value":180},
      {"path":"components.diastolic","operator":"gt","value":120}
    ]}'::jsonb,
    'emergency',
    aha_guideline_id,
    'draft',
    false,
    false,
    1,
    1,
    'Source-backed emergency-routing draft. Remains inactive pending medical review and integration with symptom confirmation.'
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

COMMENT ON TABLE public.measurement_reference_rules
IS 'Source-backed interpretation rules. Blood-pressure rules added in the 2026-10-01 pack remain Draft + Inactive until medical review.';

COMMENT ON TABLE public.measurement_red_flags
IS 'Source-backed measurement safety rules. Blood-pressure emergency logic added in the 2026-10-01 pack remains Draft + Inactive until medical review.';
