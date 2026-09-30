# Health Measurements Foundation

This phase introduces the measurements architecture without publishing clinical
thresholds.

## Safety boundary

The measurement layer is intentionally separate from symptom matching:

```
Measurement capture
  -> validation / unit normalization gate
  -> reviewed measurement safety rules
  -> reviewed reference rules
  -> care-routing signal
```

A numeric reading is not converted into a symptom and is never treated as a
diagnosis by this layer.

## Database model

- `measurement_types` — measurement metadata and capture schema.
- `measurement_readings` — user-owned readings protected by RLS.
- `measurement_sources` — traceability from a measurement type to reviewed
  medical sources.
- `measurement_reference_rules` — source-backed interpretation predicates.
- `measurement_red_flags` — source-backed safety predicates.

All catalog entries seeded by the migration are **Draft + Inactive**. No
reference range, diagnostic cutoff, urgent threshold, or emergency threshold is
seeded.

## Release gates

A measurement type cannot become active unless it is Published, non-demo, and
has at least one active medical source.

A reference rule or red-flag rule cannot become active unless:

1. the rule is Published and non-demo;
2. its parent measurement type is Published + Active + non-demo; and
3. its linked medical source is active.

Production engine evaluation also enforces Published + Active + non-demo and
requires a source id.

## Units

The engine does not silently convert units. A scalar reading supplied in an
allowed but non-canonical unit returns `needs_normalization`, so future unit
conversion can be explicit and testable before any threshold comparison.

This matters especially for temperature and blood glucose.

## Safety floor

`evaluateMeasurement` accepts `safetyFloorRules` separately from database
rules. This mirrors the existing symptom safety-floor principle: once reviewed
measurement safety rules are deliberately promoted into the code-defined floor,
a partial database load must not silently remove them.

This phase ships with **zero real safety-floor thresholds**.

## Seeded capture types

The migration seeds only structural, inactive definitions for:

- Blood pressure
- Oxygen saturation
- Temperature
- Pulse
- Blood glucose
- Weight
- Height
- BMI
- Respiratory rate

The next clinical phase should start with blood pressure by attaching
authoritative sources, creating Draft rules, reviewing them, testing them, and
only then publishing/activating them.
