-- Health Measurements Foundation
-- Architecture only: this migration intentionally publishes NO clinical thresholds.
-- New measurement content follows Source -> Draft -> Medical Review -> Publish.

CREATE TABLE IF NOT EXISTS public.measurement_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text,
  description_ar text,
  value_kind text NOT NULL CHECK (value_kind IN ('scalar','compound')),
  canonical_unit text,
  allowed_units text[] NOT NULL DEFAULT '{}'::text[],
  component_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  capture_context_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
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
  CONSTRAINT measurement_type_scalar_unit_ck CHECK (
    value_kind <> 'scalar' OR canonical_unit IS NOT NULL
  ),
  CONSTRAINT measurement_component_schema_ck CHECK (
    jsonb_typeof(component_schema) = 'array'
  ),
  CONSTRAINT measurement_context_schema_ck CHECK (
    jsonb_typeof(capture_context_schema) = 'object'
  )
);

CREATE TABLE IF NOT EXISTS public.measurement_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_type_id uuid NOT NULL REFERENCES public.measurement_types(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.medical_sources(id) ON DELETE RESTRICT,
  use_scope text NOT NULL CHECK (use_scope IN (
    'capture_guidance','reference_range','safety_threshold','terminology'
  )),
  last_verified_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (measurement_type_id, source_id, use_scope)
);

CREATE TABLE IF NOT EXISTS public.measurement_reference_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_type_id uuid NOT NULL REFERENCES public.measurement_types(id) ON DELETE CASCADE,
  code text NOT NULL,
  label_ar text NOT NULL,
  label_en text,
  interpretation_code text NOT NULL,
  predicate jsonb NOT NULL,
  care_level public.care_level,
  source_id uuid NOT NULL REFERENCES public.medical_sources(id) ON DELETE RESTRICT,
  review_status public.review_status NOT NULL DEFAULT 'draft',
  is_active boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 100,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at timestamptz,
  review_note text,
  change_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (measurement_type_id, code, version),
  CONSTRAINT measurement_reference_predicate_ck CHECK (
    jsonb_typeof(predicate) = 'object' AND predicate <> '{}'::jsonb
  )
);

CREATE TABLE IF NOT EXISTS public.measurement_red_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_type_id uuid NOT NULL REFERENCES public.measurement_types(id) ON DELETE CASCADE,
  code text NOT NULL,
  title_ar text NOT NULL,
  title_en text,
  predicate jsonb NOT NULL,
  care_level public.care_level NOT NULL,
  source_id uuid NOT NULL REFERENCES public.medical_sources(id) ON DELETE RESTRICT,
  review_status public.review_status NOT NULL DEFAULT 'draft',
  is_active boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 10,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at timestamptz,
  review_note text,
  change_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (measurement_type_id, code, version),
  CONSTRAINT measurement_red_flag_predicate_ck CHECK (
    jsonb_typeof(predicate) = 'object' AND predicate <> '{}'::jsonb
  )
);

CREATE TABLE IF NOT EXISTS public.measurement_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measurement_type_id uuid NOT NULL REFERENCES public.measurement_types(id) ON DELETE RESTRICT,
  measured_at timestamptz NOT NULL,
  scalar_value numeric,
  unit text,
  components jsonb,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  quality text NOT NULL DEFAULT 'unknown' CHECK (quality IN ('unknown','good','questionable')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT measurement_reading_value_ck CHECK (
    num_nonnulls(scalar_value, components) = 1
  ),
  CONSTRAINT measurement_reading_components_ck CHECK (
    components IS NULL OR jsonb_typeof(components) = 'object'
  ),
  CONSTRAINT measurement_reading_context_ck CHECK (
    jsonb_typeof(context) = 'object'
  )
);

CREATE INDEX IF NOT EXISTS measurement_readings_user_time_idx
  ON public.measurement_readings (user_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS measurement_readings_type_time_idx
  ON public.measurement_readings (measurement_type_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS measurement_reference_rules_type_idx
  ON public.measurement_reference_rules (measurement_type_id, is_active, review_status);
CREATE INDEX IF NOT EXISTS measurement_red_flags_type_idx
  ON public.measurement_red_flags (measurement_type_id, is_active, review_status);

ALTER TABLE public.measurement_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_reference_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_red_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_readings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "measurement types public published read" ON public.measurement_types;
CREATE POLICY "measurement types public published read"
ON public.measurement_types FOR SELECT TO anon, authenticated
USING (review_status = 'published' AND is_active = true AND is_demo = false);

DROP POLICY IF EXISTS "measurement types staff read" ON public.measurement_types;
CREATE POLICY "measurement types staff read"
ON public.measurement_types FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['content_editor','medical_reviewer','admin','super_admin']));

DROP POLICY IF EXISTS "measurement types staff write" ON public.measurement_types;
CREATE POLICY "measurement types staff write"
ON public.measurement_types FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['content_editor','medical_reviewer','admin','super_admin']))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['content_editor','medical_reviewer','admin','super_admin']));

DROP POLICY IF EXISTS "measurement sources public read" ON public.measurement_sources;
CREATE POLICY "measurement sources public read"
ON public.measurement_sources FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.measurement_types mt
    WHERE mt.id = measurement_type_id
      AND mt.review_status = 'published'
      AND mt.is_active = true
      AND mt.is_demo = false
  )
);

DROP POLICY IF EXISTS "measurement sources staff manage" ON public.measurement_sources;
CREATE POLICY "measurement sources staff manage"
ON public.measurement_sources FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['content_editor','medical_reviewer','admin','super_admin']))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['content_editor','medical_reviewer','admin','super_admin']));

DROP POLICY IF EXISTS "measurement reference public read" ON public.measurement_reference_rules;
CREATE POLICY "measurement reference public read"
ON public.measurement_reference_rules FOR SELECT TO anon, authenticated
USING (review_status = 'published' AND is_active = true AND is_demo = false);

DROP POLICY IF EXISTS "measurement reference staff manage" ON public.measurement_reference_rules;
CREATE POLICY "measurement reference staff manage"
ON public.measurement_reference_rules FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['content_editor','medical_reviewer','admin','super_admin']))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['content_editor','medical_reviewer','admin','super_admin']));

DROP POLICY IF EXISTS "measurement red flags public read" ON public.measurement_red_flags;
CREATE POLICY "measurement red flags public read"
ON public.measurement_red_flags FOR SELECT TO anon, authenticated
USING (review_status = 'published' AND is_active = true AND is_demo = false);

DROP POLICY IF EXISTS "measurement red flags staff manage" ON public.measurement_red_flags;
CREATE POLICY "measurement red flags staff manage"
ON public.measurement_red_flags FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['content_editor','medical_reviewer','admin','super_admin']))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['content_editor','medical_reviewer','admin','super_admin']));

DROP POLICY IF EXISTS "users read own measurements" ON public.measurement_readings;
CREATE POLICY "users read own measurements"
ON public.measurement_readings FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users insert own measurements" ON public.measurement_readings;
CREATE POLICY "users insert own measurements"
ON public.measurement_readings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users update own measurements" ON public.measurement_readings;
CREATE POLICY "users update own measurements"
ON public.measurement_readings FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users delete own measurements" ON public.measurement_readings;
CREATE POLICY "users delete own measurements"
ON public.measurement_readings FOR DELETE TO authenticated
USING (auth.uid() = user_id);

GRANT SELECT ON public.measurement_types, public.measurement_sources,
  public.measurement_reference_rules, public.measurement_red_flags TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.measurement_types, public.measurement_sources,
  public.measurement_reference_rules, public.measurement_red_flags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.measurement_readings TO authenticated;
GRANT ALL ON public.measurement_types, public.measurement_sources,
  public.measurement_reference_rules, public.measurement_red_flags,
  public.measurement_readings TO service_role;

CREATE OR REPLACE FUNCTION public.guard_measurement_clinical_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_ok boolean := true;
  source_ok boolean := true;
  has_type_source boolean := true;
BEGIN
  IF TG_TABLE_NAME = 'measurement_types' THEN
    IF NEW.review_status = 'published' THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.measurement_sources ms
        JOIN public.medical_sources src ON src.id = ms.source_id
        WHERE ms.measurement_type_id = NEW.id
          AND src.is_active = true
      ) INTO has_type_source;

      IF NOT has_type_source THEN
        RAISE EXCEPTION
          'MEASUREMENT_SOURCE_REQUIRED: measurement type requires an active medical source before publication';
      END IF;
    END IF;

    IF NEW.is_active = true
       AND (NEW.review_status <> 'published' OR NEW.is_demo = true) THEN
      RAISE EXCEPTION
        'MEASUREMENT_TYPE_NOT_RELEASE_READY: only non-demo published measurement types may be active';
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.is_active = false THEN
    RETURN NEW;
  END IF;

  IF NEW.review_status <> 'published' OR NEW.is_demo = true THEN
    RAISE EXCEPTION
      'MEASUREMENT_RULE_NOT_RELEASE_READY: active clinical measurement rules must be published and non-demo';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.measurement_types mt
    WHERE mt.id = NEW.measurement_type_id
      AND mt.review_status = 'published'
      AND mt.is_active = true
      AND mt.is_demo = false
  ) INTO parent_ok;

  IF NOT parent_ok THEN
    RAISE EXCEPTION
      'MEASUREMENT_TYPE_NOT_RELEASE_READY: parent measurement type must be published and active';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.medical_sources src
    WHERE src.id = NEW.source_id
      AND src.is_active = true
  ) INTO source_ok;

  IF NOT source_ok THEN
    RAISE EXCEPTION
      'MEASUREMENT_RULE_SOURCE_REQUIRED: active rule requires an active medical source';
  END IF;

  RETURN NEW;
END
$$;

REVOKE EXECUTE ON FUNCTION public.guard_measurement_clinical_activation()
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_measurement_clinical_activation()
  TO service_role;

DROP TRIGGER IF EXISTS measurement_type_activation_guard ON public.measurement_types;
CREATE TRIGGER measurement_type_activation_guard
BEFORE INSERT OR UPDATE ON public.measurement_types
FOR EACH ROW EXECUTE FUNCTION public.guard_measurement_clinical_activation();

DROP TRIGGER IF EXISTS measurement_reference_activation_guard ON public.measurement_reference_rules;
CREATE TRIGGER measurement_reference_activation_guard
BEFORE INSERT OR UPDATE ON public.measurement_reference_rules
FOR EACH ROW EXECUTE FUNCTION public.guard_measurement_clinical_activation();

DROP TRIGGER IF EXISTS measurement_red_flag_activation_guard ON public.measurement_red_flags;
CREATE TRIGGER measurement_red_flag_activation_guard
BEFORE INSERT OR UPDATE ON public.measurement_red_flags
FOR EACH ROW EXECUTE FUNCTION public.guard_measurement_clinical_activation();

-- Catalog foundation only. All entries start Draft + Inactive and contain no
-- reference ranges, warning limits, diagnostic cutoffs, or emergency thresholds.
INSERT INTO public.measurement_types (
  code, name_ar, name_en, description_ar, value_kind,
  canonical_unit, allowed_units, component_schema, capture_context_schema,
  review_status, is_active, is_demo
)
VALUES
  (
    'blood_pressure', 'ضغط الدم', 'Blood pressure',
    'تعريف بنيوي لالتقاط القراءة فقط؛ لا توجد حدود تفسيرية منشورة.',
    'compound', NULL, '{}'::text[],
    '[{"code":"systolic","label_ar":"الانقباضي","label_en":"Systolic","unit":"mmHg","required":true},{"code":"diastolic","label_ar":"الانبساطي","label_en":"Diastolic","unit":"mmHg","required":true}]'::jsonb,
    '{"position":{"type":"string"},"rest_state":{"type":"string"}}'::jsonb,
    'draft', false, false
  ),
  (
    'oxygen_saturation', 'تشبع الأكسجين', 'Oxygen saturation',
    'تعريف بنيوي لالتقاط القراءة فقط؛ لا توجد حدود تفسيرية منشورة.',
    'scalar', '%', ARRAY['%']::text[], '[]'::jsonb,
    '{"rest_state":{"type":"string"},"device_note":{"type":"string"}}'::jsonb,
    'draft', false, false
  ),
  (
    'temperature', 'درجة الحرارة', 'Body temperature',
    'تعريف بنيوي لالتقاط القراءة فقط؛ لا توجد حدود تفسيرية منشورة.',
    'scalar', '°C', ARRAY['°C','°F']::text[], '[]'::jsonb,
    '{"measurement_site":{"type":"string"}}'::jsonb,
    'draft', false, false
  ),
  (
    'pulse', 'معدل النبض', 'Pulse rate',
    'تعريف بنيوي لالتقاط القراءة فقط؛ لا توجد حدود تفسيرية منشورة.',
    'scalar', 'bpm', ARRAY['bpm']::text[], '[]'::jsonb,
    '{"rest_state":{"type":"string"}}'::jsonb,
    'draft', false, false
  ),
  (
    'blood_glucose', 'سكر الدم', 'Blood glucose',
    'تعريف بنيوي لالتقاط القراءة فقط؛ التفسير يتطلب سياق التوقيت ولم تتم إضافة أي حدود.',
    'scalar', 'mg/dL', ARRAY['mg/dL','mmol/L']::text[], '[]'::jsonb,
    '{"timing":{"type":"string"},"minutes_since_meal":{"type":"number"}}'::jsonb,
    'draft', false, false
  ),
  (
    'weight', 'الوزن', 'Weight',
    'تعريف بنيوي لالتقاط القياس فقط.',
    'scalar', 'kg', ARRAY['kg']::text[], '[]'::jsonb, '{}'::jsonb,
    'draft', false, false
  ),
  (
    'height', 'الطول', 'Height',
    'تعريف بنيوي لالتقاط القياس فقط.',
    'scalar', 'cm', ARRAY['cm']::text[], '[]'::jsonb, '{}'::jsonb,
    'draft', false, false
  ),
  (
    'bmi', 'مؤشر كتلة الجسم', 'Body mass index',
    'تعريف بنيوي فقط؛ لا توجد تصنيفات أو حدود تفسيرية منشورة.',
    'scalar', 'kg/m²', ARRAY['kg/m²']::text[], '[]'::jsonb, '{}'::jsonb,
    'draft', false, false
  ),
  (
    'respiratory_rate', 'معدل التنفس', 'Respiratory rate',
    'تعريف بنيوي لالتقاط القياس فقط؛ لا توجد حدود تفسيرية منشورة.',
    'scalar', 'breaths/min', ARRAY['breaths/min']::text[], '[]'::jsonb,
    '{"rest_state":{"type":"string"}}'::jsonb,
    'draft', false, false
  )
ON CONFLICT (code) DO NOTHING;

COMMENT ON TABLE public.measurement_reference_rules
IS 'Source-backed interpretation rules. Foundation contains no clinical thresholds; rules must complete the review workflow before activation.';

COMMENT ON TABLE public.measurement_red_flags
IS 'Source-backed measurement safety rules. Foundation contains no clinical thresholds; production visibility requires Published + Active + non-demo.';

COMMENT ON TABLE public.measurement_readings
IS 'User-owned health measurement readings protected by row-level security.';
