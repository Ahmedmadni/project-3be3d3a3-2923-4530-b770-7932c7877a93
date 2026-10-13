# Background medication reminders — production operator guide

This feature sends **generic** Web Push reminders for times the user entered.
Push notifications must not contain medication names, doses, symptoms,
diagnoses, measurements, or other sensitive health content. Unrecorded is
**not** interpreted as a missed dose.

## 1. Verify repository and remote database before deployment

Repository: `Ahmedmadni/project-3be3d3a3-2923-4530-b770-7932c7877a93`.
Deploy the currently reviewed `main` only. Project reference in
`supabase/config.toml`: `soyrodrsjzgdqsjaxjfk`.

After authenticating with Supabase CLI and linking **this** project, run:

```sh
supabase link --project-ref soyrodrsjzgdqsjaxjfk
supabase migration list --linked
supabase db push --dry-run
```

Compare the remote migration history to the repository, particularly:

1. `20261004184500_background_push_reminders.sql`
2. `20261009113000_measurement_import_persistence.sql`
3. `20261011214000_measurement_import_history_revert.sql`

**Do not assume a migration has run just because it exists on GitHub.**
A migration previously applied manually might have database objects but no
history entry. Check schema with the read-only script
`supabase/operational_readiness_audit.sql` in the Supabase SQL Editor.
Do not use `migration repair`, `db push`, or rerun a migration until you have
reconciled both the remote schema and its history. Use a database backup and
the project's normal change-control process before any production writes.

The audit checks schema/RLS/RPC/extension **presence only**. It cannot prove
Edge Function deployment, scheduler health, client configuration, or delivery.

## 1a. Security hotfix: lock a push endpoint to its owner

Migration `20261014001000_web_push_subscription_ownership_guard.sql`
replaces the previously deployed claim RPC, without changing patient data
or existing subscriptions. **Apply it in the Supabase SQL Editor before
enabling push in production.** The earlier foundation allowed an authenticated
caller with another user's endpoint to overwrite the endpoint's `user_id`.
The hotfix permits same-account updates but rejects any cross-account
ownership change with `PUSH_SUBSCRIPTION_OWNERSHIP_CONFLICT`.

The operator has already verified the three prerequisite migrations' basic
schema checks on the linked project, but that does not establish complete
runtime behavior or reconcile migration history. Do **not** reapply the
historical files or mark other unrecorded migrations as applied.

After applying the hotfix, run this **read-only** verification:

```sql
WITH f AS (
  SELECT to_regprocedure(
    'public.claim_web_push_subscription(text,text,text,bigint,text)'
  ) AS oid
)
SELECT
  oid IS NOT NULL AS rpc_exists,
  COALESCE((
    SELECT p.prosrc ~*
      'where[[:space:]]+public[.]web_push_subscriptions[.]user_id[[:space:]]*=[[:space:]]*excluded[.]user_id'
      AND p.prosrc ~ 'PUSH_SUBSCRIPTION_OWNERSHIP_CONFLICT'
    FROM pg_catalog.pg_proc p
    WHERE p.oid = f.oid
  ), false) AS owner_guard_installed,
  COALESCE(has_function_privilege('authenticated', oid, 'EXECUTE'), false)
    AS authenticated_allowed,
  NOT COALESCE(has_function_privilege('anon', oid, 'EXECUTE'), false)
    AS anonymous_denied
FROM f;
```

Expect four `true` values. The guard check reads the function's original source
and allows whitespace around the equality operator; exact-string matching on
`pg_get_functiondef` can incorrectly report MISSING after SQL formatting.
This is a *structural* audit, not an RLS
behavior test. For account switching on a shared browser, explicitly
unsubscribe the previous browser push subscription before registering
the new account; this endpoint is intentionally not transferrable.
Never include push endpoint URLs, public/private keys, or raw user
identifiers in shared test output.

## 2. Configure environment and deploy Edge Function

In the web app build environment:
- `VITE_VAPID_PUBLIC_KEY`: the *public* VAPID key.

In Supabase Edge Function secrets:
- `MEDICATION_REMINDER_CRON_SECRET`: a unique strong random secret (>=32 chars).
- `VAPID_PUBLIC_KEY`: the matching public VAPID key.
- `VAPID_PRIVATE_KEY`: the private VAPID key (never expose to browser).
- `VAPID_SUBJECT`: contact URI such as `mailto:operator@example.com`.

The Edge Function also uses the Supabase-provided URL and privileged key.
Never put service-role, Vault, cron or VAPID private secrets into GitHub,
browser environment variables, tickets, or logs.

After checking the migration prerequisites, deploy the Edge Function:

```sh
supabase functions deploy send-medication-reminders --project-ref soyrodrsjzgdqsjaxjfk
```

`supabase/config.toml` specifies `verify_jwt = false` because the
function requires a separate `x-cron-secret` before privileged work.

## 3. Configure Vault and the canonical cron job

Vault must contain these secret **names**, created privately in Supabase:

- `project_url`: `https://soyrodrsjzgdqsjaxjfk.supabase.co`
- `medication_reminder_cron_secret`: **the exact same** secret configured
  as `MEDICATION_REMINDER_CRON_SECRET` in the Edge Function.

A legacy Vault URL name `medication_reminder_project_url` is supported as
a fallback. The preferred name is `project_url`.

Run **only** `supabase/medication_reminder_cron_setup.sql` in the
Supabase SQL Editor. The older
`supabase/medication_reminder_scheduler.sql` is deprecated and no longer
schedules anything. The canonical script removes the two previously-used
job names, then schedules exactly one job every minute. It validates Vault
configuration before replacing the jobs.

**Security:** the cron command must query `vault.decrypted_secrets` on each
execution. Never construct it with `format(... %L ...)` using actual secret
values or display `cron.job.command` in screenshots or support messages.

Safe, non-secret verification query (run in SQL Editor):

```sql
SELECT jobname, schedule, active,
       command LIKE '%vault.decrypted_secrets%' AS reads_vault_at_runtime
FROM cron.job
WHERE jobname IN (
  'send-medication-reminders-every-minute',
  'medication-reminder-dispatch'
);
```

Expect **one** row: active canonical job on `* * * * *`, with
`reads_vault_at_runtime = true`.

## 4. End-to-end validation (required before declaring READY)

Use a consenting signed-in test account and a physical device/browser with
push permission:

1. Open medication schedules, enable background reminders and confirm a
   browser subscription is registered.
2. Create a **test** schedule due within the next few minutes in that
   device's actual timezone; do not use real medication details.
3. Confirm a single generic reminder arrives without health information on
   the lock screen.
4. Check the app's Reminder Reliability Center for recent delivery metadata.
5. Check the Cron job execution and the Edge Function logs **without printing
   credentials or raw push subscription keys**.
6. Mark a future test occurrence Taken/Skipped before its time and verify no
   reminder is sent for that occurrence.
7. Confirm repeat cron ticks do not duplicate notifications for an occurrence.
8. Disable the subscription and confirm the user can stop reminders.

An `idle` reliability state, successful CI, or a single `cron.job` record
does **not** by itself mean a push was delivered.

## 5. Measurement import readiness and safety

The two CSV import migrations listed in section 1 are in dependency order.
Run the read-only schema audit after reconciling migrations. Only then test
with small, non-sensitive sample CSV/TSV data in a controlled test account.

Verify the import result preserves `quality = unknown`, the history shows
one user-owned batch, an exact-hash duplicate is rejected, and a confirmed
revert deletes only readings from that batch while preserving its provenance.
Do not test with real patient data, and do not turn on draft clinical content.

### Deployment evidence checklist

Record privately (without secrets or personal health data):
- Remote migration versions, audit results, and timestamp.
- Edge Function deployment identifier and timestamp.
- Exactly one active cron job and successful runtime execution.
- Successful physical-device push and no sensitive notification content.
- CSV import / duplicate / revert smoke-test results.

**Production ready** means all relevant evidence has been collected and
reviewed; checked-in code and green builds alone are insufficient.
