# Pulse / Heart Rate Draft Pack

This phase adds source-backed resting-pulse capture and interpretation drafts.
All clinical rules remain Draft + Inactive.

## Why resting state matters

A pulse number must not be interpreted without context.

AHA describes resting heart rate as the heart rate when a person is not
exercising and is sitting or lying, calm and feeling well. For most adults,
60-100 bpm is a common resting reference range.

The app therefore records whether the reading was:
- resting;
- during exercise;
- post-exercise;
- during sleep;
- unknown.

The initial rules only apply to awake resting readings.

## Low resting pulse

AHA notes that a resting heart rate below 60 bpm can meet a bradycardia
definition, but also that rates below 60 can occur during sleep, in athletes
and physically active adults, and with some medications.

The draft therefore stores athlete/high-activity and rate-affecting-medication
context and does not equate a low number with disease.

## High resting pulse

AHA describes a resting heart rate over 100 bpm as tachycardia while also
emphasizing age, health status and physical condition.

The initial >100 bpm rule is an interpretation draft only. It has no care level
and cannot independently trigger emergency routing.

## Emergency routing is symptom-led

NHS guidance for heart palpitations advises emergency care when palpitations
are ongoing and accompanied by:
- chest pain;
- shortness of breath;
- feeling faint;
- fainting.

The draft red-flag rule therefore depends on explicit symptom context and not
on a numeric pulse threshold.

## Capture quality

`assessPulseCaptureQuality` checks:
- true resting state;
- calm state;
- recent exercise;
- 60-second manual count;
- supported device when device-measured;
- recorded rhythm regularity;
- sitting or lying position.

It flags questionable capture but never diagnoses arrhythmia.

## Deliberate exclusions

This pack does not yet define:
- exercise target zones;
- pediatric pulse ranges;
- pregnancy-specific pulse interpretation;
- atrial fibrillation detection;
- wearable-device rhythm classification;
- medication-specific pulse targets;
- individualized athlete baselines;
- orthostatic pulse-change interpretation.

Those require separate source-backed review scopes.
