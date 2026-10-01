-- Respiratory-rate source-backed draft pack.
-- Resting reference and symptom-led emergency routing remain Draft + Inactive.
-- Numeric respiratory rate alone does not trigger emergency care.

DO $$
DECLARE
  rr_id uuid;
  hee_rr_id uuid;
  nhs_sob_id uuid;
  rcp_news2_id uuid;
BEGIN
  SELECT id INTO rr_id
  FROM public.measurement_types
  WHERE code = 'respiratory_rate';

  IF rr_id IS NULL THEN
    RAISE EXCEPTION 'MEASUREMENT_FOUNDATION_REQUIRED: respiratory_rate type is missing';
  END IF;

  SELECT id INTO hee_rr_id
  FROM public.medical_sources
  WHERE url = 'https://www.hee.nhs.uk/sites/default/files/documents/Work%20Experience%20in%20Nursing%20-%20Best%20Practice%20Guide.pdf'
  LIMIT 1;

  IF hee_rr_id IS NULL THEN
    INSERT INTO public.medical_sources (
      title, organization, url, publication_date, source_type, is_active,
      language, country, organization_type, evidence_level, published_at,
      last_checked_at, last_verified_at, expires_review_at, notes
    )
    VALUES (
      'Work Experience in Nursing - Best Practice Guide: Respiration',
      'Health Education England / NHS England',
      'https://www.hee.nhs.uk/sites/default/files/documents/Work%20Experience%20in%20Nursing%20-%20Best%20Practice%20Guide.pdf',
      '2024-01-01',
      'government',
      true,
      'en',
      'GB',
      'government_health_service',
      'clinical_observation_training',
      '2024-01-01',
      '2026-10-02T00:00:00Z',
      '2026-10-02T00:00:00Z',
      '2027-10-02',
      'Capture guidance: count breaths for a full minute at rest, note rhythm/depth/distress, and avoid making the person consciously alter breathing. Uses 12-16 breaths/min as a common adult resting range.'
    )
    RETURNING id INTO hee_rr_id;
  END IF;

  SELECT id INTO nhs_sob_id
  FROM public.medical_sources
  WHERE url = 'https://www.nhs.uk/symptoms/shortness-of-breath/'
  LIMIT 1;

  IF nhs_sob_id IS NULL THEN
    INSERT INTO public.medical_sources (
      title, organization, url, source_type, is_active, language, country,
      organization_type, evidence_level, last_checked_at, last_verified_at,
      expires_review_at, notes
    )
    VALUES (
      'Shortness of breath',
      'NHS',
      'https://www.nhs.uk/symptoms/shortness-of-breath/',
      'government',
      true,
      'en',
      'GB',
      'government_health_service',
      'patient_emergency_guidance',
      '2026-10-02T00:00:00Z',
      '2026-10-02T00:00:00Z',
      '2027-10-02',
      'Emergency-routing source for severe breathing difficulty such as gasping/choking/inability to get words out and associated danger signs. Routing is symptom-led, not rate-led.'
    )
    RETURNING id INTO nhs_sob_id;
  END IF;

  SELECT id INTO rcp_news2_id
  FROM public.medical_sources
  WHERE url = 'https://www.rcp.ac.uk/resources/national-early-warning-score-news-2/'
  LIMIT 1;

  IF rcp_news2_id IS NULL THEN
    INSERT INTO public.medical_sources (
      title, organization, url, publication_date, source_type, is_active,
      language, country, organization_type, evidence_level, published_at,
      last_checked_at, last_verified_at, expires_review_at, notes
    )
    VALUES (
      'National Early Warning Score (NEWS) 2',
      'Royal College of Physicians',
      'https://www.rcp.ac.uk/resources/national-early-warning-score-news-2/',
      '2017-12-19',
      'clinical_guideline',
      true,
      'en',
      'GB',
      'professional_association',
      'validated_acute_care_score',
      '2017-12-19',
      '2026-10-02T00:00:00Z',
      '2026-10-02T00:00:00Z',
      '2027-10-02',
      'Registered only as an acute-care reference. NEWS2 is not converted into a generic consumer respiratory-rate rule in this pack.'
    )
    RETURNING id INTO rcp_news2_id;
  END IF;

  INSERT INTO public.measurement_sources (
    measurement_type_id, source_id, use_scope, last_verified_at, notes
  )
  VALUES
    (
      rr_id, hee_rr_id, 'capture_guidance', '2026-10-02T00:00:00Z',
      'Full-minute resting count, rhythm/depth/distress documentation, observer awareness considerations.'
    ),
    (
      rr_id, hee_rr_id, 'reference_range', '2026-10-02T00:00:00Z',
      'Draft common adult resting 12-16 breaths/min reference.'
    ),
    (
      rr_id, nhs_sob_id, 'safety_threshold', '2026-10-02T00:00:00Z',
      'Symptom-led severe-breathing-difficulty emergency routing.'
    ),
    (
      rr_id, rcp_news2_id, 'reference_range', '2026-10-02T00:00:00Z',
      'Acute-care context reference only; no universal NEWS2 threshold rule is activated.'
    )
  ON CONFLICT (measurement_type_id, source_id, use_scope) DO UPDATE SET
    last_verified_at = EXCLUDED.last_verified_at,
    notes = EXCLUDED.notes;

  UPDATE public.measurement_types
  SET
    canonical_unit = 'breaths/min',
    allowed_units = ARRAY['breaths/min'],
    capture_context_schema = '{
      "age_years":{"type":"number","required":true},
      "pregnant":{"type":"boolean","required":true},
      "rest_state":{"type":"string","required":true,"allowed":["resting","post_exercise","exercise","sleep","unknown"]},
      "relaxed":{"type":"boolean"},
      "count_duration_seconds":{"type":"number"},
      "patient_aware_of_count":{"type":"boolean"},
      "rhythm_regular":{"type":"boolean"},
      "depth":{"type":"string","allowed":["shallow","normal","deep"]},
      "respiratory_distress_present":{"type":"boolean"},
      "severe_breathing_difficulty":{"type":"boolean"},
      "emergency_respiratory_symptoms_present":{"type":"boolean"},
      "supplemental_oxygen":{"type":"boolean"},
      "known_chronic_respiratory_condition":{"type":"boolean"}
    }'::jsonb,
    description_ar = 'قياس معدل التنفس مع توثيق الراحة، مدة العد، انتظام وعمق التنفس ووجود ضيق تنفس. الرقم وحده لا يحدد حالة طوارئ.',
    updated_at = now()
  WHERE id = rr_id;

  INSERT INTO public.measurement_reference_rules (
    measurement_type_id, code, label_ar, label_en, interpretation_code,
    predicate, care_level, source_id, review_status, is_active, is_demo,
    priority, version, change_reason
  )
  VALUES
    (
      rr_id,
      'nhs_adult_nonpregnant_resting_rr_12_16',
      'مسودة: معدل تنفس راحة شائع 12-16 نفس/دقيقة',
      'Draft: common adult resting respiratory rate 12-16 breaths/min',
      'resting_reference_12_16',
      '{"all":[
        {"path":"context.age_years","operator":"gte","value":18},
        {"path":"context.pregnant","operator":"eq","value":false},
        {"path":"context.rest_state","operator":"eq","value":"resting"},
        {"path":"value","operator":"gte","value":12},
        {"path":"value","operator":"lte","value":16}
      ]}'::jsonb,
      NULL,
      hee_rr_id,
      'draft',
      false,
      false,
      30,
      1,
      'Common resting adult reference only. It is not a diagnosis and does not apply to exercise, sleep, pregnancy, pediatrics or acute-care scoring.'
    ),
    (
      rr_id,
      'nhs_adult_nonpregnant_resting_rr_below_12',
      'مسودة: معدل تنفس راحة أقل من النطاق المرجعي الشائع',
      'Draft: resting respiratory rate below common reference',
      'resting_below_reference',
      '{"all":[
        {"path":"context.age_years","operator":"gte","value":18},
        {"path":"context.pregnant","operator":"eq","value":false},
        {"path":"context.rest_state","operator":"eq","value":"resting"},
        {"path":"value","operator":"lt","value":12}
      ]}'::jsonb,
      NULL,
      hee_rr_id,
      'draft',
      false,
      false,
      20,
      1,
      'Outside-reference draft only; no care level is assigned from the number alone.'
    ),
    (
      rr_id,
      'nhs_adult_nonpregnant_resting_rr_over_16',
      'مسودة: معدل تنفس راحة أعلى من النطاق المرجعي الشائع',
      'Draft: resting respiratory rate above common reference',
      'resting_above_reference',
      '{"all":[
        {"path":"context.age_years","operator":"gte","value":18},
        {"path":"context.pregnant","operator":"eq","value":false},
        {"path":"context.rest_state","operator":"eq","value":"resting"},
        {"path":"value","operator":"gt","value":16}
      ]}'::jsonb,
      NULL,
      hee_rr_id,
      'draft',
      false,
      false,
      20,
      1,
      'Outside-reference draft only; no care level is assigned from the number alone.'
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
    rr_id,
    'nhs_severe_breathing_difficulty_emergency',
    'مسودة: صعوبة تنفس شديدة مع علامات إنذار',
    'Draft: severe breathing difficulty with emergency warning signs',
    '{"all":[
      {"path":"context.age_years","operator":"gte","value":18},
      {"path":"context.pregnant","operator":"eq","value":false},
      {"path":"context.severe_breathing_difficulty","operator":"eq","value":true},
      {"path":"context.emergency_respiratory_symptoms_present","operator":"eq","value":true}
    ]}'::jsonb,
    'emergency',
    nhs_sob_id,
    'draft',
    false,
    false,
    1,
    1,
    'NHS symptom-led emergency-routing draft. Numeric respiratory rate is intentionally not required.'
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
