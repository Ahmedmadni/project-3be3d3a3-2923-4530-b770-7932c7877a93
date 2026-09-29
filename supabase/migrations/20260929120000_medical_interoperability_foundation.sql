-- Medical interoperability and external-source governance foundation.
-- This migration does NOT import or publish clinical knowledge from external systems.
-- It creates traceability and policy controls only.

CREATE TABLE IF NOT EXISTS public.external_source_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  provider text NOT NULL,
  source_kind text NOT NULL CHECK (source_kind IN (
    'terminology',
    'clinical_engine',
    'population_data',
    'standards_repository',
    'community_repository'
  )),
  trust_tier text NOT NULL CHECK (trust_tier IN (
    'authoritative',
    'established_organization',
    'commercial_vendor',
    'community_reference',
    'blocked'
  )),
  base_url text NOT NULL,
  repository_url text,
  integration_mode text NOT NULL CHECK (integration_mode IN (
    'terminology_mapping',
    'shadow_compare',
    'population_context',
    'reference_only',
    'blocked'
  )),
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

ALTER TABLE public.external_source_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "external registry public read" ON public.external_source_registry;
CREATE POLICY "external registry public read"
ON public.external_source_registry
FOR SELECT TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "external registry admin write" ON public.external_source_registry;
CREATE POLICY "external registry admin write"
ON public.external_source_registry
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.external_source_registry TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.external_source_registry TO authenticated;
GRANT ALL ON public.external_source_registry TO service_role;

CREATE TABLE IF NOT EXISTS public.terminology_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('symptom','condition','question','first_aid_topic')),
  entity_id uuid NOT NULL,
  source_registry_id uuid NOT NULL REFERENCES public.external_source_registry(id) ON DELETE RESTRICT,
  terminology_system text NOT NULL,
  external_code text NOT NULL,
  external_uri text,
  preferred_term text,
  semantic_type text,
  mapping_status text NOT NULL DEFAULT 'draft' CHECK (mapping_status IN (
    'draft','reviewed','approved','rejected'
  )),
  mapping_method text NOT NULL DEFAULT 'manual' CHECK (mapping_method IN (
    'manual','api_search','import'
  )),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  last_verified_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id, terminology_system, external_code)
);

ALTER TABLE public.terminology_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "terminology mappings public approved read" ON public.terminology_mappings;
CREATE POLICY "terminology mappings public approved read"
ON public.terminology_mappings
FOR SELECT TO anon, authenticated
USING (mapping_status = 'approved');

DROP POLICY IF EXISTS "terminology mappings reviewer write" ON public.terminology_mappings;
CREATE POLICY "terminology mappings reviewer write"
ON public.terminology_mappings
FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['medical_reviewer','admin','super_admin']))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['medical_reviewer','admin','super_admin']));

GRANT SELECT ON public.terminology_mappings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.terminology_mappings TO authenticated;
GRANT ALL ON public.terminology_mappings TO service_role;

CREATE TABLE IF NOT EXISTS public.clinical_engine_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  source_registry_id uuid NOT NULL REFERENCES public.external_source_registry(id) ON DELETE RESTRICT,
  mode text NOT NULL DEFAULT 'disabled' CHECK (mode IN ('disabled','shadow_compare')),
  endpoint_base text,
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  send_identifiable_health_data boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT false,
  notes text,
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinical_engine_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinical integrations admin read" ON public.clinical_engine_integrations;
CREATE POLICY "clinical integrations admin read"
ON public.clinical_engine_integrations
FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['medical_reviewer','admin','super_admin']));

DROP POLICY IF EXISTS "clinical integrations admin write" ON public.clinical_engine_integrations;
CREATE POLICY "clinical integrations admin write"
ON public.clinical_engine_integrations
FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_engine_integrations TO authenticated;
GRANT ALL ON public.clinical_engine_integrations TO service_role;

-- Authoritative / established sources only. Community symptom-checker repositories
-- are intentionally NOT registered as clinical knowledge sources.
INSERT INTO public.external_source_registry (
  source_key, display_name, provider, source_kind, trust_tier, base_url,
  repository_url, integration_mode, license_model, license_notes,
  requires_credentials, may_supply_clinical_content, may_supply_terminology,
  may_supply_population_data, last_verified_at, notes
)
VALUES
  (
    'nlm_umls',
    'UMLS Terminology Services',
    'U.S. National Library of Medicine',
    'terminology',
    'authoritative',
    'https://uts-ws.nlm.nih.gov/rest',
    NULL,
    'terminology_mapping',
    'UMLS Metathesaurus License',
    'Requires an individual UTS/UMLS license and API key. Source vocabularies inside UMLS may have additional terms and redistribution restrictions.',
    true, false, true, false,
    '2026-09-29T14:00:00Z'::timestamptz,
    'Use only for terminology normalization/mapping. Do not treat UMLS mappings as diagnostic evidence.'
  ),
  (
    'who_data_hub',
    'WHO World Health Data Hub',
    'World Health Organization',
    'population_data',
    'authoritative',
    'https://data.who.int/',
    NULL,
    'population_context',
    'WHO data terms apply',
    'Use population statistics for health-library context only, never as patient-level diagnostic evidence.',
    false, false, false, true,
    '2026-09-29T14:00:00Z'::timestamptz,
    'The legacy GHO/Athena interfaces are retired/deprecated; prefer the World Health Data Hub/current OData implementation.'
  ),
  (
    'infermedica',
    'Infermedica Engine API',
    'Infermedica',
    'clinical_engine',
    'commercial_vendor',
    'https://api.infermedica.com/v3',
    NULL,
    'shadow_compare',
    'Commercial API terms',
    'Commercial service requiring App-Id/App-Key. Never send identifiable health data by default.',
    true, false, false, false,
    '2026-09-29T14:00:00Z'::timestamptz,
    'Allowed only for optional shadow comparison / QA after explicit configuration. It must never replace the local deterministic red-flag engine.'
  ),
  (
    'hl7_fhir_github',
    'HL7 FHIR Specification Repository',
    'Health Level Seven International (HL7)',
    'standards_repository',
    'authoritative',
    'https://hl7.org/fhir/',
    'https://github.com/HL7/fhir',
    'reference_only',
    'Repository/specification license terms apply',
    'Official HL7 organization repository. Use for interoperability patterns and data structures, not clinical diagnosis content.',
    false, false, true, false,
    '2026-09-29T14:00:00Z'::timestamptz,
    'Trusted GitHub source because it is the official HL7 organization repository.'
  ),
  (
    'openmrs_core_github',
    'OpenMRS Core',
    'OpenMRS',
    'standards_repository',
    'established_organization',
    'https://openmrs.org/',
    'https://github.com/openmrs/openmrs-core',
    'reference_only',
    'Repository license terms apply',
    'Use architecture/interoperability ideas only. Do not import patient-level or diagnostic rules from example data.',
    false, false, false, false,
    '2026-09-29T14:00:00Z'::timestamptz,
    'Trusted GitHub source because it is the official OpenMRS organization repository.'
  ),
  (
    'ohdsi_cdm_github',
    'OHDSI Common Data Model',
    'OHDSI',
    'standards_repository',
    'established_organization',
    'https://www.ohdsi.org/',
    'https://github.com/OHDSI/CommonDataModel',
    'reference_only',
    'Repository license terms apply',
    'Use data-model / vocabulary interoperability patterns only, not direct clinical decision rules.',
    false, false, true, false,
    '2026-09-29T14:00:00Z'::timestamptz,
    'Trusted GitHub source because it is the official OHDSI organization repository.'
  )
ON CONFLICT (source_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  provider = EXCLUDED.provider,
  source_kind = EXCLUDED.source_kind,
  trust_tier = EXCLUDED.trust_tier,
  base_url = EXCLUDED.base_url,
  repository_url = EXCLUDED.repository_url,
  integration_mode = EXCLUDED.integration_mode,
  license_model = EXCLUDED.license_model,
  license_notes = EXCLUDED.license_notes,
  requires_credentials = EXCLUDED.requires_credentials,
  may_supply_clinical_content = EXCLUDED.may_supply_clinical_content,
  may_supply_terminology = EXCLUDED.may_supply_terminology,
  may_supply_population_data = EXCLUDED.may_supply_population_data,
  last_verified_at = EXCLUDED.last_verified_at,
  notes = EXCLUDED.notes,
  updated_at = now();

INSERT INTO public.clinical_engine_integrations (
  provider_key, display_name, source_registry_id, mode, endpoint_base,
  capabilities, send_identifiable_health_data, enabled, notes, last_verified_at
)
SELECT
  'infermedica',
  'Infermedica Engine API',
  source.id,
  'disabled',
  'https://api.infermedica.com/v3',
  '{"diagnosis":true,"triage":true,"shadowCompareOnly":true}'::jsonb,
  false,
  false,
  'Disabled by default. If enabled later, use only for QA/shadow comparison and never to suppress local safety rules.',
  '2026-09-29T14:00:00Z'::timestamptz
FROM public.external_source_registry source
WHERE source.source_key = 'infermedica'
ON CONFLICT (provider_key) DO UPDATE SET
  source_registry_id = EXCLUDED.source_registry_id,
  endpoint_base = EXCLUDED.endpoint_base,
  capabilities = EXCLUDED.capabilities,
  send_identifiable_health_data = false,
  notes = EXCLUDED.notes,
  last_verified_at = EXCLUDED.last_verified_at,
  updated_at = now();
