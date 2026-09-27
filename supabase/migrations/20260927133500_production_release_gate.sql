-- Production knowledge release gate.
-- Re-validates the published graph so legacy content that predates newer guards
-- cannot silently enter a non-demo release.

CREATE OR REPLACE FUNCTION public.create_knowledge_release(_version text, _notes text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rid uuid;
  m jsonb;
  uid uuid := auth.uid();
  bad_count integer;
  published_conditions integer;
  published_red_flags integer;
BEGIN
  IF NOT public.has_any_role(uid, ARRAY['admin','super_admin']) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF _version !~ '^\d{4}\.\d{2}\.\d+$' THEN
    RAISE EXCEPTION 'BAD_VERSION';
  END IF;

  SELECT count(*) INTO published_conditions
  FROM public.conditions
  WHERE review_status::text = 'published' AND is_active = true;

  SELECT count(*) INTO published_red_flags
  FROM public.red_flags
  WHERE review_status::text = 'published' AND is_active = true;

  IF published_conditions = 0 THEN
    RAISE EXCEPTION 'RELEASE_NOT_READY: at least one active published condition is required';
  END IF;

  IF published_red_flags = 0 THEN
    RAISE EXCEPTION 'RELEASE_NOT_READY: at least one active published red flag is required';
  END IF;

  SELECT count(*) INTO bad_count
  FROM public.conditions c
  WHERE c.review_status::text = 'published'
    AND c.is_active = true
    AND (
      c.is_demo = true
      OR NOT EXISTS (
        SELECT 1 FROM public.condition_sources l
        JOIN public.medical_sources s ON s.id = l.source_id
        WHERE l.condition_id = c.id AND s.is_active = true
      )
      OR NOT EXISTS (
        SELECT 1 FROM public.condition_symptoms cs
        WHERE cs.condition_id = c.id AND cs.is_active = true AND cs.weight > 0
      )
    );
  IF bad_count > 0 THEN
    RAISE EXCEPTION 'RELEASE_NOT_READY: % published condition(s) fail source or rule readiness', bad_count;
  END IF;

  SELECT count(*) INTO bad_count
  FROM public.red_flags f
  WHERE f.review_status::text = 'published'
    AND f.is_active = true
    AND (
      f.is_demo = true
      OR NOT EXISTS (
        SELECT 1 FROM public.red_flag_sources l
        JOIN public.medical_sources s ON s.id = l.source_id
        WHERE l.red_flag_id = f.id AND s.is_active = true
      )
      OR NOT EXISTS (
        SELECT 1 FROM public.red_flag_rules r
        WHERE r.red_flag_id = f.id AND r.is_active = true
      )
    );
  IF bad_count > 0 THEN
    RAISE EXCEPTION 'RELEASE_NOT_READY: % published red flag(s) fail source or rule readiness', bad_count;
  END IF;

  SELECT count(*) INTO bad_count
  FROM public.questions q
  WHERE q.review_status::text = 'published'
    AND q.is_active = true
    AND (
      q.is_demo = true
      OR NOT EXISTS (
        SELECT 1 FROM public.question_sources l
        JOIN public.medical_sources s ON s.id = l.source_id
        WHERE l.question_id = q.id AND s.is_active = true
      )
      OR NOT EXISTS (
        SELECT 1 FROM public.question_rules r
        WHERE r.question_id = q.id AND r.is_active = true
      )
    );
  IF bad_count > 0 THEN
    RAISE EXCEPTION 'RELEASE_NOT_READY: % published question(s) fail source or rule readiness', bad_count;
  END IF;

  SELECT count(*) INTO bad_count
  FROM public.first_aid_topics t
  WHERE t.review_status::text = 'published'
    AND t.is_active = true
    AND (
      NOT EXISTS (
        SELECT 1 FROM public.first_aid_sources l
        JOIN public.medical_sources s ON s.id = l.source_id
        WHERE l.first_aid_topic_id = t.id AND s.is_active = true
      )
      OR 5 <> (
        SELECT count(DISTINCT sec.section_type)
        FROM public.first_aid_sections sec
        WHERE sec.topic_id = t.id
          AND sec.review_status::text = 'published'
          AND nullif(btrim(sec.content_ar), '') IS NOT NULL
          AND sec.section_type IN ('what_is_happening','when_to_call','do_now','dont_do','while_waiting')
      )
    );
  IF bad_count > 0 THEN
    RAISE EXCEPTION 'RELEASE_NOT_READY: % first-aid topic(s) fail source or section readiness', bad_count;
  END IF;

  m := jsonb_build_object(
    'conditions', (
      SELECT coalesce(jsonb_object_agg(id, version), '{}')
      FROM public.conditions WHERE review_status::text = 'published' AND is_active = true
    ),
    'red_flags', (
      SELECT coalesce(jsonb_object_agg(id, version), '{}')
      FROM public.red_flags WHERE review_status::text = 'published' AND is_active = true
    ),
    'questions', (
      SELECT coalesce(jsonb_object_agg(id, version), '{}')
      FROM public.questions WHERE review_status::text = 'published' AND is_active = true
    ),
    'first_aid_topics', (
      SELECT coalesce(jsonb_object_agg(id, version), '{}')
      FROM public.first_aid_topics WHERE review_status::text = 'published' AND is_active = true
    )
  );

  INSERT INTO public.knowledge_releases(version, notes, is_demo, manifest, created_by)
  VALUES (_version, _notes, false, m, uid)
  RETURNING id INTO rid;

  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    uid, 'publish', 'knowledge_releases', rid,
    jsonb_build_object('version', _version, 'production_ready', true)
  );

  RETURN rid;
END
$$;

REVOKE EXECUTE ON FUNCTION public.create_knowledge_release(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_knowledge_release(text, text) TO authenticated, service_role;
