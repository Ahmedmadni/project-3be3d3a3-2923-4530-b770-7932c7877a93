-- Pulse / heart-rate source-backed draft pack.
-- All clinical interpretation remains Draft + Inactive.
-- Resting-pulse rules are explicitly separated from exercise, sleep and
-- symptom-based emergency routing.

DO $$
DECLARE
  pulse_id uuid;
  aha_pulse_id uuid;
  aha_brady_id uuid;
  aha_tachy_id uuid;
  nhs_palpitations_id uuid;
BEGIN
  SELECT id INTO pulse_id
  FROM public.measurement_types
  WHERE code = 'pulse';

  IF pulse_id IS NULL THEN
    RAISE EXCEPTION 'MEASUREMENT_FOUNDATION_REQUIRED: pulse type is missing';
  END IF;

  SELECT id INTO aha_pulse_id
  FROM public.medical_sources
  WHERE url = 'https://www.heart.org/en/health-topics/high-blood-pressure/the-facts-about-high-blood-pressure/all-about-heart-rate-pulse'
  LIMIT 1;

  IF aha_pulse_id IS NULL THEN
    INSERT INTO public.medical_sources (
      title, organization, url, source_type, is_active, language, country,
      organization_type, evidence_level, last_checked_at, last_verified_at,
      expires_review_at, notes
    )
    VALUES (
      'All About Heart Rate (Pulse)',
      'American Heart Association',
      'https://www.heart.org/en/health-topics/high-blood-pressure/the-facts-about-high-blood-pressure/all-about-heart-rate-pulse',
      'reference',
      true,
      'en',
      'US',
      'professional_association',
      'patient_reference',
      '2026-10-02T00:00:00Z',
      '2026-10-02T00:00:00Z',
      '2027-10-02',
      'Primary source for adult resting-pulse context, 60-100 bpm reference, manual 60-second counting and factors that can affect pulse.'
    )
    RETURNING id INTO aha_pulse_id;
  END IF;

  SELECT id INTO aha_brady_id
  FROM public.medical_sources
  WHERE url = 'https://www.heart.org/en/health-topics/arrhythmia/about-arrhythmia/bradycardia--slow-heart-rate'
  LIMIT 1;

  IF aha_brady_id IS NULL THEN
    INSERT INTO public.medical_sources (
      title, organization, url, publication_date, source_type, is_active,
      language, country, organization_type, evidence_level, published_at,
      last_checked_at, last_verified_at, expires_review_at, notes
    )
    VALUES (
      'Bradycardia: Slow Heart Rate',
      'American Heart Association',
      'https://www.heart.org/en/health-topics/arrhythmia/about-arrhythmia/bradycardia--slow-heart-rate',
      '2024-09-25',
      'reference',
      true,
      'en',
      'US',
      'professional_association',
      'patient_reference',
      '2024-09-25',
      '2026-10-02T00:00:00Z',
      '2026-10-02T00:00:00Z',
      '2027-10-02',
      'AHA notes resting rate below 60 can meet a bradycardia definition but can also occur during sleep, in athletes or physically active adults, and with some medications.'
    )
    RETURNING id INTO aha_brady_id;
  END IF;

  SELECT id INTO aha_tachy_id
  FROM public.medical_sources
  WHERE url = 'https://www.heart.org/en/health-topics/arrhythmia/about-arrhythmia/tachycardia--fast-heart-rate'
  LIMIT 1;

  IF aha_tachy_id IS NULL THEN
    INSERT INTO public.medical_sources (
      title, organization, url, source_type, is_active, language, country,
      organization_type, evidence_level, last_checked_at, last_verified_at,
      expires_review_at, notes
    )
    VALUES (
      'Tachycardia: Fast Heart Rate',
      'American Heart Association',
      'https://www.heart.org/en/health-topics/arrhythmia/about-arrhythmia/tachycardia--fast-heart-rate',
      'reference',
      true,
      'en',
      'US',
      'professional_association',
      'patient_reference',
      '2026-10-02T00:00:00Z',
      '2026-10-02T00:00:00Z',
      '2027-10-02',
      'AHA describes adult resting heart rate over 100 bpm as tachycardia and emphasizes age, health and physical condition context.'
    )
    RETURNING id INTO aha_tachy_id;
  END IF;

  SELECT id INTO nhs_palpitations_id
  FROM public.medical_sources
  WHERE url = 'https://www.nhs.uk/symptoms/heart-palpitations/'
  LIMIT 1;

  IF nhs_palpitations_id IS NULL THEN
    INSERT INTO public.medical_sources (
      title, organization, url, source_type, is_active, language, country,
      organization_type, evidence_level, last_checked_at, last_verified_at,
      expires_review_at, notes
    )
    VALUES (
      'Heart palpitations',
      'NHS',
      'https://www.nhs.uk/symptoms/heart-palpitations/',
      'government',
      true,
      'en',
      'GB',
      'government_health_service',
      'patient_emergency_guidance',
      '2026-10-02T00:00:00Z',
      '2026-10-02T00:00:00Z',
      '2027-10-02',
      'Emergency-routing source for ongoing palpitations with chest pain, shortness of breath, faintness or fainting. The emergency rule is symptom-led, not number-led.'
    )
    RETURNING id INTO nhs_palpitations_id;
  END IF;

  INSERT INTO public.measurement_sources (
    measurement_type_id, source_id, use_scope, last_verified_at, notes
  )
  VALUES
    (
      pulse_id, aha_pulse_id, 'capture_guidance', '2026-10-02T00:00:00Z',
      'Resting-state definition and 60-second manual pulse measurement.'
    ),
    (
      pulse_id, aha_pulse_id, 'reference_range', '2026-10-02T00:00:00Z',
      'Adult resting 60-100 bpm reference.'
    ),
    (
      pulse_id, aha_brady_id, 'reference_range', '2026-10-02T00:00:00Z',
      'Draft low resting-rate context and exceptions.'
    ),
    (
      pulse_id, aha_tachy_id, 'reference_range', '2026-10-02T00:00:00Z',
      'Draft high resting-rate context.'
    ),
    (
      pulse_id, nhs_palpitations_id, 'safety_threshold', '2026-10-02T00:00:00Z',
      'Symptom-led palpitations emergency routing; no numeric pulse threshold required.'
    )
  ON CONFLICT (measurement_type_id, source_id, use_scope) DO UPDATE SET
    last_verified_at = EXCLUDED.last_verified_at,
    notes = EXCLUDED.notes;

  UPDATE public.measurement_types
  SET
    canonical_unit = 'bpm',
    allowed_units = ARRAY['bpm'],
    capture_context_schema = '{
      "age_years":{"type":"number","required":true},
      "pregnant":{"type":"boolean","required":true},
      "rest_state":{"type":"string","required":true,"allowed":["resting","post_exercise","exercise","sleep","unknown"]},
      "awake":{"type":"boolean"},
      "calm":{"type":"boolean"},
      "recent_exercise":{"type":"boolean"},
      "body_position":{"type":"string","allowed":["sitting","lying","standing","other"]},
      "measurement_method":{"type":"string","allowed":["manual","device"]},
      "count_duration_seconds":{"type":"number"},
      "device_supported":{"type":"boolean"},
      "rhythm_regular":{"type":"boolean"},
      "athlete_or_highly_active":{"type":"boolean"},
      "rate_affecting_medication":{"type":"boolean"},
      "palpitations_present":{"type":"boolean"},
      "palpitations_ongoing":{"type":"boolean"},
      "emergency_cardiac_symptoms_present":{"type":"boolean"}
    }'::jsonb,
    description_ar = 'قياس معدل النبض مع توثيق الراحة أو المجهود وطريقة القياس وانتظام الإيقاع والعوامل التي قد تؤثر على النبض. الرقم وحده لا يشخّص اضطراب النظم.',
    updated_at = now()
  WHERE id = pulse_id;

  INSERT INTO public.measurement_reference_rules (
    measurement_type_id, code, label_ar, label_en, interpretation_code,
    predicate, care_level, source_id, review_status, is_active, is_demo,
    priority, version, change_reason
  )
  VALUES
    (
      pulse_id,
      'aha_adult_nonpregnant_resting_60_100',
      'مسودة: نبض راحة ضمن 60-100 لدى بالغ غير حامل',
      'Draft: adult nonpregnant resting pulse 60-100 bpm',
      'resting_reference_60_100',
      '{"all":[
        {"path":"context.age_years","operator":"gte","value":18},
        {"path":"context.pregnant","operator":"eq","value":false},
        {"path":"context.rest_state","operator":"eq","value":"resting"},
        {"path":"context.awake","operator":"eq","value":true},
        {"path":"value","operator":"gte","value":60},
        {"path":"value","operator":"lte","value":100}
      ]}'::jsonb,
      NULL,
      aha_pulse_id,
      'draft',
      false,
      false,
      40,
      1,
      'Adult resting-pulse reference only. Not a diagnosis and not applicable to exercise or sleep.'
    ),
    (
      pulse_id,
      'aha_adult_nonpregnant_resting_below_60',
      'مسودة: نبض راحة أقل من 60 لدى بالغ غير حامل',
      'Draft: adult nonpregnant resting pulse below 60 bpm',
      'resting_rate_below_60',
      '{"all":[
        {"path":"context.age_years","operator":"gte","value":18},
        {"path":"context.pregnant","operator":"eq","value":false},
        {"path":"context.rest_state","operator":"eq","value":"resting"},
        {"path":"context.awake","operator":"eq","value":true},
        {"path":"value","operator":"lt","value":60}
      ]}'::jsonb,
      NULL,
      aha_brady_id,
      'draft',
      false,
      false,
      30,
      1,
      'Low resting-rate draft. UI/reviewer must preserve athlete, sleep and medication context rather than implying disease.'
    ),
    (
      pulse_id,
      'aha_adult_nonpregnant_resting_over_100',
      'مسودة: نبض راحة أعلى من 100 لدى بالغ غير حامل',
      'Draft: adult nonpregnant resting pulse over 100 bpm',
      'resting_rate_over_100',
      '{"all":[
        {"path":"context.age_years","operator":"gte","value":18},
        {"path":"context.pregnant","operator":"eq","value":false},
        {"path":"context.rest_state","operator":"eq","value":"resting"},
        {"path":"context.awake","operator":"eq","value":true},
        {"path":"value","operator":"gt","value":100}
      ]}'::jsonb,
      NULL,
      aha_tachy_id,
      'draft',
      false,
      false,
      20,
      1,
      'High resting-rate draft. The value alone must not diagnose arrhythmia or determine emergency care.'
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
    pulse_id,
    'nhs_palpitations_with_emergency_symptoms',
    'مسودة: خفقان مستمر مع ألم صدر أو ضيق نفس أو شعور بالإغماء/إغماء',
    'Draft: ongoing palpitations with emergency symptoms',
    '{"all":[
      {"path":"context.age_years","operator":"gte","value":18},
      {"path":"context.pregnant","operator":"eq","value":false},
      {"path":"context.palpitations_present","operator":"eq","value":true},
      {"path":"context.palpitations_ongoing","operator":"eq","value":true},
      {"path":"context.emergency_cardiac_symptoms_present","operator":"eq","value":true}
    ]}'::jsonb,
    'emergency',
    nhs_palpitations_id,
    'draft',
    false,
    false,
    1,
    1,
    'Symptom-led NHS emergency-routing draft. It intentionally does not depend on a numeric pulse threshold.'
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
