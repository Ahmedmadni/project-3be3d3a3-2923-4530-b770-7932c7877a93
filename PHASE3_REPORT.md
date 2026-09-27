# Phase 3 completion report — مؤشر صحي

Date: 2026-09-27

## Executive status

Phase 3 is technically operational. The application now has a governed medical-content administration layer, server-side AI-assisted symptom extraction, bilingual infrastructure, traceable result generation, and automated CI verification.

This report is a software-readiness report only. It is **not** a medical approval. The medical knowledge base and first-aid content remain subject to authorized medical review before production publication.

## 1. Admin dashboard

Available administration areas:

- Symptoms
- Possible conditions
- Dynamic questions
- Red flags
- First-aid topics
- Medical sources
- Users and roles
- Medical knowledge releases

The dashboard also includes a medical-content readiness panel showing:

- Published items
- Items in review / approved
- Draft or changes-requested items
- Sources due for verification
- Active conditions without linked sources
- Active red flags without linked sources
- Active first-aid topics without linked sources

These metrics are governance indicators and must not be treated as medical approval.

## 2. Roles and authorization

Supported roles:

- user
- content_editor
- medical_reviewer
- admin
- super_admin

Database RLS and database functions are the enforcement layer; hiding controls in the frontend is not considered sufficient authorization.

Role management prevents users from changing their own roles. Admins can grant/revoke editor and medical-reviewer roles; super admins have broader role-management authority.

## 3. Medical review workflow

The governed workflow is:

draft → in_review → approved → published

with support for:

- changes_requested
- retired
- restoration to draft when permitted

Demo content cannot be approved or published.

The system can require creator and reviewer to be different users through the `require_distinct_reviewer` setting.

Published governed content is not edited in place; changes are prepared as a new draft version.

## 4. Versioning and traceability

Version history is implemented with `content_versions`.

Knowledge releases are versioned separately using `knowledge_releases`, for example:

`2026.09.0-demo`

Completed symptom sessions preserve:

- engine version
- knowledge release ID/version
- ruleset version
- condition version

Historical results are therefore not silently recomputed when the knowledge base changes.

## 5. Audit trail

Administrative content mutations are recorded in `audit_logs`.

Audit records include administrative actions such as:

- create
- update
- submit_review
- request_changes
- approve
- publish
- retire
- restore
- role grant/revoke

The administrative audit trail does not intentionally record patient free text or symptom-session answers.

## 6. Medical sources

The medical source library supports metadata including:

- organization
- URL
- source type
- language
- country
- organization type
- evidence level
- publication date
- last verification date
- next review/expiry date

Source links are supported for conditions, questions, red flags, and first-aid topics.

The admin readiness panel now surfaces missing source coverage.

## 7. AI symptom extraction

AI extraction is server-side.

Its scope is strictly:

Free text → candidate symptoms from the existing symptom catalog.

It does not:

- diagnose
- rank diseases
- set care level
- prescribe treatment
- recommend medication or doses
- override the RedFlagEngine

Model output is validated through a strict schema and then validated again against the existing symptom catalog.

Unknown codes are rejected and moved to unresolved terms.

Negated symptoms are not automatically selected.

The user must confirm extracted candidate symptoms before they enter the assessment.

A deterministic mock extractor remains available as a fallback/test implementation.

## 8. AI privacy and abuse controls

The AI request receives only:

- symptom-description text
- the fixed symptom catalog needed for mapping

It does not receive the user's:

- name
- email
- phone
- account ID
- profile metadata

The AI request is configured with `store: false`.

Rate limiting is applied to IP and guest/user buckets.

Prompt-like instructions inside patient text are treated as untrusted data.

The extraction path does not log the patient's medical text.

## 9. Internationalization

Arabic and English infrastructure is active.

Implemented:

- RTL/LTR switching
- stored language preference
- account profile language preference
- no silent Arabic fallback for missing English medical content
- bilingual symptom checker controls
- bilingual result page
- bilingual match/care badges
- bilingual result explanations
- bilingual emergency screen
- bilingual first-aid listing/detail
- bilingual condition detail presentation where translated medical fields exist

Medical translations are not automatically considered medically reviewed.

Some non-clinical/admin pages can still contain Arabic-only labels and can be migrated incrementally.

## 10. Safety pipeline

The execution order remains:

1. collect symptoms
2. collect symptom details
3. dynamic follow-up questions
4. RedFlagEngine
5. stop normal matching when emergency is detected
6. emergency screen
7. ConditionMatchingEngine when not emergency
8. results

Red flags always run before condition matching.

Production matching has been tightened so only `published` conditions can be considered by the condition-matching engine.

No numeric disease probability is shown to the user.

## 11. Automated verification

GitHub Actions now runs on changes to `main`.

Current verification commands:

- `bun install --frozen-lockfile`
- `bunx vitest run`
- `bun run build`

Current suite:

- 20 original engine tests
- 13 Phase 3 governance / AI / i18n safety tests
- 33 tests total

The latest observed runs pass both the test suite and production build.

## 12. Important issue found and fixed

The Arabic mock symptom extractor originally normalized text before punctuation splitting. A word ending with Arabic taa marbuta immediately before punctuation could then fail catalog matching.

The failure was detected by CI through the new Arabic-negation test.

The extractor now normalizes each clause again after splitting, and the full CI suite passes.

## 13. Demo / unreviewed data

The application still has a development knowledge mode.

Demo medical content must remain visually marked and cannot be approved or published through the governance workflow.

Before a public production launch:

- switch content policy to production
- ensure required clinical content is published
- create a non-demo medical knowledge release
- complete medical review
- complete source verification

## 14. Medical review still required

Technical completion does not validate clinical correctness.

The following require authorized medical review before production publication:

- condition descriptions
- condition/symptom relationships and weights
- red-flag rules
- dynamic clinical questions
- first-aid protocols
- care-level guidance
- professional clinical content
- translations of medical content

## 15. Remaining engineering work

Highest-priority next items:

1. Finish governance/versioning for the actual first-aid section bodies, not only their parent topics.
2. Add a publication-readiness guard so high-risk medical content cannot be published without required source coverage.
3. Finish remaining Arabic-only non-clinical/admin interface strings.
4. Add a production-release checklist that blocks demo knowledge from a production release.
5. Build Phase 4 medical knowledge authoring/import workflow.
6. Populate real medical content only from traceable sources and route it through medical review.

## 16. Production decision

The software foundation is ready for continued development and controlled medical-content review.

It should **not** be presented as a medically validated diagnostic product while the knowledge base is still demo/unreviewed.
