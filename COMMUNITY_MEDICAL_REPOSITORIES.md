# Community Medical Repository Review

Reviewed: **2026-10-02**

Purpose: capture useful engineering, UX, data-quality, and research patterns from user-suggested public repositories without treating community GitHub content as patient-level clinical evidence.

## Safety boundary

These repositories are **technical/reference inputs only**.

They do not bypass the application workflow:

**authoritative medical source → draft → medical review → approval → publication**

No diagnosis, red flag, care-level rule, first-aid instruction, reference range, medication decision, or emergency threshold may be imported from these repositories merely because the source is open source.

## Reviewed repositories

### rudi-q/pinkrain_health_journal

Useful patterns:
- health journaling and mood/symptom logging;
- medication scheduling, taken/skipped dose state and adherence UX;
- local-first privacy architecture;
- trend/correlation presentation;
- PDF summary workflow;
- notification and end-to-end testing patterns;
- experimental AI kept behind an explicit feature boundary.

Do not import its symptom-prediction model into the clinical engine. The repository itself describes that model as experimental and disabled by default.

### saali96/medicalChatbot

Useful patterns:
- intent taxonomy;
- unknown/fallback intent handling;
- simple conversation-state fixtures.

The implementation is a bag-of-words/Keras intent classifier with static response data. Medical/mental-health responses and crisis contacts are not approved for import.

### khaoula1972/first-aid-chatbot

Useful patterns:
- Arabic first-aid query classification;
- classify-then-route interaction;
- RTL emergency chat presentation;
- clear out-of-scope response for non-first-aid requests.

The answer path sends first-aid questions to a general LLM. We will **not** reproduce that clinical architecture. In مؤشر صحي, routing may lead to governed deterministic source-backed first-aid content, never unsourced free-form emergency instructions.

### beamandrew/medical-data

Useful patterns:
- discovery catalog for medical imaging, EHR, national-health, literature and challenge datasets;
- future research/QA resource inventory.

Every downstream dataset needs independent provenance, access, license, privacy, and suitability review. The catalog is not a clinical evidence source.

### higgi13425/medicaldata

Useful patterns:
- reproducible medical-data teaching fixtures;
- codebook-driven import validation;
- intentionally messy BP/glucose datasets for wrangling tests;
- sample vital-sign/lab table shapes;
- future Professional Mode import QA.

Do not derive clinical reference ranges or patient-level guidance from these teaching datasets.

## Planned use in مؤشر صحي

1. **First aid:** adopt Arabic intent-routing and scope-gating patterns while keeping guidance sourced from official medical organizations.
2. **Journal:** add structured symptom/mood/medication journaling inspired by PinkRain's product architecture.
3. **Medication adherence:** implement taken/skipped dose state, reminders and longitudinal adherence summaries without prescribing or changing therapy.
4. **Health reports:** add a privacy-aware export/report pipeline for user-entered measurements, journal entries and medication adherence.
5. **Import QA:** use synthetic/teaching fixtures and messy-data patterns to harden future Professional Mode CSV/XLSX import.
6. **Research registry:** use the dataset-catalog concept to organize potential external datasets before any future ML research integration.
