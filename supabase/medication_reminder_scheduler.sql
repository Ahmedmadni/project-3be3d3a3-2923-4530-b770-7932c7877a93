-- Medication reminder scheduler operator script.
-- Run AFTER:
--   1) send-medication-reminders Edge Function is deployed,
--   2) MEDICATION_REMINDER_CRON_SECRET is configured on the function,
--   3) Vault contains the same secret as medication_reminder_cron_secret.
--
-- Create these Vault entries once (replace the secret placeholder):
--
-- select vault.create_secret(
--   'https://soyrodrsjzgdqsjaxjfk.supabase.co',
--   'medication_reminder_project_url'
-- );
--
-- select vault.create_secret(
--   'REPLACE_WITH_THE_SAME_RANDOM_CRON_SECRET_USED_BY_THE_EDGE_FUNCTION',
--   'medication_reminder_cron_secret'
-- );
--
-- Supabase Cron + pg_net invoke the Edge Function every minute.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'medication-reminder-dispatch',
  '* * * * *',
  $cron$
  select net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'medication_reminder_project_url'
      limit 1
    ) || '/functions/v1/send-medication-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'medication_reminder_cron_secret'
        limit 1
      )
    ),
    body := jsonb_build_object(
      'source', 'supabase_cron',
      'requested_at', now()
    ),
    timeout_milliseconds := 10000
  );
  $cron$
);

-- Verification:
-- select jobid, jobname, schedule, active
-- from cron.job
-- where jobname = 'medication-reminder-dispatch';
