# External Source & Open-Source Review

Review date: **2026-09-29**

This document records whether an external source is acceptable for:
1. clinical evidence,
2. terminology/interoperability,
3. population-health context,
4. engineering reference only.

**Rule:** public or open-source does not mean clinically validated. GitHub content is never promoted to a clinical source solely because the repository is public.

## Approved / trusted foundations

### U.S. National Library of Medicine — UMLS / UTS
- Resource: https://documentation.uts.nlm.nih.gov/rest/home.html
- Owner: U.S. National Library of Medicine (NLM)
- Status: **official**
- Approved use: **terminology mapping only**
- Intended use in مؤشر صحي:
  - map internal symptom/condition identifiers to UMLS CUIs,
  - store source vocabulary and source code,
  - normalize synonyms and support future interoperability.
- Not allowed:
  - diagnosis,
  - triage,
  - automatic clinical publication based only on a terminology match.
- Credentials: server-side UMLS API key only.
- Licensing: UMLS license/UTS account required; some included vocabularies may have additional terms.

### World Health Organization — World Health Data Hub
- Resource: https://data.who.int/
- Owner: World Health Organization
- Status: **official**
- Approved use: **population-health/statistical context only**
- Not allowed:
  - using population prevalence as evidence that an individual user has a condition.
- Note: the legacy GHO/Athena interfaces are being retired/deprecated; new work should target the current WHO data platform.

### Infermedica
- Resource: https://developer.infermedica.com/documentation/engine-api/
- Owner: Infermedica
- Status: **validated commercial service**
- Approved use now: **disabled / future shadow evaluation only**
- Planned architecture:
  - local reviewed engine remains user-facing,
  - server-side adapter can compare triage/differential in shadow mode,
  - discrepancies go to clinical QA,
  - no external output silently changes the user's care advice.
- Required before sending health data:
  - commercial agreement,
  - privacy/data-processing review,
  - regional-hosting review,
  - regulatory/intended-use review,
  - server-side secrets only.

## GitHub trust policy

A GitHub repository is accepted as a trusted project reference only when:
- the owning organization is independently verified as the real institution,
- an official institutional website links to or otherwise confirms the repository/namespace,
- license/terms are understood,
- use is explicitly scoped.

A trusted GitHub repository is still **not automatically clinical evidence**.

### Approved GitHub engineering reference

#### WorldHealthOrganization/godata
- Repository: https://github.com/WorldHealthOrganization/godata
- Institution: World Health Organization
- Verification: WHO materials link to the repository as WHO-maintained open-source software.
- Use: **engineering/interoperability reference only**
- Clinical symptom/diagnosis data import: **not approved**
- License: GPL-3.0 (per WHO project materials/repository)

## Reviewed community repositories — not approved as clinical sources

These repositories may contain useful UX or engineering ideas, but they are **not allowed to support publication of clinical content** in مؤشر صحي.

### LabinatorSolutions/medical-symptom-checker
- Public repository; archived.
- License: GPL-3.0.
- Contains a broad symptom/disease mapping dataset.
- Decision: **engineering/vocabulary inspiration only; no direct clinical import**.
- Reason: repository data provenance/clinical validation is insufficient for our governance standard, and direct reuse may carry GPL obligations.

### kimnguyen2002/Symptoms_Checker
- License: MIT.
- Decision-tree demo that predicts a condition and displays drug information.
- Decision: **engineering reference only; no diagnosis/drug-content import**.
- Reason: portfolio/demo design, not a reviewed clinical knowledge source.

### Utsavlakshkar/symptom_checker
- Simple disease/symptom matching and precaution dataset.
- No repository license file found during review.
- Decision: **not approved for import**.

### saisrikarbommisetty/MedAssist-AI
- Useful product ideas: triage colors, voice input, TTS, report export, hospital finder.
- The ML training pipeline generates synthetic patient records from its own disease metadata.
- No repository license file found during review.
- Decision: **product/UX inspiration only; do not import model or clinical predictions**.

### saali96/medicalChatbot
- Dataset is primarily conversational/mental-health intents rather than a governed first-aid clinical dataset.
- Contains hard-coded response content and region-specific contact information unsuitable for this product.
- No repository license file found during review.
- Decision: **not approved**.

### khaoula1972/first-aid-chatbot
- License: MIT.
- Arabic first-aid chat UX is useful as an engineering reference.
- Current implementation routes queries through an LLM/OpenRouter flow rather than a controlled reviewed first-aid knowledge base.
- Decision: **Arabic UX/NLP inspiration only; generated medical answers are not imported**.

## Source publication rule

Clinical content can be published only when its linked `medical_sources` record is:
- active,
- explicitly marked `clinical_use_allowed = true`,
- reviewed into an accepted trust level,
- independently reviewed at item level through the existing medical-content governance flow.

External resources in `external_resource_registry` never bypass this rule.
