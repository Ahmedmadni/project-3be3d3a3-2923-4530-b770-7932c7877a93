-- Governed admin review workflow for Health Measurements.
-- Also repairs the published Knowledge Base section immutability function.

CREATE OR REPLACE FUNCTION public.guard_published_measurement_knowledge_sections()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_article_id uuid;
  published_parent boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_article_id := OLD.article_id;
  ELSE
    target_article_id := NEW.article_id;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.measurement_knowledge_articles a
    WHERE a.id = target_article_id
      AND a.review_status = 'published'
  ) INTO published_parent;

  IF published_parent THEN
    RAISE EXCEPTION
      'PUBLISHED_MEASUREMENT_KNOWLEDGE_IMMUTABLE: create a new draft article version';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END
$$;

-- Keep measurement governance metadata aligned with the general content workflow.
ALTER TABLE public.measurement_types
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
ALTER TABLE public.measurement_reference_rules
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
ALTER TABLE public.measurement_red_flags
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
ALTER TABLE public.measurement_knowledge_articles
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

-- Allow measurement entities to be snapshotted in the existing version table.
ALTER TABLE public.content_versions
  DROP CONSTRAINT IF EXISTS content_versions_entity_type_check;
ALTER TABLE public.content_versions
  ADD CONSTRAINT content_versions_entity_type_check CHECK (
    entity_type IN (
      'symptoms','conditions','questions','red_flags','first_aid_topics',
      'measurement_types','measurement_reference_rules',
      'measurement_red_flags','measurement_knowledge_articles'
    )
  );

-- Column-level intent guard. RLS grants staff access, while this trigger
-- prevents reviewers from silently becoming editors and restricts activation.
CREATE OR REPLACE FUNCTION public.measurement_governed_write_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  old_row jsonb;
  new_row jsonb;
  content_changed boolean;
  meta_keys text[] := ARRAY[
    'review_status','updated_at','version','submitted_at',
    'reviewed_by','reviewed_at','approved_by','approved_at',
    'published_by','published_at','review_note','change_reason',
    'is_active','last_medical_review_at'
  ];
BEGIN
  IF uid IS NULL OR current_setting('app.bypass_guard', true) = 'on' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT public.has_any_role(uid, ARRAY['content_editor','admin','super_admin']) THEN
      RAISE EXCEPTION 'MEASUREMENT_EDITOR_REQUIRED: only editors/admins may create measurement content';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF NOT public.has_any_role(uid, ARRAY['content_editor','admin','super_admin']) THEN
      RAISE EXCEPTION 'MEASUREMENT_EDITOR_REQUIRED: only editors/admins may delete measurement content';
    END IF;
    IF OLD.review_status = 'published' THEN
      RAISE EXCEPTION 'PUBLISHED_LOCKED: retire published measurement content instead of deleting it';
    END IF;
    RETURN OLD;
  END IF;

  old_row := to_jsonb(OLD);
  new_row := to_jsonb(NEW);
  content_changed := (old_row - meta_keys) IS DISTINCT FROM (new_row - meta_keys);

  IF content_changed
     AND NOT public.has_any_role(uid, ARRAY['content_editor','admin','super_admin']) THEN
    RAISE EXCEPTION 'MEASUREMENT_EDITOR_REQUIRED: reviewer may review but not edit clinical content';
  END IF;

  IF (old_row->>'is_active') IS DISTINCT FROM (new_row->>'is_active')
     AND NOT public.has_any_role(uid, ARRAY['admin','super_admin']) THEN
    RAISE EXCEPTION 'MEASUREMENT_ADMIN_REQUIRED: only admins may activate or deactivate measurement content';
  END IF;

  IF (old_row->>'review_status') IS DISTINCT FROM (new_row->>'review_status')
     AND new_row->>'review_status' = 'changes_requested'
     AND NULLIF(BTRIM(COALESCE(new_row->>'review_note','')), '') IS NULL THEN
    RAISE EXCEPTION 'REVIEW_NOTE_REQUIRED: explain requested changes';
  END IF;

  RETURN NEW;
END
$$;

REVOKE EXECUTE ON FUNCTION public.measurement_governed_write_guard()
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.measurement_governed_write_guard()
  TO service_role;

-- Snapshot every first-party measurement entity at publication.
CREATE OR REPLACE FUNCTION public.snapshot_measurement_on_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_json jsonb := to_jsonb(NEW);
BEGIN
  IF NEW.review_status = 'published'
     AND OLD.review_status IS DISTINCT FROM 'published' THEN
    INSERT INTO public.content_versions (
      entity_type, entity_id, version, status, snapshot, change_reason,
      review_note, created_by, reviewed_by, reviewed_at,
      published_by, published_at
    )
    VALUES (
      TG_TABLE_NAME,
      NEW.id,
      NEW.version,
      'published',
      row_json,
      NEW.change_reason,
      NEW.review_note,
      NEW.created_by,
      NEW.reviewed_by,
      NEW.reviewed_at,
      NEW.published_by,
      NEW.published_at
    );
  END IF;
  RETURN NEW;
END
$$;

REVOKE EXECUTE ON FUNCTION public.snapshot_measurement_on_publish()
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.snapshot_measurement_on_publish()
  TO service_role;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'measurement_types',
    'measurement_reference_rules',
    'measurement_red_flags',
    'measurement_knowledge_articles'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS aa_measurement_role_guard ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER aa_measurement_role_guard
       BEFORE INSERT OR UPDATE OR DELETE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.measurement_governed_write_guard()', t
    );

    EXECUTE format('DROP TRIGGER IF EXISTS gov_guard ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER gov_guard
       BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.governance_guard()', t
    );

    EXECUTE format('DROP TRIGGER IF EXISTS gov_created_by ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER gov_created_by
       BEFORE INSERT ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.stamp_created_by()', t
    );

    EXECUTE format('DROP TRIGGER IF EXISTS gov_audit ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER gov_audit
       AFTER INSERT OR UPDATE OR DELETE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.governance_audit()', t
    );

    EXECUTE format('DROP TRIGGER IF EXISTS measurement_publish_snapshot ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER measurement_publish_snapshot
       AFTER UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.snapshot_measurement_on_publish()', t
    );
  END LOOP;
END
$$;

-- Source links and article sections are editor-managed, reviewer-readable.
DROP POLICY IF EXISTS "measurement sources staff manage"
  ON public.measurement_sources;
DROP POLICY IF EXISTS "measurement sources staff read"
  ON public.measurement_sources;
CREATE POLICY "measurement sources staff read"
ON public.measurement_sources FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));
CREATE POLICY "measurement sources editor manage"
ON public.measurement_sources FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['content_editor','admin','super_admin']))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['content_editor','admin','super_admin']));

DROP POLICY IF EXISTS "knowledge sections staff manage"
  ON public.measurement_knowledge_sections;
DROP POLICY IF EXISTS "knowledge sections staff read"
  ON public.measurement_knowledge_sections;
CREATE POLICY "knowledge sections staff read"
ON public.measurement_knowledge_sections FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));
CREATE POLICY "knowledge sections editor manage"
ON public.measurement_knowledge_sections FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['content_editor','admin','super_admin']))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['content_editor','admin','super_admin']));

DROP POLICY IF EXISTS "knowledge sources staff manage"
  ON public.measurement_knowledge_sources;
DROP POLICY IF EXISTS "knowledge sources staff read"
  ON public.measurement_knowledge_sources;
CREATE POLICY "knowledge sources staff read"
ON public.measurement_knowledge_sources FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));
CREATE POLICY "knowledge sources editor manage"
ON public.measurement_knowledge_sources FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['content_editor','admin','super_admin']))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['content_editor','admin','super_admin']));
