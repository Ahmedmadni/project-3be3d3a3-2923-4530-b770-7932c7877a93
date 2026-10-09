-- Measurement CSV Import Persistence
-- Adds immutable per-user batch provenance and an atomic RPC.
-- Imported readings are stored with quality='unknown' and no clinical inference.

CREATE TABLE IF NOT EXISTS public.measurement_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_filename text NOT NULL,
  file_size_bytes bigint NOT NULL CHECK (file_size_bytes >= 0),
  file_sha256 text,
  source_row_count integer NOT NULL CHECK (source_row_count >= 0),
  imported_count integer NOT NULL DEFAULT 0 CHECK (imported_count >= 0),
  skipped_count integer NOT NULL DEFAULT 0 CHECK (skipped_count >= 0),
  mapping jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(mapping) = 'object'),
  qa_summary jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(qa_summary) = 'object'),
  status text NOT NULL DEFAULT 'imported'
    CHECK (status IN ('imported')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS measurement_import_batches_user_time_idx
  ON public.measurement_import_batches (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS measurement_import_batches_user_hash_idx
  ON public.measurement_import_batches (user_id, file_sha256)
  WHERE file_sha256 IS NOT NULL;

ALTER TABLE public.measurement_readings
  ADD COLUMN IF NOT EXISTS import_batch_id uuid
    REFERENCES public.measurement_import_batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS import_row_number integer;

ALTER TABLE public.measurement_readings
  DROP CONSTRAINT IF EXISTS measurement_readings_import_provenance_ck;

ALTER TABLE public.measurement_readings
  ADD CONSTRAINT measurement_readings_import_provenance_ck CHECK (
    (import_batch_id IS NULL AND import_row_number IS NULL)
    OR
    (import_batch_id IS NOT NULL AND import_row_number IS NOT NULL AND import_row_number >= 2)
  );

CREATE UNIQUE INDEX IF NOT EXISTS measurement_readings_import_row_unique_idx
  ON public.measurement_readings (import_batch_id, import_row_number)
  WHERE import_batch_id IS NOT NULL;

ALTER TABLE public.measurement_import_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own measurement import batches"
  ON public.measurement_import_batches;

CREATE POLICY "users read own measurement import batches"
ON public.measurement_import_batches
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

GRANT SELECT
ON public.measurement_import_batches
TO authenticated;

GRANT ALL
ON public.measurement_import_batches
TO service_role;

CREATE OR REPLACE FUNCTION public.import_measurement_reading_batch(
  p_original_filename text,
  p_file_size_bytes bigint,
  p_file_sha256 text,
  p_source_row_count integer,
  p_mapping jsonb,
  p_qa_summary jsonb,
  p_rows jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  batch_id uuid;
  item jsonb;
  row_number integer;
  type_id uuid;
  measured_at_value timestamptz;
  scalar_value_value numeric;
  components_value jsonb;
  unit_value text;
  notes_value text;
  type_value_kind text;
  type_canonical_unit text;
  type_allowed_units text[];
  imported_rows integer := 0;
  staff_can_preview boolean := false;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF p_original_filename IS NULL OR length(btrim(p_original_filename)) = 0 THEN
    RAISE EXCEPTION 'FILENAME_REQUIRED';
  END IF;

  IF p_file_size_bytes IS NULL OR p_file_size_bytes < 0 OR p_file_size_bytes > 5242880 THEN
    RAISE EXCEPTION 'INVALID_FILE_SIZE';
  END IF;

  IF p_source_row_count IS NULL OR p_source_row_count < 0 OR p_source_row_count > 2000 THEN
    RAISE EXCEPTION 'INVALID_SOURCE_ROW_COUNT';
  END IF;

  IF p_mapping IS NULL OR jsonb_typeof(p_mapping) <> 'object' THEN
    RAISE EXCEPTION 'INVALID_MAPPING';
  END IF;

  IF p_qa_summary IS NULL OR jsonb_typeof(p_qa_summary) <> 'object' THEN
    RAISE EXCEPTION 'INVALID_QA_SUMMARY';
  END IF;

  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'INVALID_IMPORT_ROWS';
  END IF;

  IF jsonb_array_length(p_rows) = 0 THEN
    RAISE EXCEPTION 'NO_VALID_ROWS';
  END IF;

  IF jsonb_array_length(p_rows) > 2000 THEN
    RAISE EXCEPTION 'IMPORT_TOO_LARGE';
  END IF;

  staff_can_preview := public.has_any_role(
    current_user_id,
    ARRAY['content_editor','medical_reviewer','admin','super_admin']
  );

  INSERT INTO public.measurement_import_batches (
    user_id,
    original_filename,
    file_size_bytes,
    file_sha256,
    source_row_count,
    imported_count,
    skipped_count,
    mapping,
    qa_summary,
    status
  )
  VALUES (
    current_user_id,
    p_original_filename,
    p_file_size_bytes,
    NULLIF(btrim(p_file_sha256), ''),
    p_source_row_count,
    0,
    0,
    p_mapping,
    p_qa_summary,
    'imported'
  )
  RETURNING id INTO batch_id;

  FOR item IN
    SELECT value
    FROM jsonb_array_elements(p_rows)
  LOOP
    row_number := NULLIF(item->>'row_number', '')::integer;
    type_id := NULLIF(item->>'measurement_type_id', '')::uuid;
    measured_at_value := NULLIF(item->>'measured_at', '')::timestamptz;
    scalar_value_value := NULLIF(item->>'scalar_value', '')::numeric;
    components_value := item->'components';
    IF components_value = 'null'::jsonb THEN
      components_value := NULL;
    END IF;
    unit_value := NULLIF(btrim(item->>'unit'), '');
    notes_value := NULLIF(btrim(item->>'notes'), '');

    IF row_number IS NULL OR row_number < 2 THEN
      RAISE EXCEPTION 'INVALID_ROW_NUMBER';
    END IF;

    IF type_id IS NULL OR measured_at_value IS NULL THEN
      RAISE EXCEPTION 'ROW_REQUIRED_FIELDS_MISSING:%', row_number;
    END IF;

    SELECT
      mt.value_kind,
      mt.canonical_unit,
      mt.allowed_units
    INTO
      type_value_kind,
      type_canonical_unit,
      type_allowed_units
    FROM public.measurement_types mt
    WHERE mt.id = type_id
      AND (
        (
          mt.review_status = 'published'
          AND mt.is_active = true
          AND mt.is_demo = false
        )
        OR staff_can_preview
      )
    LIMIT 1;

    IF type_value_kind IS NULL THEN
      RAISE EXCEPTION 'MEASUREMENT_TYPE_NOT_AVAILABLE:%', row_number;
    END IF;

    IF type_value_kind = 'scalar' THEN
      IF scalar_value_value IS NULL OR components_value IS NOT NULL THEN
        RAISE EXCEPTION 'INVALID_SCALAR_ROW:%', row_number;
      END IF;
    ELSIF type_value_kind = 'compound' THEN
      IF components_value IS NULL
         OR jsonb_typeof(components_value) <> 'object'
         OR scalar_value_value IS NOT NULL THEN
        RAISE EXCEPTION 'INVALID_COMPOUND_ROW:%', row_number;
      END IF;
    ELSE
      RAISE EXCEPTION 'UNSUPPORTED_VALUE_KIND:%', row_number;
    END IF;

    IF unit_value IS NULL THEN
      unit_value := type_canonical_unit;
    END IF;

    IF unit_value IS NOT NULL
       AND cardinality(type_allowed_units) > 0
       AND NOT (unit_value = ANY(type_allowed_units)) THEN
      RAISE EXCEPTION 'UNIT_NOT_ALLOWED:%:%', row_number, unit_value;
    END IF;

    INSERT INTO public.measurement_readings (
      user_id,
      measurement_type_id,
      measured_at,
      scalar_value,
      unit,
      components,
      context,
      quality,
      notes,
      import_batch_id,
      import_row_number
    )
    VALUES (
      current_user_id,
      type_id,
      measured_at_value,
      scalar_value_value,
      unit_value,
      components_value,
      jsonb_build_object(
        'source', 'csv_import',
        'import_batch_id', batch_id,
        'import_row_number', row_number
      ),
      'unknown',
      notes_value,
      batch_id,
      row_number
    );

    imported_rows := imported_rows + 1;
  END LOOP;

  UPDATE public.measurement_import_batches
  SET
    imported_count = imported_rows,
    skipped_count = GREATEST(p_source_row_count - imported_rows, 0)
  WHERE id = batch_id;

  RETURN jsonb_build_object(
    'batch_id', batch_id,
    'imported_count', imported_rows,
    'skipped_count', GREATEST(p_source_row_count - imported_rows, 0)
  );
END
$$;

REVOKE EXECUTE
ON FUNCTION public.import_measurement_reading_batch(
  text, bigint, text, integer, jsonb, jsonb, jsonb
)
FROM public, anon;

GRANT EXECUTE
ON FUNCTION public.import_measurement_reading_batch(
  text, bigint, text, integer, jsonb, jsonb, jsonb
)
TO authenticated;
