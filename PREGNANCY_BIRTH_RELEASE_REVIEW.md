# Pregnancy, labour and postpartum — priority review (2026-11-12)

## Scope delivered in this branch
- New bilingual, mobile-first tab for birth preparation, labour signs and postnatal care.
- High-risk presentation **always above the inner tabs**, with explicit Saudi-only 997 quick dial using the central app configuration plus an alternative emergency page.
- Specific labour and postpartum dangers linked to NHS, NICE, CDC and the Saudi National Portal. Severity is descriptive; there is **no auto-triage** or reassurance algorithm.
- Session-only contraction recorder: length and start-to-start intervals, never a decision threshold or advice to stay home.
- Existing pregnancy stage, red flags, gestational dating and saved health history remain unchanged.
- Pregnancy guidance and visit schedules render cards on small devices and tables on larger devices.

## Existing implementation reviewed
- Deterministic 280-day last-menstrual-period calculation, clinician-assigned due-date precedence, pregnancy-week education, food/medication reference tables, stage-independent danger signs, planned visits, daily entries (owner-scoped Cloud for signed-in users).
- Existing pregnancy educational copy already warns that local clinical review is outstanding.
- An existing tracked .env includes public/publishable Supabase connection keys, not a detected service-role key; keep auditing any new credential.
- PWA/web app and Cloud dependency are separate from a native Android build. This branch does not create an Android binary or confirm device-specific behavior.

## Required gates before treating as medically reviewed or shipping as a certified health feature
1. Obstetrician/midwife review of Arabic and English wording, conditions and emergency urgency for Saudi use and other target locales.
2. Verify emergency contact routing when outside Saudi Arabia; the quick dial explicitly applies to Saudi Arabia only.
3. Test actual small-screen rendering, RTL/LTR layout, accessibility, network failures, logged-out operation and link behavior on mobile browsers.
4. Run full Vitest and Vite build in CI, then manually test with a real device. No clinical accuracy conclusions can be drawn from passing code tests.
5. Obtain clinical approval and add clear content-review dates and an escalation policy before any claim of individualized medical recommendations.
6. Confirm production migrations, authentication and emergency fallback behavior separately; no migrations or patient data changed here.

## Follow-up priorities
- Add a clinically reviewed newborn danger-sign module.
- Add appointment and birth-preparation checklists where each user explicitly opts into saving (never store pregnancy medical data in public local storage).
- Standardize review dates and source metadata for all pregnancy, postnatal and first-aid articles.
- Audit application-wide emergency routing, accessibility, reminder reliability and responsiveness.
