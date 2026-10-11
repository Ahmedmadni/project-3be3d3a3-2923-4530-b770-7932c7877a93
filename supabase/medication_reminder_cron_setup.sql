-- Canonical medication reminder cron operator script.
-- Apply only after the push migration and Edge Function have been deployed.
-- The job reads Vault secrets at RUN TIME. Never interpolate secrets into
-- cron.job.command: that would expose long-lived credentials to job readers.
--
-- Required Vault keys:
--   project_url (preferred; medication_reminder_project_url is a legacy alias)
--   medication_reminder_cron_secret
-- The cron secret must match MEDICATION_REMINDER_CRON_SECRET on the Edge Function.
-- Re-running this script replaces the canonical and legacy reminder jobs.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $operator$
DECLARE
  project_url_value text;
  cron_secret_value text;
  old_job record;
BEGIN
  SELECT decrypted_secret
  INTO project_url_value
  FROM vault.decrypted_secrets
  WHERE name IN ('project_url', 'medication_reminder_project_url')
  ORDER BY (name = 'project_url') DESC, created_at DESC
  LIMIT 1;

  SELECT decrypted_secret
  INTO cron_secret_value
  FROM vault.decrypted_secrets
  WHERE name = 'medication_reminder_cron_secret'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Fail closed if this operator is pointed at a different Supabase project.
  IF project_url_value IS NULL
     OR rtrim(project_url_value, '/') <> 'https://soyrodrsjzgdqsjaxjfk.supabase.co' THEN
    RAISE EXCEPTION 'VAULT_PROJECT_URL_MISSING_OR_WRONG_PROJECT';
  END IF;

  IF cron_secret_value IS NULL OR length(cron_secret_value) < 32 THEN
    RAISE EXCEPTION 'VAULT_REMINDER_CRON_SECRET_MISSING_OR_TOO_SHORT';
  END IF;

  -- Do not leave two schedulers dispatching the same reminders.
  FOR old_job IN
    SELECT jobid FROM cron.job
    WHERE jobname IN (
      'send-medication-reminders-every-minute',
      'medication-reminder-dispatch'
    )
  LOOP
    PERFORM cron.unschedule(old_job.jobid);
  END LOOP;

  PERFORM cron.schedule(
    'send-medication-reminders-every-minute',
    '* * * * *',
    $job$
      SELECT net.http_post(
        url := rtrim(
          (
            SELECT decrypted_secret
            FROM vault.decrypted_secrets
            WHERE name IN ('project_url', 'medication_reminder_project_url')
            ORDER BY (name = 'project_url') DESC, created_at DESC
            LIMIT 1
          ),
          '/'
        ) || '/functions/v1/send-medication-reminders',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (
            SELECT decrypted_secret
            FROM vault.decrypted_secrets
            WHERE name = 'medication_reminder_cron_secret'
            ORDER BY created_at DESC
            LIMIT 1
          )
        ),
        body := jsonb_build_object('source', 'pg_cron'),
        timeout_milliseconds := 10000
      );
    $job$
  );
END
$operator$;

-- Safe metadata only: do not select cron.job.command, URLs, or secrets.
SELECT
  jobid,
  jobname,
  schedule,
  active,
  (command LIKE '%vault.decrypted_secrets%') AS reads_vault_at_runtime
FROM cron.job
WHERE jobname IN (
  'send-medication-reminders-every-minute',
  'medication-reminder-dispatch'
)
ORDER BY jobname;
