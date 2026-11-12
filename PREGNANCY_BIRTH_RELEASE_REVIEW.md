# Pregnancy, labour and postpartum — priority review (2026-11-12)

## Scope delivered in this branch
- New bilingual, mobile-first tab for birth preparation, labour signs, maternal postnatal care, and first-month newborn care, with clinically urgent newborn signs separated from emergency ambulance signs.
- High-risk presentation **always above the inner tabs**, with explicit Saudi-only 997 quick dial using the central app configuration plus an alternative emergency page.
- Specific labour and postpartum dangers linked to NHS, NICE, CDC and the Saudi National Portal. Severity is descriptive; there is **no auto-triage** or reassurance algorithm.
- Session-only contraction recorder: length and start-to-start intervals, never a decision threshold or advice to stay home.
- Existing pregnancy stage, red flags, gestational dating and saved health history remain unchanged.
- Pregnancy guidance, visit schedules and specialist-care content render cards on small devices and tables on larger devices.
- The newborn section has no newborn health storage, automatic diagnosis or risk scoring; it includes sourced guidance for feeding changes, breathing, neurological signs, fever or hypothermia, bilious vomiting and early jaundice.

## Existing implementation reviewed
- Deterministic 280-day last-menstrual-period calculation, clinician-assigned due-date precedence, pregnancy-week education, food/medication reference tables, stage-independent danger signs, planned visits, daily entries (owner-scoped Cloud for signed-in users).
- Existing pregnancy educational copy already warns that local clinical review is outstanding.
- An existing tracked .env includes public/publishable Supabase connection keys, not a detected service-role key; keep auditing any new credential.
- PWA/web app and Cloud dependency are separate from a native Android build. This branch does not create an Android binary or confirm device-specific behavior.

## Guest-only backup restore extension
- A valid JSON backup can be restored manually during the current guest session, with versioned and legacy format support.
- Import does not upload to Supabase, save to browser storage, or alter a signed-in account.
- All rows validate before merge; original row IDs are discarded and duplicates are suppressed. Invalid, oversized or incompatible data is rejected.
- This is temporary guest data; users must export before leaving the tab, and manual import is not a substitute for verified persistent storage.

## Planner reliability extension
- Supabase paged retrieval replaces a silent `limit(200)`, preventing incomplete backups from being presented as complete.
- History and upcoming lists progressively render 12 cards per batch; card identity remains stable during edits, with form focus returned to the editing field.
- Account changes clear old owner-scoped pregnancy query caches; network failures in the next-appointment overview are explicit and retryable.
- Three regression tests added for multi-page export completeness, limit rejection, and partial-failure rejection.

## Appointment planner extension (same development branch)
- User-specific appointments are now modelled separately in additive SQL migration 0002 with RLS per owner and optional legacy next-date backfill.
- Guest mode has a temporary in-memory appointment list; owner cloud mode supports multiple visits, tests, status history, edit and deletion.
- Calendar reminder is only an explicitly downloaded, neutral .ics event (calendar import required). It does not piggyback on medication push or guarantee delivery.
- Connected Lovable production database now contains the newly applied appointments table with RLS enabled (confirmed 2026-11-12); the two-account cross-owner RLS matrix passed in isolated PostgreSQL 16 CI, while *production* account acceptance and real-device calendar checks remain unverified. The migration is versioned in both drizzle/migrations/0002 and supabase/migrations/20261112094600; see PREGNANCY_APPOINTMENTS_DEPLOYMENT.md.
- Explicit JSON export is an unencrypted private backup and its sensitivity is indicated in the UI.

## Required gates before treating as medically reviewed or shipping as a certified health feature
1. Obstetrician/midwife review of Arabic and English wording, conditions and emergency urgency for Saudi use and other target locales.
2. Verify emergency contact routing when outside Saudi Arabia; the quick dial explicitly applies to Saudi Arabia only.
3. Test actual small-screen rendering, RTL/LTR layout, accessibility, network failures, logged-out operation and link behavior on mobile browsers.
4. Run full Vitest and Vite build in CI, then manually test with a real device. No clinical accuracy conclusions can be drawn from passing code tests.
5. Obtain clinical approval and add clear content-review dates and an escalation policy before any claim of individualized medical recommendations.
6. Confirm production migrations, authentication and emergency fallback behavior separately; no migrations or patient data changed here.

## Follow-up priorities
- Obtain clinician review and approval for the new newborn danger-sign module; verify the advice and urgency labels on actual devices.
- Add appointment and birth-preparation checklists where each user explicitly opts into saving (never store pregnancy medical data in public local storage).
- Standardize review dates and source metadata for all pregnancy, postnatal and first-aid articles.
- Audit application-wide emergency routing, accessibility, reminder reliability and responsiveness.
