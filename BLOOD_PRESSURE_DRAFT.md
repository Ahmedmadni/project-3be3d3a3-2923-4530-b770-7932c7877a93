# Blood Pressure Draft Pack

This phase adds source-backed **drafts**, not production clinical logic.

## Sources

Primary classification source:
- 2025 AHA/ACC High Blood Pressure Guideline (published 14 Aug 2025).

Capture-quality / home-monitoring source:
- American Heart Association Home Blood Pressure Monitoring guidance
  (last reviewed 14 Aug 2025).

The 2025 guideline replaced the 2017 ACC/AHA guideline while retaining the
adult BP category cutoffs used by the draft rules.

## Population scope

The first rule pack is intentionally limited to:
- age >= 18;
- explicitly nonpregnant.

Pregnancy is excluded because the 2025 guideline provides separate pregnancy
categories and management considerations. Pediatric BP is also excluded.

## Draft reference rules

The database stores draft, inactive rules for:
- normal;
- elevated;
- stage 1;
- stage 2;
- severe hypertension.

Priority is used to select the primary classification where category predicates
can overlap because one component is in a lower category while the other is in
a higher category.

No rule is production-visible until the existing governance workflow approves,
publishes and activates it.

## Draft emergency rule

A separate Draft + Inactive measurement red-flag rule requires both:
1. a severely elevated reading; and
2. explicit presence of emergency warning symptoms.

This is deliberately separate from a high reading without symptoms. The
measurement engine must not infer symptoms from a number.

## Measurement-quality gate

`assessBloodPressureCaptureQuality` checks capture technique such as:
- validated upper-arm device;
- correct cuff size;
- at least five minutes of quiet rest;
- supported back;
- feet flat and legs uncrossed;
- supported arm at heart level;
- bare-skin cuff placement;
- no talking;
- no smoking, caffeine or exercise within the prior 30 minutes.

These checks flag a reading as `questionable`; they do not diagnose,
reclassify or automatically discard the reading.

## Next review gate

Before activation, a medical reviewer should explicitly confirm:
- population scope;
- exact boundary operators;
- mixed systolic/diastolic category precedence;
- emergency symptom list and routing wording;
- repeat-measurement workflow for very high readings;
- pregnancy-specific separation;
- whether local Saudi clinical guidance should supersede or complement the
  AHA/ACC classification in the user-facing product.
