-- Harden external-source governance.
-- GitHub repositories are allowed only when they are explicitly trusted,
-- organization-owned reference repositories. They are never clinical evidence.

CREATE OR REPLACE FUNCTION public.is_trusted_github_repository(repository_url text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN repository_url IS NULL THEN false
    ELSE regexp_replace(regexp_replace(lower(trim(repository_url)), '/+
      'https://github.com/hl7/fhir',
      'https://github.com/openmrs/openmrs-core',
      'https://github.com/ohdsi/commondatamodel'
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.guard_external_source_registry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.repository_url IS NOT NULL
     AND lower(NEW.repository_url) LIKE 'https://github.com/%' THEN

    IF NOT public.is_trusted_github_repository(NEW.repository_url) THEN
      RAISE EXCEPTION
        'UNTRUSTED_GITHUB_REPOSITORY: only explicitly verified organization-owned repositories are allowed';
    END IF;

    IF NEW.may_supply_clinical_content = true THEN
      RAISE EXCEPTION
        'GITHUB_NOT_CLINICAL_EVIDENCE: GitHub repositories may be used only for technical/reference/terminology patterns';
    END IF;

    IF NEW.trust_tier NOT IN ('authoritative','established_organization') THEN
      RAISE EXCEPTION
        'GITHUB_TRUST_TIER_INVALID: trusted GitHub repositories must belong to authoritative or established organizations';
    END IF;

    IF NEW.integration_mode NOT IN ('reference_only','terminology_mapping') THEN
      RAISE EXCEPTION
        'GITHUB_INTEGRATION_MODE_INVALID: trusted GitHub repositories are limited to reference/terminology use';
    END IF;
  END IF;

  RETURN NEW;
END
$$;

REVOKE EXECUTE ON FUNCTION public.guard_external_source_registry() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_external_source_registry() TO service_role;

DROP TRIGGER IF EXISTS external_source_registry_trust_guard
  ON public.external_source_registry;

CREATE TRIGGER external_source_registry_trust_guard
BEFORE INSERT OR UPDATE ON public.external_source_registry
FOR EACH ROW
EXECUTE FUNCTION public.guard_external_source_registry();

-- Re-verify the three approved GitHub organization repositories.
UPDATE public.external_source_registry
SET
  last_verified_at = '2026-09-30T09:30:00Z'::timestamptz,
  license_model = CASE source_key
    WHEN 'hl7_fhir_github' THEN 'HL7 repository: mixed licenses; FHIR specification has separate HL7 terms'
    WHEN 'openmrs_core_github' THEN 'Mozilla Public License 2.0'
    WHEN 'ohdsi_cdm_github' THEN 'Apache License 2.0'
    ELSE license_model
  END,
  license_notes = CASE source_key
    WHEN 'hl7_fhir_github'
      THEN 'Repository LICENSE states multiple licenses may apply and the FHIR specification itself has separate license terms. Review file-level/specification terms before copying.'
    WHEN 'openmrs_core_github'
      THEN 'OpenMRS Core repository LICENSE is Mozilla Public License 2.0. Use as architecture/interoperability reference unless a deliberate licensed code reuse decision is made.'
    WHEN 'ohdsi_cdm_github'
      THEN 'CommonDataModel DESCRIPTION declares Apache License 2.0. Use for CDM/vocabulary interoperability patterns, not patient-level clinical rules.'
    ELSE license_notes
  END,
  notes = CASE source_key
    WHEN 'hl7_fhir_github'
      THEN 'Verified organization-owned repository (GitHub owner: HL7). Reference/terminology patterns only; not clinical evidence.'
    WHEN 'openmrs_core_github'
      THEN 'Verified organization-owned repository (GitHub owner: openmrs). Architecture/interoperability reference only; not clinical evidence.'
    WHEN 'ohdsi_cdm_github'
      THEN 'Verified organization-owned repository (GitHub owner: OHDSI). Data-model/vocabulary reference only; not clinical evidence.'
    ELSE notes
  END,
  may_supply_clinical_content = false,
  updated_at = now()
WHERE source_key IN (
  'hl7_fhir_github',
  'openmrs_core_github',
  'ohdsi_cdm_github'
);

COMMENT ON FUNCTION public.is_trusted_github_repository(text)
IS 'Exact allowlist for organization-owned GitHub repositories permitted as non-clinical references.';

COMMENT ON TRIGGER external_source_registry_trust_guard
ON public.external_source_registry
IS 'Blocks unverified GitHub repositories and prevents any GitHub repository from becoming a primary clinical-content source.';
, ''), '\\.git
      'https://github.com/hl7/fhir',
      'https://github.com/openmrs/openmrs-core',
      'https://github.com/ohdsi/commondatamodel'
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.guard_external_source_registry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.repository_url IS NOT NULL
     AND lower(NEW.repository_url) LIKE 'https://github.com/%' THEN

    IF NOT public.is_trusted_github_repository(NEW.repository_url) THEN
      RAISE EXCEPTION
        'UNTRUSTED_GITHUB_REPOSITORY: only explicitly verified organization-owned repositories are allowed';
    END IF;

    IF NEW.may_supply_clinical_content = true THEN
      RAISE EXCEPTION
        'GITHUB_NOT_CLINICAL_EVIDENCE: GitHub repositories may be used only for technical/reference/terminology patterns';
    END IF;

    IF NEW.trust_tier NOT IN ('authoritative','established_organization') THEN
      RAISE EXCEPTION
        'GITHUB_TRUST_TIER_INVALID: trusted GitHub repositories must belong to authoritative or established organizations';
    END IF;

    IF NEW.integration_mode NOT IN ('reference_only','terminology_mapping') THEN
      RAISE EXCEPTION
        'GITHUB_INTEGRATION_MODE_INVALID: trusted GitHub repositories are limited to reference/terminology use';
    END IF;
  END IF;

  RETURN NEW;
END
$$;

REVOKE EXECUTE ON FUNCTION public.guard_external_source_registry() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_external_source_registry() TO service_role;

DROP TRIGGER IF EXISTS external_source_registry_trust_guard
  ON public.external_source_registry;

CREATE TRIGGER external_source_registry_trust_guard
BEFORE INSERT OR UPDATE ON public.external_source_registry
FOR EACH ROW
EXECUTE FUNCTION public.guard_external_source_registry();

-- Re-verify the three approved GitHub organization repositories.
UPDATE public.external_source_registry
SET
  last_verified_at = '2026-09-30T09:30:00Z'::timestamptz,
  notes = CASE source_key
    WHEN 'hl7_fhir_github'
      THEN 'Verified organization-owned repository (GitHub owner: HL7). Reference/terminology patterns only; not clinical evidence.'
    WHEN 'openmrs_core_github'
      THEN 'Verified organization-owned repository (GitHub owner: openmrs). Architecture/interoperability reference only; not clinical evidence.'
    WHEN 'ohdsi_cdm_github'
      THEN 'Verified organization-owned repository (GitHub owner: OHDSI). Data-model/vocabulary reference only; not clinical evidence.'
    ELSE notes
  END,
  may_supply_clinical_content = false,
  updated_at = now()
WHERE source_key IN (
  'hl7_fhir_github',
  'openmrs_core_github',
  'ohdsi_cdm_github'
);

COMMENT ON FUNCTION public.is_trusted_github_repository(text)
IS 'Exact allowlist for organization-owned GitHub repositories permitted as non-clinical references.';

COMMENT ON TRIGGER external_source_registry_trust_guard
ON public.external_source_registry
IS 'Blocks unverified GitHub repositories and prevents any GitHub repository from becoming a primary clinical-content source.';
, '') IN (
      'https://github.com/hl7/fhir',
      'https://github.com/openmrs/openmrs-core',
      'https://github.com/ohdsi/commondatamodel'
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.guard_external_source_registry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.repository_url IS NOT NULL
     AND lower(NEW.repository_url) LIKE 'https://github.com/%' THEN

    IF NOT public.is_trusted_github_repository(NEW.repository_url) THEN
      RAISE EXCEPTION
        'UNTRUSTED_GITHUB_REPOSITORY: only explicitly verified organization-owned repositories are allowed';
    END IF;

    IF NEW.may_supply_clinical_content = true THEN
      RAISE EXCEPTION
        'GITHUB_NOT_CLINICAL_EVIDENCE: GitHub repositories may be used only for technical/reference/terminology patterns';
    END IF;

    IF NEW.trust_tier NOT IN ('authoritative','established_organization') THEN
      RAISE EXCEPTION
        'GITHUB_TRUST_TIER_INVALID: trusted GitHub repositories must belong to authoritative or established organizations';
    END IF;

    IF NEW.integration_mode NOT IN ('reference_only','terminology_mapping') THEN
      RAISE EXCEPTION
        'GITHUB_INTEGRATION_MODE_INVALID: trusted GitHub repositories are limited to reference/terminology use';
    END IF;
  END IF;

  RETURN NEW;
END
$$;

REVOKE EXECUTE ON FUNCTION public.guard_external_source_registry() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_external_source_registry() TO service_role;

DROP TRIGGER IF EXISTS external_source_registry_trust_guard
  ON public.external_source_registry;

CREATE TRIGGER external_source_registry_trust_guard
BEFORE INSERT OR UPDATE ON public.external_source_registry
FOR EACH ROW
EXECUTE FUNCTION public.guard_external_source_registry();

-- Re-verify the three approved GitHub organization repositories.
UPDATE public.external_source_registry
SET
  last_verified_at = '2026-09-30T09:30:00Z'::timestamptz,
  notes = CASE source_key
    WHEN 'hl7_fhir_github'
      THEN 'Verified organization-owned repository (GitHub owner: HL7). Reference/terminology patterns only; not clinical evidence.'
    WHEN 'openmrs_core_github'
      THEN 'Verified organization-owned repository (GitHub owner: openmrs). Architecture/interoperability reference only; not clinical evidence.'
    WHEN 'ohdsi_cdm_github'
      THEN 'Verified organization-owned repository (GitHub owner: OHDSI). Data-model/vocabulary reference only; not clinical evidence.'
    ELSE notes
  END,
  may_supply_clinical_content = false,
  updated_at = now()
WHERE source_key IN (
  'hl7_fhir_github',
  'openmrs_core_github',
  'ohdsi_cdm_github'
);

COMMENT ON FUNCTION public.is_trusted_github_repository(text)
IS 'Exact allowlist for organization-owned GitHub repositories permitted as non-clinical references.';

COMMENT ON TRIGGER external_source_registry_trust_guard
ON public.external_source_registry
IS 'Blocks unverified GitHub repositories and prevents any GitHub repository from becoming a primary clinical-content source.';
