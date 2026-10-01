# Temperature Draft Pack

This phase introduces source-backed temperature capture rules and adult
interpretation drafts. No clinical temperature rule is active in production.

## Core design rule: unit conversion is not route conversion

The app may convert Celsius and Fahrenheit because that is an exact physical
unit transformation:

- C = (F - 32) × 5 / 9
- F = C × 9 / 5 + 32

The app must **not** add or subtract a fixed amount to translate an oral,
axillary, tympanic, temporal or rectal temperature into another route.

CDC/NHSN states that there are no research-based guidelines for route-based
temperature conversion. The recorded route is preserved and trends should
prefer the same route.

## Sources

### NHS — adult fever
The NHS adult fever page is used for:
- a Draft adult high-temperature threshold of 38°C or above;
- oral digital thermometer technique;
- axillary digital thermometer use;
- tympanic/ear thermometer use.

### NHS — hypothermia
The NHS hypothermia page is used for a Draft safety rule below 35°C. NHS
describes hypothermia as a medical emergency.

### CDC/NHSN — measurement route
CDC/NHSN is used specifically to prohibit route-based temperature conversion.

## Initial population scope

The first clinical rule pack is limited to:
- adults age 18 or older;
- explicitly nonpregnant users;
- oral, axillary or tympanic readings.

Pregnancy and pediatrics are deferred to separate source-backed packs because
care escalation is population-specific.

## Capture context

Temperature readings can record:
- measurement_site;
- previous_measurement_site;
- device_type;
- whether the device is supported;
- recent food/drink for oral readings;
- confirmed ear technique;
- confirmed skin contact for axillary readings.

A change in measurement route makes a trend `questionable`; it is not silently
normalized.

## Draft clinical rules

- >= 38°C: Draft adult high-temperature reference rule.
- < 35°C: Draft adult hypothermia emergency rule.

Both remain `review_status=draft` and `is_active=false`.

## Deliberate exclusions

This pack does not yet activate or generalize:
- infant/neonatal fever rules;
- child age-band escalation;
- pregnancy-specific escalation;
- immunocompromised/neutropenic fever rules;
- post-operative fever rules;
- heat-stroke/hyperthermia rules;
- route-specific pediatric thresholds;
- antipyretic treatment advice.

Each requires its own source-backed review scope.
