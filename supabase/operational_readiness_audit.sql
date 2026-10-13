-- Production readiness: schema and privilege checks for reminder + CSV import.
-- READ ONLY. Run in Supabase SQL Editor after comparing migration history.
-- Also verifies that the push-claim ownership hotfix has been installed.
-- Does not inspect user data, invoke reminders, send push, or change records.
-- READY confirms only a schema invariant, never successful live deployment.
-- Edge Function, VAPID, Vault contents, cron execution and device delivery
-- must be verified separately with the operator guide.
WITH checks AS (
  SELECT '01_push_subscription_table' AS check_name,
         to_regclass('public.web_push_subscriptions') IS NOT NULL AS ready
  UNION ALL
  SELECT '02_reminder_delivery_table',
         to_regclass('public.medication_reminder_deliveries') IS NOT NULL
  UNION ALL
  SELECT '03_medication_schedules_dependency',
         to_regclass('public.medication_schedules') IS NOT NULL
  UNION ALL
  SELECT '04_push_subscription_rls',
         COALESCE((
           SELECT c.relrowsecurity FROM pg_catalog.pg_class AS c
           WHERE c.oid = to_regclass('public.web_push_subscriptions')
         ), false)
  UNION ALL
  SELECT '05_reminder_delivery_rls',
         COALESCE((
           SELECT c.relrowsecurity FROM pg_catalog.pg_class AS c
           WHERE c.oid = to_regclass('public.medication_reminder_deliveries')
         ), false)
  UNION ALL
  SELECT '06_push_owner_select_policy',
         EXISTS(
           SELECT 1 FROM pg_catalog.pg_policies
           WHERE schemaname = 'public'
             AND tablename = 'web_push_subscriptions'
             AND cmd = 'SELECT' AND 'authenticated' = ANY(roles)
         )
  UNION ALL
  SELECT '07_delivery_owner_select_policy',
         EXISTS(
           SELECT 1 FROM pg_catalog.pg_policies
           WHERE schemaname = 'public'
             AND tablename = 'medication_reminder_deliveries'
             AND cmd = 'SELECT' AND 'authenticated' = ANY(roles)
         )
  UNION ALL
  SELECT '08_push_claim_rpc',
         to_regprocedure(
           'public.claim_web_push_subscription(text,text,text,bigint,text)'
         ) IS NOT NULL
  UNION ALL
  SELECT '09_measurement_import_batch_table',
         to_regclass('public.measurement_import_batches') IS NOT NULL
  UNION ALL
  SELECT '10_measurement_import_batch_rls',
         COALESCE((
           SELECT c.relrowsecurity FROM pg_catalog.pg_class AS c
           WHERE c.oid = to_regclass('public.measurement_import_batches')
         ), false)
  UNION ALL
  SELECT '11_measurement_batch_owner_read_policy',
         EXISTS(
           SELECT 1 FROM pg_catalog.pg_policies
           WHERE schemaname = 'public'
             AND tablename = 'measurement_import_batches'
             AND cmd = 'SELECT' AND 'authenticated' = ANY(roles)
         )
  UNION ALL
  SELECT '12_measurement_reading_batch_reference',
         EXISTS(
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'measurement_readings'
             AND column_name = 'import_batch_id'
         )
  UNION ALL
  SELECT '13_measurement_reading_row_provenance',
         EXISTS(
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'measurement_readings'
             AND column_name = 'import_row_number'
         )
  UNION ALL
  SELECT '14_measurement_import_reverted_at',
         EXISTS(
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'measurement_import_batches'
             AND column_name = 'reverted_at'
         )
  UNION ALL
  SELECT '15_measurement_import_reverted_count',
         EXISTS(
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'measurement_import_batches'
             AND column_name = 'reverted_count'
         )
  UNION ALL
  SELECT '16_measurement_import_v2_rpc',
         to_regprocedure(
           'public.import_measurement_reading_batch_v2(text,bigint,text,integer,jsonb,jsonb,jsonb)'
         ) IS NOT NULL
  UNION ALL
  SELECT '17_measurement_revert_rpc',
         to_regprocedure('public.revert_measurement_import_batch(uuid)') IS NOT NULL
  UNION ALL
  SELECT '18_legacy_import_not_authenticated',
         NOT COALESCE(has_function_privilege(
           'authenticated',
           to_regprocedure('public.import_measurement_reading_batch(text,bigint,text,integer,jsonb,jsonb,jsonb)'),
           'EXECUTE'
         ), false)
  UNION ALL
  SELECT '19_import_v2_not_anonymous',
         to_regprocedure(
           'public.import_measurement_reading_batch_v2(text,bigint,text,integer,jsonb,jsonb,jsonb)'
         ) IS NOT NULL
         AND NOT COALESCE(has_function_privilege(
           'anon',
           to_regprocedure('public.import_measurement_reading_batch_v2(text,bigint,text,integer,jsonb,jsonb,jsonb)'),
           'EXECUTE'
         ), false)
  UNION ALL
  SELECT '20_revert_not_anonymous',
         to_regprocedure('public.revert_measurement_import_batch(uuid)') IS NOT NULL
         AND NOT COALESCE(has_function_privilege(
           'anon', to_regprocedure('public.revert_measurement_import_batch(uuid)'),
           'EXECUTE'
         ), false)
  UNION ALL
  SELECT '21_pg_cron_extension',
         EXISTS(SELECT 1 FROM pg_catalog.pg_extension WHERE extname = 'pg_cron')
  UNION ALL
  SELECT '22_pg_net_extension',
         EXISTS(SELECT 1 FROM pg_catalog.pg_extension WHERE extname = 'pg_net')
  UNION ALL
  SELECT '23_push_endpoint_ownership_guard',
         COALESCE((
           SELECT pg_get_functiondef(p.oid) LIKE
             '%WHERE public.web_push_subscriptions.user_id = EXCLUDED.user_id%'
             AND pg_get_functiondef(p.oid) LIKE
               '%PUSH_SUBSCRIPTION_OWNERSHIP_CONFLICT%'
           FROM pg_catalog.pg_proc AS p
           WHERE p.oid = to_regprocedure(
             'public.claim_web_push_subscription(text,text,text,bigint,text)'
           )
         ), false)
)
SELECT check_name,
       CASE WHEN ready THEN 'READY' ELSE 'MISSING_OR_UNSAFE' END AS status
FROM checks
ORDER BY check_name;
