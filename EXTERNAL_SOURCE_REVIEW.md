# External Source Review — مؤشر صحي

Status: **governance / reference policy, not clinical approval**

Last reviewed: **2026-09-30**

This document records which external sources may be used by the application, how they may be used, and which user-suggested repositories are deliberately excluded from clinical evidence.

## Core rule

A public or open-source repository is **not** automatically a trustworthy clinical source.

Clinical content used for symptom matching, red flags, first aid, or care guidance must continue through the existing workflow:

**authoritative medical source → draft → medical review → approval/publication**

GitHub repositories are limited to technical, interoperability, terminology, or product-pattern reference. They are never accepted as primary patient-level clinical evidence by the controlled import validator.

## Approved GitHub reference repositories

### HL7/FHIR

Repository: https://github.com/HL7/fhir  
Owner: **HL7** GitHub organization  
Use: interoperability structures and terminology/reference patterns only  
Clinical evidence: **No**

License note: the repository LICENSE states that multiple licenses can apply and that the FHIR specification itself has separate HL7 licensing terms. File/specification terms must be reviewed before any code or content is copied.

### OpenMRS Core

Repository: https://github.com/openmrs/openmrs-core  
Owner: **openmrs** GitHub organization  
Use: architecture, clinical-system workflow, and interoperability reference only  
Clinical evidence: **No**

License: Mozilla Public License 2.0.

### OHDSI Common Data Model

Repository: https://github.com/OHDSI/CommonDataModel  
Owner: **OHDSI** GitHub organization  
Use: data-model and vocabulary interoperability patterns only  
Clinical evidence: **No**

License: Apache License 2.0 (declared in the package DESCRIPTION).

## Authoritative non-GitHub integrations

### UMLS Terminology Services — U.S. National Library of Medicine

Use: terminology normalization/mapping only.

- UTS/UMLS credentials remain server-side.
- A UMLS mapping does not become diagnostic evidence.
- Source vocabularies inside UMLS can carry additional licensing restrictions.
- Mapping records remain governed and reviewable.

### WHO World Health Data Hub

Use: population-level health context for the health library only.

Population prevalence or statistics must never be used as patient-level evidence that a user has a condition.

### Infermedica

Use: optional **disabled-by-default shadow comparison / QA** only.

- Must not replace the local deterministic red-flag engine.
- Must not receive identifiable health data by default.
- Commercial terms and credentials apply.
- Any future use requires explicit configuration and privacy/regulatory review.

## User-suggested community repositories — not approved as clinical sources

The following repositories were inspected as product/technical references but are **not approved for medical-content import**:

- LabinatorSolutions/medical-symptom-checker
- kimnguyen2002/Symptoms_Checker
- Utsavlakshkar/symptom_checker
- saisrikarbommisetty/MedAssist-AI
- saali96/medicalChatbot
- khaoula1972/first-aid-chatbot

Reasons include one or more of:

- individual/community ownership rather than a recognized standards or medical authority;
- unclear provenance of symptom/disease relationships or datasets;
- ML models trained on synthetic or unvalidated data;
- generated medical responses without a governed clinical knowledge base;
- missing or restrictive licensing for intended reuse;
- project scope/content that does not match the app's clinical-safety requirements.

They may inspire UX or engineering patterns after independent reimplementation, but no medical statement from them should enter production unless it is independently confirmed against an authoritative medical source and passes the normal review workflow.

## Enforcement implemented in code/database

- Exact GitHub allowlist for the three approved organization repositories.
- Database trigger rejects any unapproved GitHub repository in the external-source registry.
- Database trigger prevents any GitHub repository from being marked as a clinical-content source.
- Controlled medical-import validator rejects GitHub repository URLs as primary clinical evidence.
- Tests cover the allowlist and clinical-import rejection.
- External sources remain visible in the admin source registry with trust tier, license, allowed capabilities, and verification date.

## Disclaimer requirement

A global medical disclaimer is rendered from the application root on **every page**, including authentication, account, history, admin, and clinical flows.

Context-specific disclaimers remain in:

- symptom checker;
- results;
- emergency;
- first aid;
- health library;
- condition details;
- professional mode;
- external-source administration.

The disclaimer states that the app is for guidance/education only, does not diagnose or treat, does not replace qualified medical care, and that an external/technical source does not automatically count as clinical evidence.
