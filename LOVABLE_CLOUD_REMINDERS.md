# Lovable Cloud — medication reminder operations and physical-device test

**Current deployment target:** Lovable Cloud (database, Secrets, Edge Functions, Jobs, preview, and published app). Do not instruct the operator to open a separate Supabase dashboard, run Supabase CLI, apply SQL migrations, or enable pg_cron for this deployment.

**Source of truth for runtime readiness:** Lovable Cloud configuration, **actual Job execution history**, Edge Function logs, browser registration, and one successful test notification. CI/build success by itself does not prove delivery.

## Architecture

1. Lovable Cloud **Jobs** invokes `POST /api/public/jobs/send-medication-reminders` once per minute. This route uses managed bearer authorization (`authenticateCronRequest`); it must return 401 for missing/invalid authorization.
2. That server-side route reads `MEDICATION_REMINDER_CRON_SECRET` from the server environment and forwards a protected POST to `/functions/v1/send-medication-reminders` with `x-cron-secret`.
3. The Edge Function must reject missing/invalid `x-cron-secret` with HTTP 401 before privileged operations. `GET /functions/v1/send-medication-reminders` returns **only** the public VAPID key; it may be publicly readable.
4. The browser obtains the public key from that GET endpoint before `PushManager.subscribe`, and stores the resulting endpoint through the authenticated `claim_web_push_subscription` RPC. The subscription owner guard must remain in place.
5. For a due schedule, the sender checks already-recorded dose events and reserves delivery records with a unique occurrence/subscription key before sending a **generic** notification. No medication or dose is included in the push payload or lock-screen text.

## Secrets and safeguards

- `MEDICATION_REMINDER_CRON_SECRET`: server/Edge Function only. Never expose it to the browser, logs, GitHub, or support chats.
- `VAPID_SUBJECT`: operator-controlled `mailto:` contact.
- The sender prefers `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` when **both** are set; otherwise it can derive a stable key pair from a high-entropy `VAPID_KEY_SEED` held server-side. Check the deployed function's actual behavior; **do not replace either the explicit pair or the seed casually**, as replacing the key used for prior subscriptions can require re-subscription.
- The browser only receives the **public** VAPID key.
- Lovable Cloud's bearer cron token is managed separately from `MEDICATION_REMINDER_CRON_SECRET`. Do not confuse the two authentication hops.
- No Supabase Vault secret, SQL scheduler, or `pg_cron` job is required in the **current Lovable Cloud deployment**. `supabase/medication_reminder_cron_setup.sql` and older Vault directions are **legacy**, not instructions to execute for this deployment.
- Leave legacy secrets untouched until live delivery and rollout are verified; rotate/delete them through Lovable's controlled secret management later, not by copying secret values to SQL or chats.

## Operator verification BEFORE publishing or sending

From **Lovable Cloud → Jobs**:
- Confirm **exactly one** active every-minute reminder job is present.
- Read at least **one completed execution result** for the job. A job being listed as active is not proof that it has run.
- Confirm the last status is successful, and the job did not produce a 401, 403, 404, or 5xx error. Use timestamps and response **status/counters only**; never paste tokens or sensitive data.
- If no execution appears, inspect job logs, handler URL, HTTP method, cloud authentication, and the Edge Function's response before testing a phone. Do not add a duplicate job.

From **Lovable Cloud → Edge Functions / logs**:
- Confirm the function is deployed and its GET public-key response is a usable VAPID public key.
- Confirm unauthorized POST requests are rejected (done in prior Lovable testing; retest after auth changes).
- If permitted, use the existing protected `dry_run=1` mode to verify that server config and VAPID initialization succeed **without sending a notification**. Never expose `x-cron-secret` in browser tests or chat.
- Confirm client and server deployments are from the same reviewed revision.

## Physical-device smoke test

Use an **isolated consenting test account** and fictitious test medicine/schedule, never real patient records.

1. **Publish** the latest verified Lovable app, then visit its HTTPS URL on a real device. If on iPhone, add the site to the Home Screen using Safari and open the installed web app before requesting push permission. On Android, use a supported modern browser and allow notifications; installing the PWA is preferred.
2. Sign in as the test user. Open the medication schedule and enable **background reminders** from a direct user gesture; accept the browser's notification permission request. Verify the user gets a subscription (not just browser permission).
3. Add a **fictional test** medication/schedule with a reminder due **3–5 minutes ahead** in the device's local timezone, with the correct day of the week and reminder enabled. Do not enter a real medication name or dosage.
4. Lock the phone or switch away from the app and wait. Confirm exactly **one** generic `مؤشر صحي` notification; it must not show any drug name, dose, or personal health content.
5. In Lovable Cloud Job/Edge Function logs and the app's reliability view, verify the corresponding invocation, delivery record and status. Avoid logging health or endpoint values.
6. Verify a subsequent job tick does **not** deliver a duplicate for the same scheduled occurrence.
7. Create another future **test** occurrence, mark it Taken/Skipped **before** it becomes due, and confirm no notification is sent for that recorded occurrence.
8. Turn background reminders off and confirm future test occurrences no longer send pushes. Clean up test records afterward.

**Expected result:** scheduled invocation success + authenticated function success + subscription registered + one delivery record marked sent + **one actual device notification**, no duplicate, no sensitive text, recorded occurrence suppressed.

## Failure triage

| Symptom | Check first |
|---|---|
| Job listed but no execution history | Cloud Jobs scheduler, deployed/published revision and job handler route |
| Job returns 401 | Job bearer auth (proxy) or `x-cron-secret` (Edge Function); distinguish the hop, do not share values |
| Job returns 404 | Exact route/Edge Function URL; method should be POST |
| Job returns 503 | Server secrets or VAPID config on the current deployment |
| GET public key works but no subscription | Browser permissions, HTTPS, service worker readiness, device/PWA support, logged-in test account |
| Subscription exists but no push | Due time/timezone/weekdays, active fictional medication, actual job runs, delivery logs, Web Push provider response |
| Delivery marked sent but phone silent | OS notification permission, browser/device policies, service worker, locked screen, network delivery (provider acceptance is not device receipt) |
| Duplicate or private text appears | Stop rollout and investigate before real users enable reminders |

**Do not mark background reminders as production-delivery verified until this smoke test passes.**
