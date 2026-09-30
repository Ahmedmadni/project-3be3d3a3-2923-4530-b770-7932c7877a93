# Trusted External Sources Policy

Last reviewed: 2026-09-30

This project separates **clinical evidence**, **terminology/standards**, **population data**, and **technical inspiration**. A public GitHub repository is never treated as clinical evidence merely because it is open source.

## Approved GitHub organization repositories

These repositories are allow-listed for technical, interoperability, or terminology reference only:

| Repository | Organization | Allowed use | Clinical evidence |
|---|---|---|---|
| https://github.com/HL7/fhir | HL7 | FHIR interoperability/reference patterns | No |
| https://github.com/openmrs/openmrs-core | OpenMRS | Architecture/interoperability reference | No |
| https://github.com/OHDSI/CommonDataModel | OHDSI | Common data-model/vocabulary reference | No |

Repository ownership was re-checked on GitHub on 2026-09-30. All three are public repositories owned by GitHub organizations matching the established project/standards body.

The database has an exact allowlist trigger. Any other GitHub repository URL is rejected from the external-source registry until it is explicitly reviewed and added by code/migration.

## GitHub repositories not approved for clinical import

Community symptom-checker/chatbot repositories may be inspected for UX or implementation ideas, but are not approved as medical evidence or direct knowledge imports. This includes, unless separately reviewed later:

- LabinatorSolutions/medical-symptom-checker
- kimnguyen2002/Symptoms_Checker
- Utsavlakshkar/symptom_checker
- saisrikarbommisetty/MedAssist-AI
- saali96/medicalChatbot
- khaoula1972/first-aid-chatbot

The controlled medical-import validator rejects GitHub repository URLs as primary clinical evidence, including allow-listed standards repositories.

## Authoritative non-GitHub sources

### UMLS / NLM

Use: terminology normalization/mapping only.

- Provider: U.S. National Library of Medicine
- API: UMLS Terminology Services
- Credentials/license required
- UMLS mappings do not establish diagnosis or clinical evidence
- API keys must stay server-side

### WHO World Health Data Hub

Use: population-level health statistics/context only.

- Provider: World Health Organization
- Never use prevalence/statistics as patient-level diagnostic evidence
- Prefer the current World Health Data Hub/current OData implementation over retired/deprecated legacy interfaces

### Infermedica

Use: optional disabled-by-default shadow comparison / QA only.

- Commercial external engine
- Must not replace or suppress the local deterministic red-flag engine
- Identifiable health data must not be sent by default
- Requires explicit credentials/configuration and applicable commercial terms

## Clinical content source rule

Clinical content used by the public app should come from authoritative medical/government/guideline sources and must pass:

**Source -> Draft -> Medical Review -> Approval -> Publication**

Open-source code, public repositories, model outputs, terminology mappings, and population statistics do not bypass this workflow.

## Disclaimer policy

A medical disclaimer is rendered globally on every application route. Additional context-specific disclaimers are shown on symptom checking, results, condition information, first aid, emergency, professional mode, health library, and source-governance screens.

Disclaimers do not make unreviewed medical content safe; they are an additional communication layer, not a substitute for source governance and medical review.
