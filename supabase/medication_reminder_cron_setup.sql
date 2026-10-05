-- Medication Reminder Cron Operator Script
-- Run only AFTER:
--   1) send-medication-reminders Edge Function is deployed;
--   2) Edge Function secrets include:
--        MEDICATION_REMINDER_CRON_SECRET
--        VAPID_PUBLIC_KEY
--        VAPID_PRIVATE_KEY
--        VAPID_SUBJECT
--   3) Supabase Vault contains:
--        project_url
--        medication_reminder_cron_secret
--      where medication_reminder_cron_secret matches the Edge Function secret.
--
-- No medication name, dose, or health detail is sent through pg_net.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
DECLARE
  project_url_value text;
  cron_secret_value text;
  existing_job_id bigint;
BEGIN
  SELECT decrypted_secret
  INTO project_url_value
  FROM vault.decrypted_secrets
  WHERE name = 'project_url'
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT decrypted_secret
  INTO cron_secret_value
  FROM vault.decrypted_secrets
  WHERE name = 'medication_reminder_cron_secret'
  ORDER BY created_at DESC
  LIMIT 1;

  IF project_url_value IS NULL OR length(btrim(project_url_value)) = 0 THEN
    RAISE EXCEPTION 'VAULT_PROJECT_URL_MISSING';
  END IF;

  IF cron_secret_value IS NULL OR length(btrim(cron_secret_value)) = 0 THEN
    RAISE EXCEPTION 'VAULT_MEDICATION_REMINDER_CRON_SECRET_MISSING';
  END IF;

  SELECT jobid
  INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'send-medication-reminders-every-minute'
  LIMIT 1;

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;

  PERFORM cron.schedule(
    'send-medication-reminders-every-minute',
    '* * * * *',
    format(
      $cron$
      SELECT net.http_post(
        url := %L || '/functions/v1/send-medication-reminders',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', %L
        ),
        body := jsonb_build_object('source', 'pg_cron'),
        timeout_milliseconds := 5000
      );
      $cron$,
      rtrim(project_url_value, '/'),
      cron_secret_value
    )
  );
END
$$;

SELECT
  jobid,
  jobname,
  schedule,
  active
FROM cron.job
WHERE jobname = 'send-medication-reminders-every-minute';
