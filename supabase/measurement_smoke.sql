-- Health Measurements database smoke check.
-- Read-only: this script never mutates schema or data.
-- Run after applying measurement migrations to verify structural readiness.

WITH required_tables(table_name) AS (
  VALUES
    ('measurement_types'),
    ('measurement_sources'),
    ('measurement_reference_rules'),
    ('measurement_red_flags'),
    ('measurement_readings'),
    ('measurement_knowledge_articles'),
    ('measurement_knowledge_sections'),
    ('measurement_knowledge_sources')
),
table_checks AS (
  SELECT
    'TABLE'::text AS check_group,
    table_name AS item,
    CASE
      WHEN to_regclass('public.' || table_name) IS NOT NULL THEN 'READY'
      ELSE 'MISSING'
    END AS status,
    NULL::text AS details
  FROM required_tables
),
required_columns(table_name, column_name) AS (
  VALUES
    ('measurement_types','submitted_at'),
    ('measurement_reference_rules','submitted_at'),
    ('measurement_red_flags','submitted_at'),
    ('measurement_knowledge_articles','submitted_at')
),
column_checks AS (
  SELECT
    'COLUMN'::text AS check_group,
    table_name || '.' || column_name AS item,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = rc.table_name
          AND c.column_name = rc.column_name
      ) THEN 'READY'
      ELSE 'MISSING'
    END AS status,
    NULL::text AS details
  FROM required_columns rc
),
required_functions(function_name) AS (
  VALUES
    ('guard_measurement_clinical_activation'),
    ('guard_measurement_knowledge_activation'),
    ('guard_published_measurement_knowledge_sections'),
    ('measurement_governed_write_guard'),
    ('snapshot_measurement_on_publish')
),
function_checks AS (
  SELECT
    'FUNCTION'::text AS check_group,
    function_name AS item,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = rf.function_name
      ) THEN 'READY'
      ELSE 'MISSING'
    END AS status,
    NULL::text AS details
  FROM required_functions rf
),
governed_tables(table_name) AS (
  VALUES
    ('measurement_types'),
    ('measurement_reference_rules'),
    ('measurement_red_flags'),
    ('measurement_knowledge_articles')
),
trigger_checks AS (
  SELECT
    'TRIGGER'::text AS check_group,
    gt.table_name AS item,
    CASE
      WHEN COUNT(*) FILTER (WHERE t.tgname = 'aa_measurement_role_guard') = 1
       AND COUNT(*) FILTER (WHERE t.tgname = 'gov_guard') = 1
       AND COUNT(*) FILTER (WHERE t.tgname = 'gov_created_by') = 1
       AND COUNT(*) FILTER (WHERE t.tgname = 'gov_audit') = 1
       AND COUNT(*) FILTER (WHERE t.tgname = 'measurement_publish_snapshot') = 1
      THEN 'READY'
      ELSE 'MISSING'
    END AS status,
    CONCAT(
      'role=', COUNT(*) FILTER (WHERE t.tgname = 'aa_measurement_role_guard'),
      ', gov=', COUNT(*) FILTER (WHERE t.tgname = 'gov_guard'),
      ', creator=', COUNT(*) FILTER (WHERE t.tgname = 'gov_created_by'),
      ', audit=', COUNT(*) FILTER (WHERE t.tgname = 'gov_audit'),
      ', snapshot=', COUNT(*) FILTER (WHERE t.tgname = 'measurement_publish_snapshot')
    ) AS details
  FROM governed_tables gt
  LEFT JOIN pg_namespace n
    ON n.nspname = 'public'
  LEFT JOIN pg_class c
    ON c.relnamespace = n.oid
   AND c.relname = gt.table_name
  LEFT JOIN pg_trigger t
    ON t.tgrelid = c.oid
   AND NOT t.tgisinternal
  GROUP BY gt.table_name
),
rls_checks AS (
  SELECT
    'RLS'::text AS check_group,
    rt.table_name AS item,
    CASE
      WHEN COALESCE(c.relrowsecurity, false) THEN 'READY'
      ELSE 'MISSING'
    END AS status,
    NULL::text AS details
  FROM required_tables rt
  LEFT JOIN pg_namespace n
    ON n.nspname = 'public'
  LEFT JOIN pg_class c
    ON c.relnamespace = n.oid
   AND c.relname = rt.table_name
)
SELECT * FROM table_checks
UNION ALL
SELECT * FROM column_checks
UNION ALL
SELECT * FROM function_checks
UNION ALL
SELECT * FROM trigger_checks
UNION ALL
SELECT * FROM rls_checks
ORDER BY check_group, item;
