# Background medication reminders

This feature sends generic Web Push reminders for medication times explicitly
entered by the user. Push payloads and operating-system notifications do not
contain medication names, dose text, diagnoses, measurements, or other health
details.

## Required configuration

Generate one VAPID key pair and keep the private key server-side only.

Client build environment:

- `VITE_VAPID_PUBLIC_KEY` = public VAPID key

Supabase Edge Function secrets:

- `VAPID_PUBLIC_KEY` = the same public VAPID key
- `VAPID_PRIVATE_KEY` = private VAPID key
- `VAPID_SUBJECT` = a contact URI such as `mailto:admin@example.com`
- `MEDICATION_REMINDER_CRON_SECRET` = a long random secret

The function also uses Supabase-provided `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`.

## Deployment order

1. Apply `20261004184500_background_push_reminders.sql`.
2. Configure the Edge Function secrets.
3. Deploy `send-medication-reminders`.
4. Add the matching cron secret and project URL to Supabase Vault.
5. Run `supabase/medication_reminder_scheduler.sql`.
6. Configure `VITE_VAPID_PUBLIC_KEY` in the web app build environment and
   redeploy the app.
7. A signed-in user enables background reminders from the medication screen.

## Privacy and safety

- The service worker ignores push payload content and displays a hard-coded
  generic notification.
- The server does not send a reminder if that scheduled occurrence already has
  a recorded taken/skipped event.
- A past occurrence with no action stays `unrecorded`; it is not clinically
  inferred to be a missed dose.
- Expired push endpoints are disabled after HTTP 404/410 responses.
- Delivery rows deduplicate a schedule + browser subscription + scheduled time.
