# Pregnancy appointment planner — rollout and privacy checklist (2026-11-12)

## What is implemented

- In the Pregnancy Tracker, **My appointments** adds multiple visits, tests, optional vaccinations and other appointments, with date, optional local time and private notes.
- The owner can add, edit, complete, cancel, restore, delete and review upcoming/past visits.
- Authenticated user data uses a new `pregnancy_appointments` table. All four CRUD RLS policies require `auth.uid() = user_id`; the table is not granted to anonymous users.
- Signed-out users can try temporary appointments **only for the mounted tab session**. Nothing is persisted to the browser or another user's account.
- Importing the generic on-demand `.ics` file into the user's preferred calendar may show an optional 24-hour alarm, depending on that calendar's behavior and permissions. This is **not automatic push**, does not use the medication reminders scheduler and is never critical medical alerting.
- Explicit JSON backup contains health-related titles/notes in a local **unencrypted** file. The UI warns to secure it.
- Guest-only **manual JSON restore** reads the file entirely in the browser and never sends it to the server. It accepts legacy backups and versioned `health-appointments-v1` exports, validates every row before making any change, regenerates IDs and merges duplicates. The import is capped at 16 MiB and 5,000 entries.
- Imported guest data is **not** durable and is not migrated automatically to the signed-in account. The user must export a backup before changing accounts or leaving the current tab.
- One legacy `pregnancy_tracking.next_appointment` date per owner is copied during the additive migration if a same-day visit does not already exist.

## Critical deployment dependency

**Live database update on 2026-11-12:** the SQL statements were applied through the connected Lovable Cloud database action. Read-only verification confirmed `public.pregnancy_appointments` exists, RLS is enabled and it initially had zero records. A later read-only verification confirmed all four owner-scoped policies (SELECT/INSERT/UPDATE/DELETE), no SELECT/INSERT privileges for the anonymous role, and authenticated-role privileges governed by RLS. Cross-owner CRUD with real signed-in application accounts still requires acceptance testing before release.

For other project environments or disaster recovery, review actual migration history and apply only:

`supabase/migrations/20261112094600_pregnancy_appointments.sql (same SQL as drizzle/migrations/0002_pregnancy_appointments.sql)`

Use the authorized **SQL editor or the controlled migrations process** for the connected project. Do not run blind `drizzle-kit push` because the local Drizzle schema file is intentionally empty and other historic migration versions may not be reconciled.

Do **not** expose the new signed-in planner in production until RLS owner/non-owner testing is completed with synthetic accounts. The table exists and RLS is on; app-level access and schema permissions still require verification. When the network or table access fails, the interface shows an explicit error/retry rather than claiming records have been saved.

### Read-only verification after deploying the SQL (passed in connected Lovable DB on 2026-11-12)

```sql
SELECT to_regclass('public.pregnancy_appointments') AS appointments_table;

SELECT relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE oid = 'public.pregnancy_appointments'::regclass;

SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'pregnancy_appointments'
ORDER BY policyname;

SELECT has_table_privilege('anon', 'public.pregnancy_appointments', 'SELECT') AS anon_can_select,
       has_table_privilege('authenticated', 'public.pregnancy_appointments', 'SELECT') AS authenticated_can_select;
```

CI now also executes the exact Supabase migration against a fresh PostgreSQL 16 service with two synthetic account IDs, checking anonymous denial, account-isolated SELECT/INSERT/UPDATE/DELETE, and the legacy-date backfill; this job passed on 2026-11-12. This does **not** substitute for real owner tests in the connected Lovable project.

The expected policy set has separate SELECT/INSERT/UPDATE/DELETE policies for role authenticated and owner checks. Run real owner/non-owner CRUD attempts with two authorized **synthetic test accounts**; static SQL checks are not a substitute for access-control testing. No real patient data should be used during smoke tests.

## Acceptance checks

1. Signed-out visitor adds/edits a test appointment; navigating away and back drops it, and no localStorage/sessionStorage health records appear.
2. Signed-in user adds two appointments on one day with different times; reload shows both, earliest first. Editing, completion, cancellation, restoration and deletion survive a reload.
3. Another account must not read, mutate, or remove the first account's records.
4. Losing the network must produce an honest save/load error, never a false success banner.
5. Prior `next_appointment` dates are backfilled once; the legacy column remains in the database for compatibility but its old edit field has been removed from the profile form. All new scheduling uses My appointments.
6. Calendar export uses the **neutral** event name and does not expose the appointment title or notes, including in metadata. Verify the date/time, alert behavior and local time zone on iOS/Android calendar applications.
7. The backup is generated only after explicit user action and is visibly marked unencrypted. Manual guest restore must reject malformed files in full, preserve existing guest items on failure, and avoid server/network requests. Retrying the same backup must not duplicate records. Verify >200 appointments are fetched in stable pages and exported completely; backend errors or a >5,000-record limit must prevent a falsely complete backup.
8. Check RTL/LTR tab layouts and zoom at 320/360/390/768/1024 px; verify keyboard navigation and touch targets. Verify edit focuses the top form and the list expands 12 cards at a time without remounting cards after each keystroke.
9. Emergency content remains accessible without login, even if the appointment database is offline. Do not show an empty next-appointment summary after a failed fetch; show a retry instead.
10. On sign-out or switching to another account, remove previous-owner appointment, daily-note and pregnancy-profile query caches from in-memory React Query state.

## Deliberately not yet activated

- Server-delivered pregnancy reminders and pregnancy examination/vaccination scheduling automation: medication scheduler operates a different domain and needs purpose-specific review and push deduplication before reuse.
- Automated clinical recommendations, risk scores or claims that a missed appointment is medically safe.
- Medical content approval: a qualified Saudi obstetric/neonatal reviewer and real-phone testing remain required before claims of medical certification.
