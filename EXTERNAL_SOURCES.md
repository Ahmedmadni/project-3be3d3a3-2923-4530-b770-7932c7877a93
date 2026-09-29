# External Medical Sources & Interoperability

This document records which external sources may be used by Health Indicator, why they are trusted, and what they are allowed to influence.

## Core rule

A public GitHub repository is **not** clinical evidence by itself.

External sources are separated into four purposes:

1. **Terminology mapping** — normalize names/codes only.
2. **Shadow comparison** — QA comparison against the local engine only.
3. **Population context** — epidemiology/statistics for the health library only.
4. **Reference-only engineering** — architecture/interoperability patterns, never clinical rules.

Clinical content still follows:

**Source -> Draft -> Medical Review -> Publish**

## Registered trusted sources

### U.S. National Library of Medicine — UMLS/UTS

Purpose: terminology mapping only.

- Official provider: U.S. National Library of Medicine (NLM)
- API: https://uts-ws.nlm.nih.gov/rest
- Requires an individual UMLS/UTS license and API key.
- The API key must remain server-side.
- UMLS mappings are not diagnostic evidence.
- Source vocabularies within UMLS can have separate redistribution/license terms.

Implementation:
- `terminology_mappings` table.
- `UmlsTerminologyProvider` server-side adapter.
- Mappings start as draft and require review/approval.

### World Health Organization — World Health Data Hub

Purpose: population-health context only.

- Official provider: WHO.
- Use the current World Health Data Hub / current OData implementation.
- Do not use population prevalence as patient-level evidence.
- Do not build new work on the legacy GHO/Athena interfaces.

### Infermedica

Purpose: optional shadow comparison only.

- Commercial clinical API.
- Disabled by default.
- Must never replace or suppress the local deterministic RedFlagEngine.
- Identifiable health-data transmission is disabled by default.
- Credentials must stay server-side.
- Any future enablement requires explicit privacy, contractual, and clinical review.

## Trusted GitHub repositories

Only official/established organization repositories are registered:

### HL7/fhir

- Repository: https://github.com/HL7/fhir
- Owner: official **HL7** GitHub organization.
- Use: FHIR/interoperability structures and standards reference.
- Not a symptom-diagnosis dataset.

### openmrs/openmrs-core

- Repository: https://github.com/openmrs/openmrs-core
- Owner: official **OpenMRS** GitHub organization.
- Use: health-system architecture/interoperability patterns.
- Do not import example patient data or diagnostic rules.

### OHDSI/CommonDataModel

- Repository: https://github.com/OHDSI/CommonDataModel
- Owner: official **OHDSI** GitHub organization.
- Use: common-data-model and vocabulary architecture.
- Do not treat the repository as direct diagnostic evidence.

## Community repositories reviewed but not approved as clinical sources

The following repositories may contain useful implementation ideas, but are **not** approved clinical knowledge sources for automatic import:

- LabinatorSolutions/medical-symptom-checker
- kimnguyen2002/Symptoms_Checker
- Utsavlakshkar/symptom_checker
- saisrikarbommisetty/MedAssist-AI
- saali96/medicalChatbot
- khaoula1972/first-aid-chatbot

Reasons include one or more of:
- community/project ownership rather than a recognized standards/health authority;
- unclear provenance of clinical datasets;
- synthetic training data;
- generated LLM medical answers without a controlled reviewed knowledge base;
- missing/unclear licenses in some repositories;
- diagnostic or medication behavior that does not match Health Indicator's safety architecture.

Ideas can be studied independently, but clinical facts must be re-sourced from authoritative medical references and pass the normal review workflow.

## Medical disclaimer policy

A medical disclaimer is now rendered globally on every application page.

Additional contextual disclaimers are shown in:
- symptom checking/results;
- emergency flow;
- first aid;
- condition/library content;
- professional mode.

The emergency disclaimer explicitly states that app questions must not delay calling emergency services.

## Secrets and privacy

Never place UMLS, Infermedica, or other vendor credentials in browser bundles or database rows.

Recommended server environment variables for future activation:

- `UMLS_API_KEY`
- `INFERMEDICA_APP_ID`
- `INFERMEDICA_APP_KEY`

Infermedica remains disabled until separately approved.

## Current status

The interoperability foundation is implemented, but no external engine is enabled and no UMLS mapping has been approved automatically.
