# Starter Medical Content Pack

Status: **draft only — not medically approved or published**

This pack intentionally starts small. It is meant to give the medical reviewer a practical, source-backed first batch instead of trying to build a large medical encyclopedia.

## Draft conditions

1. Iron deficiency anemia
   - Saudi Ministry of Health
   - World Health Organization
   - Draft matching links: fatigue, dizziness, headache, shortness of breath
   - Remains inactive until medical review

2. Type 2 diabetes
   - Saudi Ministry of Health
   - US CDC
   - Draft matching links: excessive thirst, frequent urination, fatigue
   - Remains inactive until medical review

3. Dehydration
   - Saudi Ministry of Health
   - NHS
   - Draft matching links: excessive thirst, dizziness, fatigue, nausea
   - Remains inactive until medical review

4. Common cold
   - Saudi Ministry of Health
   - NHS
   - Draft matching links now include runny nose, sore throat, nasal congestion, sneezing and body aches in addition to the existing respiratory symptoms
   - The added symptom vocabulary remains inactive until medical review
   - Remains inactive until medical review

5. Migraine
   - Saudi Ministry of Health
   - NHS
   - Draft matching links now include sensitivity to light and sensitivity to sound in addition to headache, nausea, vomiting and dizziness
   - The added symptom vocabulary remains inactive until medical review
   - Remains inactive until medical review

The condition summaries explicitly state that symptoms alone are not diagnostic.

## Draft first-aid topics

The existing topics below now have source-backed draft section bodies:

- Life-threatening bleeding
- Burns
- Adult/child choking
- Seizures

Each uses the five public sections already supported by the app:

- What is happening?
- When should I call emergency services?
- What should I do now?
- What should I avoid?
- While waiting for help

The section bodies remain in draft status, so the production app will not show them until the governance workflow publishes them.

## Sources checked

Checked on 2026-09-29:

- Saudi MOH — Iron deficiency anemia  
  https://www.moh.gov.sa/healthawareness/educationalcontent/diseases/hematology/pages/0010.aspx
- WHO — Anaemia  
  https://www.who.int/health-topics/anaemia
- Saudi MOH — Type 2 diabetes  
  https://www.moh.gov.sa/healthawareness/educationalcontent/diseases/diabetic/pages/008.aspx
- CDC — Symptoms of diabetes  
  https://www.cdc.gov/diabetes/signs-symptoms/index.html
- Saudi MOH — Dehydration during pilgrimage  
  https://www.moh.gov.sa/healthawareness/pilgrims-health/pages/dehydration.aspx
- NHS — Dehydration  
  https://www.nhs.uk/conditions/dehydration/
- Saudi MOH — Common cold  
  https://www.moh.gov.sa/healthawareness/educationalcontent/diseases/infectious/pages/common-cold.aspx
- Saudi MOH — Migraine  
  https://www.moh.gov.sa/healthawareness/educationalcontent/diseases/nervous-system/pages/migraine.aspx
- NHS — Common cold  
  https://www.nhs.uk/conditions/common-cold/
- NHS — Migraine  
  https://www.nhs.uk/conditions/migraine/
- American Red Cross — Burns  
  https://www.redcross.org/take-a-class/resources/learn-first-aid/burns
- American Red Cross — Life-threatening external bleeding  
  https://www.redcross.org/take-a-class/resources/learn-first-aid/bleeding-life-threatening-external
- American Red Cross — Adult/child choking  
  https://www.redcross.org/take-a-class/resources/learn-first-aid/adult-child-choking
- American Red Cross — Seizures  
  https://www.redcross.org/take-a-class/resources/learn-first-aid/seizures

## Required review before publication

For every item, an authorized medical reviewer should confirm:

- Arabic wording is clinically accurate and understandable.
- English translation matches the intended meaning.
- Care level and specialty are appropriate.
- Symptom relationships and core/supporting status are appropriate.
- Newly added symptoms (runny nose, sore throat, nasal congestion, sneezing, body aches, light sensitivity and sound sensitivity) should remain inactive until individually reviewed.
- Common-cold and migraine matching links that depend on the new symptoms should remain inactive until both the symptom and relationship are approved.
- Every symptom publication now requires at least one active linked medical source.
- First-aid instructions match the current source and local practice.
- Choking content is clearly limited to adult/child instructions and is not used as infant guidance.
- Emergency wording does not delay calling emergency services.
- Source links are still active and current.
- No medication dose or patient-specific treatment advice has been introduced.

Only after review should the normal governance workflow move content from draft to review/approval/publication.


## Draft smart follow-up questions

A small clarifier-question foundation has been added for the starter conditions. All questions and their rules remain inactive drafts.

### Migraine

Triggered only when migraine is already a candidate condition from a selected core symptom.

- Does light bother you more than usual during the headache? -> may confirm light sensitivity
- Do sounds bother you more than usual during the headache? -> may confirm sound sensitivity
- Is the headache accompanied by nausea? -> may confirm nausea

Sources:
- Saudi Ministry of Health — Migraine
- NHS — Migraine

### Common cold

Triggered only when common cold is already a candidate condition from a selected core symptom.

- Do you have a runny nose? -> may confirm runny nose
- Do you have a sore or irritated throat? -> may confirm sore throat

Sources:
- Saudi Ministry of Health — Common cold
- NHS — Common cold

### Dehydration

Triggered only when dehydration is already a candidate condition from a selected core symptom.

- Do you feel unusually or extremely thirsty? -> may confirm excessive thirst
- Are you urinating less than usual or is your urine dark? -> may confirm reduced/dark urine

Sources:
- Saudi Ministry of Health — Exposure to dehydration
- NHS — Dehydration

### Safety behavior

- Clarifier answers affect condition matching only.
- Clarifier-confirmed symptoms are deliberately not injected into the red-flag engine.
- At most four clarifier questions are shown in one public assessment.
- Questions already covered by the user's selected symptoms are skipped.
- Production requires the question, target symptom and candidate condition to be published and active before a clarifier rule can be activated.
- Every question remains traceable to a medical source.


## Draft source-backed safety / red-flag pack

A focused safety pack has been added for the most important public-checker symptoms. All new entities remain draft/inactive until authorized medical review.

### Headache

Draft safety questions:
- Did the headache start suddenly and become extremely severe or clearly different from usual?
- Is there new weakness/numbness or difficulty speaking, seeing, or walking?

Sources:
- Saudi Ministry of Health — Stroke
- NHS — Headaches

### Chest pain

Draft safety questions:
- Does the pain/discomfort spread to the arm, shoulder, back, neck, or jaw?
- Is it accompanied by shortness of breath, cold sweating, nausea, dizziness, or fainting?

Direct severe-chest-pain matching is also represented as an inactive source-backed red-flag rule.

Source:
- Saudi Ministry of Health — Heart attacks

### Shortness of breath

Draft safety questions:
- Is breathing difficulty severe enough that the person is gasping/choking or unable to say a full sentence?
- Is there blue/very pale skin or lips, or sudden confusion?

A severe shortness-of-breath symptom can also trigger the draft emergency rule after review.

Source:
- NHS — Shortness of breath

### Fainting

Draft safety questions:
- Has the person not fully recovered, or is there new difficulty speaking or moving?
- Was fainting associated with chest pain or a strong/irregular heartbeat?

Source:
- NHS — Fainting

### Vomiting

Draft safety questions:
- Is there blood in vomit or coffee-ground-like material? (emergency)
- Is vomiting continuing so fluids cannot be kept down? (urgent)

Sources:
- NHS — Vomiting blood
- NHS — Diarrhoea and vomiting

### Life-threatening external bleeding

A new explicit symptom draft has been added:

- Heavy or continuous bleeding

The source-backed red-flag rule remains inactive until the symptom and flag are medically reviewed and published.

Source:
- American Red Cross — Life-threatening external bleeding

### Red-flag safety architecture

- Draft/demo database red flags are ignored by the production red-flag engine.
- Published source-backed rules can only increase urgency.
- The deterministic legacy safety floor always remains active, so a partially published database rule set cannot remove existing chest-pain, breathing, fainting, sudden-headache, or severe-symptom protection.
- New clinical rules cannot be activated unless the referenced question/symptom/red flag (and candidate condition where relevant) is published, active, non-demo content.
- The original database trigger constraint has been aligned to permit the reviewed `condition_candidate` trigger type introduced by smart clarifiers.
