# Respiratory Rate Draft Pack

This phase adds source-backed adult resting respiratory-rate capture and
interpretation drafts. No respiratory-rate clinical rule is active in
production.

## Capture comes before interpretation

Respiratory rate is especially sensitive to observation conditions. The
capture-quality engine checks:

- true resting state;
- relaxed state;
- a full 60-second count;
- whether the person was aware that breathing was being counted;
- recorded rhythm;
- recorded depth;
- documented presence or absence of respiratory distress.

Health Education England / NHS training guidance advises counting for a full
minute and noting pattern/depth. It also notes that awareness of observation
can alter breathing.

## Initial adult resting reference

The first reference pack uses 12-16 breaths/min as a common adult resting range
from the NHS/HEE training guide.

The app stores three Draft interpretations:
- 12-16: within common resting reference;
- <12: below common resting reference;
- >16: above common resting reference.

These have **no care level**. A number outside that range is not automatically
treated as an emergency or as a diagnosis.

## Why NEWS2 is not generalized here

Royal College of Physicians NEWS2 is registered as a source because it is a
validated acute-care scoring system and includes respiratory rate.

However, NEWS2 is designed for patients in acute/hospital monitoring and uses an
aggregate score across multiple physiological parameters. This pack therefore
does not copy NEWS2 bands into a universal consumer rule.

## Emergency routing is symptom-led

NHS shortness-of-breath guidance treats severe breathing difficulty as an
emergency, including examples such as gasping, choking, or being unable to get
words out, and other danger signs.

The Draft measurement red flag therefore depends on explicit severe breathing
difficulty and emergency respiratory symptoms. It does not depend on a numeric
respiratory-rate cutoff.

## Initial population scope

The first rules are limited to:
- adults age 18 or older;
- explicitly nonpregnant users;
- resting measurements.

## Deliberate exclusions

This pack does not yet define:
- pediatric age-band respiratory rates;
- pregnancy-specific respiratory interpretation;
- exercise respiratory-rate targets;
- COPD personalized baselines;
- oxygen-therapy targets;
- sleep respiratory-rate interpretation;
- NEWS2 clinical escalation;
- sepsis scoring;
- asthma severity scoring.

Those require separate source-backed review scopes.
