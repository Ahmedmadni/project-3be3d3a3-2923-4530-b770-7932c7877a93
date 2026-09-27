-- Govern the actual first-aid instruction bodies, not only their parent topics.

ALTER TABLE public.first_aid_sections
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_note text,
  ADD COLUMN IF NOT EXISTS change_reason text,
  ADD COLUMN IF NOT EXISTS translation_status public.translation_status NOT NULL DEFAULT 'not_started';

-- Allow first-aid instruction bodies to use the same version workflow as the other
-- governed medical entities.
ALTER TABLE public.content_versions
  DROP CONSTRAINT IF EXISTS content_versions_entity_type_check;

ALTER TABLE public.content_versions
  ADD CONSTRAINT content_versions_entity_type_check
  CHECK (entity_type IN (
    'symptoms',
    'conditions',
    'questions',
    'red_flags',
    'first_aid_topics',
    'first_aid_sections'
  ));

DROP TRIGGER IF EXISTS gov_guard ON public.first_aid_sections;
CREATE TRIGGER gov_guard
BEFORE UPDATE ON public.first_aid_sections
FOR EACH ROW EXECUTE FUNCTION public.governance_guard();

DROP TRIGGER IF EXISTS gov_created_by ON public.first_aid_sections;
CREATE TRIGGER gov_created_by
BEFORE INSERT ON public.first_aid_sections
FOR EACH ROW EXECUTE FUNCTION public.stamp_created_by();

-- Capture the initial publication of a section. Subsequent edits to a published
-- section are expected to go through content_versions.
CREATE OR REPLACE FUNCTION public.snapshot_first_aid_section_initial_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.review_status::text = 'published'
     AND OLD.review_status::text IS DISTINCT FROM 'published'
     AND NOT EXISTS (
       SELECT 1
       FROM public.content_versions v
       WHERE v.entity_type = 'first_aid_sections'
         AND v.entity_id = NEW.id
         AND v.version = NEW.version
         AND v.status = 'published'
     ) THEN
    INSERT INTO public.content_versions(
      entity_type, entity_id, version, status, snapshot, change_reason,
      created_by, published_by, published_at
    )
    VALUES (
      'first_aid_sections', NEW.id, NEW.version, 'published',
      to_jsonb(NEW), NEW.change_reason, NEW.created_by, auth.uid(), now()
    );
  END IF;
  RETURN NEW;
END
$$;

REVOKE EXECUTE ON FUNCTION public.snapshot_first_aid_section_initial_publish() FROM public, anon;

DROP TRIGGER IF EXISTS first_aid_section_publish_snapshot ON public.first_aid_sections;
CREATE TRIGGER first_aid_section_publish_snapshot
AFTER UPDATE ON public.first_aid_sections
FOR EACH ROW EXECUTE FUNCTION public.snapshot_first_aid_section_initial_publish();
