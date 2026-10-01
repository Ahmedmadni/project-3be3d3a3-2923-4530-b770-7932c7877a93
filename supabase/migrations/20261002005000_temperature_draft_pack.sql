-- Temperature source-backed draft pack.
-- Celsius/Fahrenheit unit conversion is permitted.
-- Conversion between anatomical measurement sites/routes is deliberately prohibited.
-- All clinical interpretation rules remain Draft + Inactive.

DO $$
DECLARE
  temp_id uuid;
  nhs_fever_id uuid;
  nhs_hypothermia_id uuid;
  cdc_route_id uuid;
BEGIN
  SELECT id INTO temp_id
  FROM public.measurement_types
  WHERE code = 'temperature';

  IF temp_id IS NULL THEN
    RAISE EXCEPTION 'MEASUREMENT_FOUNDATION_REQUIRED: temperature type is missing';
  END IF;

  SELECT id INTO nhs_fever_id
  FROM public.medical_sources
  WHERE url = 'https://www.nhs.uk/symptoms/fever-in-adults/'
  LIMIT 1;

  IF nhs_fever_id IS NULL THEN
    INSERT INTO public.medical_sources (
      title, organization, url, source_type, is_active, language, country,
      organization_type, evidence_level, last_checked_at, last_verified_at,
      expires_review_at, notes
    )
    VALUES (
      'High temperature (fever) in adults',
      'NHS',
      'https://www.nhs.uk/symptoms/fever-in-adults/',
      'government',
      true,
      'en',
      'GB',
      'government_health_service',
      'patient_guidance',
      '2026-10-02T00:00:00Z',
      '2026-10-02T00:00:00Z',
      '2027-10-02',
      'Adult fever source. NHS states a high temperature is usually 38C or above and describes oral, axillary and tympanic measurement.'
    )
    RETURNING id INTO nhs_fever_id;
  END IF;

  SELECT id INTO nhs_hypothermia_id
  FROM public.medical_sources
  WHERE url = 'https://www.nhs.uk/conditions/hypothermia/'
  LIMIT 1;

  IF nhs_hypothermia_id IS NULL THEN
    INSERT INTO public.medical_sources (
      title, organization, url, publication_date, source_type, is_active,
      language, country, organization_type, evidence_level, published_at,
      last_checked_at, last_verified_at, expires_review_at, notes
    )
    VALUES (
      'Hypothermia',
      'NHS',
      'https://www.nhs.uk/conditions/hypothermia/',
      '2023-06-09',
      'government',
      true,
      'en',
      'GB',
      'government_health_service',
      'patient_emergency_guidance',
      '2023-06-09',
      '2026-10-02T00:00:00Z',
      '2026-10-02T00:00:00Z',
      '2027-10-02',
      'NHS describes hypothermia as a dangerous body-temperature drop below 35C and a medical emergency.'
    )
    RETURNING id INTO nhs_hypothermia_id;
  END IF;

  SELECT id INTO cdc_route_id
  FROM public.medical_sources
  WHERE url = 'https://www.cdc.gov/nhsn/faqs/faqs-miscellaneous.html'
  LIMIT 1;

  IF cdc_route_id IS NULL THEN
    INSERT INTO public.medical_sources (
      title, organization, url, source_type, is_active, language, country,
      organization_type, evidence_level, last_checked_at, last_verified_at,
      expires_review_at, notes
    )
    VALUES (
      'NHSN FAQs: Temperature measurement',
      'Centers for Disease Control and Prevention',
      'https://www.cdc.gov/nhsn/faqs/faqs-miscellaneous.html',
      'government',
      true,
      'en',
      'US',
      'government',
      'surveillance_methodology',
      '2026-10-02T00:00:00Z',
      '2026-10-02T00:00:00Z',
      '2027-10-02',
      'CDC/NHSN states there are no research-based guidelines for converting temperature by route; route/site conversion is therefore prohibited in the app.'
    )
    RETURNING id INTO cdc_route_id;
  END IF;

  INSERT INTO public.measurement_sources (
    measurement_type_id, source_id, use_scope, last_verified_at, notes
  )
  VALUES
    (
      temp_id, nhs_fever_id, 'reference_range', '2026-10-02T00:00:00Z',
      'Adult high-temperature draft threshold and supported measurement routes.'
    ),
    (
      temp_id, nhs_fever_id, 'capture_guidance', '2026-10-02T00:00:00Z',
      'Adult digital thermometer oral/axillary/ear capture guidance.'
    ),
    (
      temp_id, nhs_hypothermia_id, 'safety_threshold', '2026-10-02T00:00:00Z',
      'Draft hypothermia emergency threshold.'
    ),
    (
      temp_id, cdc_route_id, 'capture_guidance', '2026-10-02T00:00:00Z',
      'Do not convert temperature values between anatomical measurement routes.'
    )
  ON CONFLICT (measurement_type_id, source_id, use_scope) DO UPDATE SET
    last_verified_at = EXCLUDED.last_verified_at,
    notes = EXCLUDED.notes;

  UPDATE public.measurement_types
  SET
    canonical_unit = '°C',
    allowed_units = ARRAY['°C','°F'],
    capture_context_schema = '{
      "age_years":{"type":"number","required":true},
      "pregnant":{"type":"boolean","required":true},
      "measurement_site":{"type":"string","required":true,"allowed":["oral","axillary","tympanic","temporal","rectal","other"]},
      "previous_measurement_site":{"type":"string"},
      "device_type":{"type":"string"},
      "device_supported":{"type":"boolean"},
      "recent_food_or_drink":{"type":"boolean"},
      "ear_technique_confirmed":{"type":"boolean"},
      "skin_contact_confirmed":{"type":"boolean"},
      "symptoms_present":{"type":"boolean"}
    }'::jsonb,
    description_ar = 'قياس درجة حرارة الجسم مع حفظ موضع القياس ونوع الجهاز. يسمح بتحويل الوحدة بين مئوي وفهرنهايت فقط، ولا يتم تحويل القراءة بين مواضع القياس المختلفة.',
    updated_at = now()
  WHERE id = temp_id;

  INSERT INTO public.measurement_reference_rules (
    measurement_type_id, code, label_ar, label_en, interpretation_code,
    predicate, care_level, source_id, review_status, is_active, is_demo,
    priority, version, change_reason
  )
  VALUES (
    temp_id,
    'nhs_adult_nonpregnant_high_temperature_38',
    'مسودة: حرارة مرتفعة لدى بالغ غير حامل',
    'Draft: high temperature in nonpregnant adult',
    'high_temperature',
    '{"all":[
      {"path":"context.age_years","operator":"gte","value":18},
      {"path":"context.pregnant","operator":"eq","value":false},
      {"path":"context.measurement_site","operator":"in","value":["oral","axillary","tympanic"]},
      {"path":"value","operator":"gte","value":38}
    ]}'::jsonb,
    NULL,
    nhs_fever_id,
    'draft',
    false,
    false,
    20,
    1,
    'Source-backed adult fever draft. Requires medical review before activation; no route-based temperature conversion is allowed.'
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
    temp_id,
    'nhs_adult_nonpregnant_hypothermia_below_35',
    'مسودة: انخفاض حرارة الجسم إلى أقل من 35 مئوية',
    'Draft: body temperature below 35C',
    '{"all":[
      {"path":"context.age_years","operator":"gte","value":18},
      {"path":"context.pregnant","operator":"eq","value":false},
      {"path":"context.measurement_site","operator":"in","value":["oral","axillary","tympanic"]},
      {"path":"value","operator":"lt","value":35}
    ]}'::jsonb,
    'emergency',
    nhs_hypothermia_id,
    'draft',
    false,
    false,
    1,
    1,
    'NHS hypothermia emergency draft. Requires medical review before activation and remains separate from symptom-based emergency rules.'
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
