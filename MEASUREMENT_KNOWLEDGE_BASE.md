# Measurement Knowledge Base

The measurement engine now has a first-party knowledge layer intended to keep
the user's clinical-education journey inside the application.

## Product goal

External medical sources are provenance and review inputs, not required user
navigation. Source-backed facts are transformed into structured, localized
content that can be reviewed and published inside the app.

## Data model

### measurement_knowledge_articles
Versioned content units scoped to:
- a measurement type;
- an audience: general or professional;
- the existing medical review workflow.

### measurement_knowledge_sections
Ordered sections such as:
- overview;
- how to measure;
- common errors;
- what it means;
- when to repeat;
- warning signs;
- special context;
- limitations.

### measurement_knowledge_sources
Many-to-many provenance links with roles:
- primary;
- supporting;
- safety;
- capture.

## Governance

Production visibility requires:
- Published review status;
- Active;
- Non-demo;
- Published + active parent measurement type;
- At least one active medical source.

Sections under a published article are immutable. Corrections create a new
article version rather than silently changing published medical content.

## Initial Arabic drafts

The first internal knowledge drafts cover:
- blood pressure;
- SpO2 / pulse oximetry;
- body temperature;
- pulse / heart rate;
- blood glucose;
- respiratory rate.

They are paraphrased, source-backed drafts and remain inactive until medical
review.

## UI contract

The client selector returns one bundle:
- article;
- ordered sections;
- provenance links.

Production cannot see Draft content. Development/staff preview can display an
active Draft for review.

## Next

1. Add professional-audience versions with more technical detail.
2. Add Weight / Height / BMI.
3. Build the unified Health Measurements UI.
4. Add trend cards, quality badges, repeat-measurement guidance and an optional
   references drawer without requiring external navigation for core content.
