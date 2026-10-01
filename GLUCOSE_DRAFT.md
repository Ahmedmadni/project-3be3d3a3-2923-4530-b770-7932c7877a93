# Blood Glucose Draft Pack

This phase adds source-backed glucose capture, unit normalization and narrowly
scoped interpretation drafts. No clinical glucose rule is active in production.

## Diagnostic safety boundary

Home glucose meters are not treated as diagnostic tests in this pack.

The ADA 2026 diagnostic criteria are represented only when:
- measurement_method = laboratory;
- sample_source = venous_plasma;
- the timing context matches the specific test.

The initial diagnostic draft rules are limited to nonpregnant adults.

In the absence of unequivocal hyperglycemia, ADA 2026 requires confirmatory
testing. The app must therefore present these as **diagnostic-range results**,
not as an automatic diagnosis.

## Unit normalization

The canonical unit is mg/dL.

mmol/L readings are converted using the glucose molecular-weight conversion:

mg/dL = mmol/L × 18.0182

The conversion changes the unit only. It does not change:
- sample source;
- fasting status;
- meal timing;
- diagnostic eligibility;
- pregnancy status;
- diabetes status.

## ADA 2026 draft ranges

For nonpregnant laboratory venous plasma:

### Fasting plasma glucose
- 100-125 mg/dL: prediabetes range.
- >=126 mg/dL: diabetes diagnostic range.

Fasting requires at least 8 hours with no caloric intake.

### 2-hour 75-g OGTT
- 140-199 mg/dL: prediabetes range.
- >=200 mg/dL: diabetes diagnostic range.

### Random plasma glucose
>=200 mg/dL is represented only when classic hyperglycemia symptoms are
explicitly present.

All of these remain Draft + Inactive.

## Hypoglycaemia

NHS guidance describes hypoglycaemia as usually below 4 mmol/L. The database
stores the equivalent threshold in the canonical unit (approximately
72.07 mg/dL).

The initial pack contains:
- a Draft reference rule for known diabetes with glucose below 4 mmol/L;
- a separate Draft emergency rule requiring both a low reading and explicit
  severe symptoms such as seizure, unconsciousness or abnormal responsiveness.

A low number alone does not activate emergency routing.

## Home-meter quality

FDA guidance is represented by `assessGlucoseCaptureQuality`.

For home meters it checks:
- supported meter;
- washed and dried hands;
- compatible strips;
- nonexpired/properly stored strips;
- sufficient blood sample;
- fingertip preference when glucose may be changing rapidly.

Any attempt to use a home capillary reading for diagnostic interpretation is
flagged as questionable.

## Deliberate exclusions

This pack does not yet define:
- gestational-diabetes thresholds;
- individualized glucose targets for known diabetes;
- insulin dosing or medication changes;
- CGM diagnostic rules;
- time-in-range targets;
- pediatric thresholds;
- DKA/HHS numeric routing;
- post-meal treatment targets;
- sick-day medication instructions.

Those require separate source-backed review scopes.
