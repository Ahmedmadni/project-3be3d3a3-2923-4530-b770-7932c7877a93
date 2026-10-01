# SpO2 Draft Pack

This phase adds source-backed pulse-oximetry capture guidance and narrowly
scoped **Draft + Inactive** clinical rules.

## Source split

### FDA — device and capture quality
FDA material is used to model:
- pulse oximetry as an estimate rather than a diagnosis;
- the need to consider symptoms and how the person feels;
- warm/relaxed hand and removal of nail polish;
- keeping still and waiting for a stable reading;
- poor circulation, skin temperature, tobacco use and pigmentation-related
  accuracy limitations;
- the difference between medical-purpose devices and general-wellness devices.

The January 2025 FDA pulse-oximeter guidance remains a draft/non-binding
regulatory document. It is not used as a clinical threshold source.

### NHS England — context-specific pathway thresholds
The first numeric rules use an NHS acute respiratory home-monitoring pathway.
They are deliberately NOT modeled as universal SpO2 ranges.

The draft rules require:
- age >= 18;
- nonpregnant context;
- monitoring_pathway = acute_respiratory_home_monitoring;
- usual_spo2_below_95 = false;
- repeat confirmation for escalation thresholds.

This prevents the pathway from being applied to people whose usual baseline is
already below 95%, pregnancy-specific pathways, children, or generic wellness
readings.

## Draft rules

- >=95%: pathway reference only, no care-level assertion.
- 93-94% after repeat confirmation: Draft urgent escalation.
- <=92% after repeat confirmation: Draft emergency escalation.

All remain review_status=draft and is_active=false.

## Quality engine

`assessPulseOximeterCaptureQuality` marks a reading `questionable` when
capture conditions include:
- a device not intended for medical use;
- cold hand;
- nail polish present;
- movement;
- unstable reading;
- poor circulation;
- current tobacco use;
- unconfirmed signal quality.

The quality engine never changes the measured value and never diagnoses
hypoxemia.

## Deliberate exclusions

This pack does not yet define:
- pediatric thresholds;
- pregnancy-specific thresholds;
- chronic lung-disease personalized baselines;
- altitude-adjusted interpretation;
- supplemental-oxygen targets;
- exertional desaturation rules;
- treatment or oxygen-prescription advice.

Those require separate source-backed rule packs and medical review.
