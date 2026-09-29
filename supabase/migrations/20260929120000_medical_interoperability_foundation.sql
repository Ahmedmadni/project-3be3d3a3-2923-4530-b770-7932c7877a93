-- Medical interoperability + source governance foundation.
-- No external source is allowed to publish clinical content merely because it is public/open-source.

ALTER TABLE public.medical_sources
  ADD COLUMN IF NOT EXISTS provenance_kind text NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS trust_level text NOT NULL DEFAULT 'unreviewed',
  ADD COLUMN IF NOT EXISTS clinical_use_allowed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS license_name text,
  ADD COLUMN IF NOT EXISTS license_url text,
  ADD COLUMN IF NOT EXISTS terms_url text,
  ADD COLUMN IF NOT EXISTS verification_notes text;

ALTER TABLE public.medical_sources
  DROP CONSTRAINT IF EXISTS medical_sources_trust_level_check;
ALTER TABLE public.medical_sources
  ADD CONSTRAINT medical_sources_trust_level_check
  CHECK (trust_level IN ('authoritative','trusted_nonprofit','validated_commercial','community','unreviewed'));

-- Backfill the already-reviewed authoritative organizations in this project.
UPDATE public.medical_sources
SET trust_level = 'authoritative',
    clinical_use_allowed = true,
    owner_verified = true,
    verification_notes = coalesce(verification_notes, 'Official government/intergovernmental health source reviewed by project governance.')
WHERE lower(coalesce(organization,'')) LIKE '%ministry of health%'
   OR organization ILIKE '%وزارة الصحة%'
   OR lower(coalesce(organization,'')) LIKE '%world health organization%'
   OR lower(coalesce(organization,'')) = 'nhs'
   OR lower(coalesce(organization,'')) LIKE '%centers for disease control%'
   OR lower(coalesce(organization,'')) LIKE '%cdc%';

UPDATE public.medical_sources
SET trust_level = 'trusted_nonprofit',
    clinical_use_allowed = true,
    owner_verified = true,
    verification_notes = coalesce(verification_notes, 'Established health/humanitarian organization; clinical use still requires item-level review.')
WHERE lower(coalesce(organization,'')) LIKE '%red cross%';

CREATE TABLE IF NOT EXISTS public.external_resource_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  provider text NOT NULL,
  url text NOT NULL,
  resource_type text NOT NULL,
  trust_level text NOT NULL,
  clinical_use_status text NOT NULL,
  owner_verified boolean NOT NULL DEFAULT false,
  commercial boolean NOT NULL DEFAULT false,
  requires_credentials boolean NOT NULL DEFAULT false,
  license_name text,
  license_url text,
  terms_url text,
  last_verified_at timestamptz,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT external_resource_type_check CHECK (
    resource_type IN ('terminology_api','population_data_api','clinical_engine','github_repository','reference')
  ),
  CONSTRAINT external_resource_trust_check CHECK (
    trust_level IN ('official','validated_commercial','community','unknown')
  ),
  CONSTRAINT external_resource_clinical_status_check CHECK (
    clinical_use_status IN ('terminology_only','population_data_only','shadow_evaluation','engineering_reference','not_approved')
  )
);

ALTER TABLE public.external_resource_registry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "external resources public read" ON public.external_resource_registry;
CREATE POLICY "external resources public read"
ON public.external_resource_registry FOR SELECT TO anon, authenticated
USING (is_active = true);
DROP POLICY IF EXISTS "external resources admin write" ON public.external_resource_registry;
CREATE POLICY "external resources admin write"
ON public.external_resource_registry FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.terminology_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  system text NOT NULL DEFAULT 'UMLS',
  concept_id text NOT NULL,
  source_vocabulary text,
  source_code text,
  preferred_term text,
  language text,
  review_status public.review_status NOT NULL DEFAULT 'draft',
  is_active boolean NOT NULL DEFAULT false,
  external_resource_id uuid REFERENCES public.external_resource_registry(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT terminology_mapping_entity_type_check CHECK (entity_type IN ('symptom','condition')),
  UNIQUE(entity_type, entity_id, system, concept_id)
);

ALTER TABLE public.terminology_mappings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "published terminology mappings read" ON public.terminology_mappings;
CREATE POLICY "published terminology mappings read"
ON public.terminology_mappings FOR SELECT TO anon, authenticated
USING (is_active = true AND review_status = 'published');
DROP POLICY IF EXISTS "terminology mappings admin write" ON public.terminology_mappings;
CREATE POLICY "terminology mappings admin write"
ON public.terminology_mappings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.clinical_engine_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code text NOT NULL UNIQUE,
  display_name text NOT NULL,
  mode text NOT NULL DEFAULT 'disabled',
  base_url text NOT NULL,
  credential_secret_names jsonb NOT NULL DEFAULT '[]'::jsonb,
  terms_url text,
  data_handling_note text,
  last_verified_at timestamptz,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clinical_engine_mode_check CHECK (mode IN ('disabled','shadow','active'))
);

ALTER TABLE public.clinical_engine_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clinical integrations staff read" ON public.clinical_engine_integrations;
CREATE POLICY "clinical integrations staff read"
ON public.clinical_engine_integrations FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['medical_reviewer','admin','super_admin']));
DROP POLICY IF EXISTS "clinical integrations admin write" ON public.clinical_engine_integrations;
CREATE POLICY "clinical integrations admin write"
ON public.clinical_engine_integrations FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Strengthen publication source guard: active is not enough; the source must also
-- have passed source-governance review for clinical use.
CREATE OR REPLACE FUNCTION public.require_medical_source_before_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_source boolean := false;
BEGIN
  IF NEW.review_status::text <> 'published'
     OR OLD.review_status::text = 'published' THEN
    RETURN NEW;
  END IF;

  CASE TG_TABLE_NAME
    WHEN 'symptoms' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.symptom_sources link
        JOIN public.medical_sources src ON src.id = link.source_id
        WHERE link.symptom_id = NEW.id
          AND src.is_active = true
          AND src.clinical_use_allowed = true
          AND src.trust_level <> 'unreviewed'
      ) INTO has_source;
    WHEN 'conditions' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.condition_sources link
        JOIN public.medical_sources src ON src.id = link.source_id
        WHERE link.condition_id = NEW.id
          AND src.is_active = true
          AND src.clinical_use_allowed = true
          AND src.trust_level <> 'unreviewed'
      ) INTO has_source;
    WHEN 'questions' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.question_sources link
        JOIN public.medical_sources src ON src.id = link.source_id
        WHERE link.question_id = NEW.id
          AND src.is_active = true
          AND src.clinical_use_allowed = true
          AND src.trust_level <> 'unreviewed'
      ) INTO has_source;
    WHEN 'red_flags' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.red_flag_sources link
        JOIN public.medical_sources src ON src.id = link.source_id
        WHERE link.red_flag_id = NEW.id
          AND src.is_active = true
          AND src.clinical_use_allowed = true
          AND src.trust_level <> 'unreviewed'
      ) INTO has_source;
    WHEN 'first_aid_topics' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.first_aid_sources link
        JOIN public.medical_sources src ON src.id = link.source_id
        WHERE link.first_aid_topic_id = NEW.id
          AND src.is_active = true
          AND src.clinical_use_allowed = true
          AND src.trust_level <> 'unreviewed'
      ) INTO has_source;
    ELSE
      RETURN NEW;
  END CASE;

  IF NOT has_source THEN
    RAISE EXCEPTION 'TRUSTED_SOURCE_REQUIRED: % needs an active, approved clinical source before publication', TG_TABLE_NAME;
  END IF;

  RETURN NEW;
END
$$;

-- Trusted external-resource registry.
INSERT INTO public.external_resource_registry
(code,name,provider,url,resource_type,trust_level,clinical_use_status,owner_verified,commercial,requires_credentials,terms_url,last_verified_at,notes)
VALUES
('nlm_umls','UMLS Terminology Services','U.S. National Library of Medicine','https://documentation.uts.nlm.nih.gov/rest/home.html','terminology_api','official','terminology_only',true,false,true,'https://www.nlm.nih.gov/research/umls/index.html','2026-09-29T11:53:00Z','Use for terminology normalization/mapping only. Do not treat terminology matches as diagnosis or triage evidence.'),
('who_data_hub','WHO World Health Data Hub','World Health Organization','https://data.who.int/','population_data_api','official','population_data_only',true,false,false,'https://www.who.int/about/policies/publishing/copyright','2026-09-29T11:53:00Z','Population-health context only; never patient-specific diagnostic evidence.'),
('infermedica_engine','Infermedica Engine API','Infermedica','https://developer.infermedica.com/documentation/engine-api/','clinical_engine','validated_commercial','shadow_evaluation',true,true,true,'https://infermedica.com/terms','2026-09-29T11:53:00Z','Disabled by default. Intended only for controlled shadow comparison after contract/privacy review; never exposes credentials client-side.'),
('who_github_godata','WHO Go.Data GitHub','World Health Organization','https://github.com/WorldHealthOrganization/godata','github_repository','official','engineering_reference',true,false,false,'https://github.com/WorldHealthOrganization/godata','2026-09-29T11:53:00Z','WHO itself links to this repository. Engineering/interoperability reference only, not a source for symptom-diagnosis relationships.')
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name, provider=EXCLUDED.provider, url=EXCLUDED.url,
  resource_type=EXCLUDED.resource_type, trust_level=EXCLUDED.trust_level,
  clinical_use_status=EXCLUDED.clinical_use_status, owner_verified=EXCLUDED.owner_verified,
  commercial=EXCLUDED.commercial, requires_credentials=EXCLUDED.requires_credentials,
  terms_url=EXCLUDED.terms_url, last_verified_at=EXCLUDED.last_verified_at,
  notes=EXCLUDED.notes, is_active=true;

INSERT INTO public.clinical_engine_integrations
(provider_code,display_name,mode,base_url,credential_secret_names,terms_url,data_handling_note,last_verified_at,is_active)
VALUES
('infermedica','Infermedica Engine API','disabled','https://api.infermedica.com/v3',
 '["INFERMEDICA_APP_ID","INFERMEDICA_APP_KEY"]'::jsonb,
 'https://infermedica.com/terms',
 'No user health data may be sent until privacy, contractual, regional-hosting, and medical-device implications are reviewed. Shadow mode must remain server-side.',
 '2026-09-29T11:53:00Z',false)
ON CONFLICT (provider_code) DO NOTHING;
