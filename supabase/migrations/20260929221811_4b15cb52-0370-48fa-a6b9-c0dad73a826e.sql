ALTER TABLE public.condition_symptoms ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.question_rules ADD COLUMN IF NOT EXISTS confirms_symptom_id uuid REFERENCES public.symptoms(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.external_source_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  provider text NOT NULL,
  source_kind text NOT NULL,
  trust_tier text NOT NULL,
  base_url text NOT NULL,
  repository_url text,
  integration_mode text NOT NULL,
  license_model text,
  license_notes text,
  requires_credentials boolean NOT NULL DEFAULT false,
  may_supply_clinical_content boolean NOT NULL DEFAULT false,
  may_supply_terminology boolean NOT NULL DEFAULT false,
  may_supply_population_data boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  last_verified_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.external_source_registry TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.external_source_registry TO authenticated;
GRANT ALL ON public.external_source_registry TO service_role;
ALTER TABLE public.external_source_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "external registry public read" ON public.external_source_registry FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "external registry admin write" ON public.external_source_registry FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.terminology_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  source_registry_id uuid NOT NULL REFERENCES public.external_source_registry(id) ON DELETE RESTRICT,
  terminology_system text NOT NULL,
  external_code text NOT NULL,
  external_uri text,
  preferred_term text,
  semantic_type text,
  mapping_status text NOT NULL DEFAULT 'draft',
  mapping_method text NOT NULL DEFAULT 'manual',
  reviewed_by uuid,
  reviewed_at timestamptz,
  last_verified_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id, terminology_system, external_code)
);
GRANT SELECT ON public.terminology_mappings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.terminology_mappings TO authenticated;
GRANT ALL ON public.terminology_mappings TO service_role;
ALTER TABLE public.terminology_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "terminology mappings public approved read" ON public.terminology_mappings FOR SELECT TO anon, authenticated USING (mapping_status = 'approved');
CREATE POLICY "terminology mappings reviewer write" ON public.terminology_mappings FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['medical_reviewer','admin','super_admin']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['medical_reviewer','admin','super_admin']));

CREATE TABLE IF NOT EXISTS public.clinical_engine_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  source_registry_id uuid NOT NULL REFERENCES public.external_source_registry(id) ON DELETE RESTRICT,
  mode text NOT NULL DEFAULT 'disabled',
  endpoint_base text,
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  send_identifiable_health_data boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT false,
  notes text,
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_engine_integrations TO authenticated;
GRANT ALL ON public.clinical_engine_integrations TO service_role;
ALTER TABLE public.clinical_engine_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinical integrations admin read" ON public.clinical_engine_integrations FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['medical_reviewer','admin','super_admin']));
CREATE POLICY "clinical integrations admin write" ON public.clinical_engine_integrations FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']));