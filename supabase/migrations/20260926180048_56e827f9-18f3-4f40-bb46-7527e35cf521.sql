
-- ===== enums =====
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'content_editor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'medical_reviewer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.review_status ADD VALUE IF NOT EXISTS 'in_review';
ALTER TYPE public.review_status ADD VALUE IF NOT EXISTS 'changes_requested';
ALTER TYPE public.review_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE public.review_status ADD VALUE IF NOT EXISTS 'published';
ALTER TYPE public.source_type ADD VALUE IF NOT EXISTS 'clinical_guideline';
ALTER TYPE public.source_type ADD VALUE IF NOT EXISTS 'systematic_review';
DO $$ BEGIN
  CREATE TYPE public.translation_status AS ENUM ('not_started','in_progress','reviewed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== settings =====
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.app_settings(key, value) VALUES
  ('content_mode', '"development"'), ('require_distinct_reviewer', 'false')
ON CONFLICT (key) DO NOTHING;

-- ===== role helpers =====
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role::text = any(_roles))
$$;
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select public.has_any_role(_user_id, array['content_editor','medical_reviewer','admin','super_admin'])
$$;
CREATE OR REPLACE FUNCTION public.content_visible(_status text, _is_demo boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select _status = 'published'
    or (auth.uid() is not null and public.is_staff(auth.uid()))
    or (coalesce(_is_demo,false) and coalesce((select value #>> '{}' from public.app_settings where key='content_mode'),'production') = 'development')
$$;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, text[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, text[]) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.content_visible(text, boolean) TO anon, authenticated, service_role;

CREATE POLICY "super admin writes settings" ON public.app_settings FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), array['super_admin'])) WITH CHECK (public.has_any_role(auth.uid(), array['super_admin']));
CREATE POLICY "settings readable" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);

-- ===== governed content columns =====
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY array['symptoms','conditions','questions','red_flags','first_aid_topics'] LOOP
    EXECUTE format('ALTER TABLE public.%I
      ADD COLUMN IF NOT EXISTS review_status public.review_status NOT NULL DEFAULT ''draft'',
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
      ADD COLUMN IF NOT EXISTS translation_status public.translation_status NOT NULL DEFAULT ''not_started''', t);
  END LOOP;
END $$;
ALTER TABLE public.first_aid_sections ADD COLUMN IF NOT EXISTS title_en text, ADD COLUMN IF NOT EXISTS content_en text;

-- ===== sources =====
ALTER TABLE public.medical_sources
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS organization_type text,
  ADD COLUMN IF NOT EXISTS evidence_level text,
  ADD COLUMN IF NOT EXISTS published_at date,
  ADD COLUMN IF NOT EXISTS last_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_review_at date;

CREATE TABLE IF NOT EXISTS public.question_sources (
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.medical_sources(id) ON DELETE CASCADE,
  PRIMARY KEY (question_id, source_id)
);
CREATE TABLE IF NOT EXISTS public.red_flag_sources (
  red_flag_id uuid NOT NULL REFERENCES public.red_flags(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.medical_sources(id) ON DELETE CASCADE,
  PRIMARY KEY (red_flag_id, source_id)
);
GRANT SELECT ON public.question_sources, public.red_flag_sources TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.question_sources, public.red_flag_sources TO authenticated;
GRANT ALL ON public.question_sources, public.red_flag_sources TO service_role;
ALTER TABLE public.question_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.red_flag_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.question_sources FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read" ON public.red_flag_sources FOR SELECT TO anon, authenticated USING (true);

-- ===== emergency metadata =====
ALTER TABLE public.emergency_contacts
  ADD COLUMN IF NOT EXISTS nationwide boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS available_24_7 boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS source_id uuid REFERENCES public.medical_sources(id) ON DELETE SET NULL;

-- ===== versions =====
CREATE TABLE IF NOT EXISTS public.content_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('symptoms','conditions','questions','red_flags','first_aid_topics')),
  entity_id uuid NOT NULL,
  version integer NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_review','changes_requested','approved','published','retired')),
  snapshot jsonb NOT NULL,
  change_reason text,
  source_ids uuid[] NOT NULL DEFAULT '{}',
  review_note text,
  created_by uuid,
  reviewed_by uuid, reviewed_at timestamptz,
  published_by uuid, published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS content_versions_entity ON public.content_versions(entity_type, entity_id, version DESC);
GRANT SELECT, INSERT, UPDATE ON public.content_versions TO authenticated;
GRANT ALL ON public.content_versions TO service_role;
ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read versions" ON public.content_versions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "editors create drafts" ON public.content_versions FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), array['content_editor','admin','super_admin']) AND status = 'draft' AND created_by = auth.uid());
CREATE POLICY "staff update versions" ON public.content_versions FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER content_versions_updated BEFORE UPDATE ON public.content_versions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== audit =====
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_version integer,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_created ON public.audit_logs(created_at DESC);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- ===== workflow rules =====
CREATE OR REPLACE FUNCTION public.can_transition(_uid uuid, _from text, _to text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
declare f text := case _from when 'pending_review' then 'in_review' when 'reviewed' then 'approved' else _from end;
begin
  if f = _to then return true; end if;
  if public.has_any_role(_uid, array['super_admin']) then return true; end if;
  if _to = 'in_review' and f in ('draft','changes_requested') then
    return public.has_any_role(_uid, array['content_editor','admin']);
  elsif _to in ('approved','changes_requested') and f = 'in_review' then
    return public.has_any_role(_uid, array['medical_reviewer','admin']);
  elsif _to = 'published' and f = 'approved' then
    return public.has_any_role(_uid, array['admin']);
  elsif _to = 'retired' then
    return public.has_any_role(_uid, array['admin']);
  elsif _to = 'draft' and f in ('retired','changes_requested') then
    return public.has_any_role(_uid, array['admin','content_editor']);
  end if;
  return false;
end $$;
REVOKE EXECUTE ON FUNCTION public.can_transition(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.can_transition(uuid, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.audit_action_for(_from text, _to text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  select case
    when _to = 'in_review' then 'submit_review'
    when _to = 'changes_requested' then 'request_changes'
    when _to = 'approved' then 'approve'
    when _to = 'published' then 'publish'
    when _to = 'retired' then 'retire'
    when _to = 'draft' and _from = 'retired' then 'restore'
    else 'update' end
$$;

-- Guard: validates status transitions, blocks demo approval, blocks direct edits to published rows.
CREATE OR REPLACE FUNCTION public.governance_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare
  uid uuid := auth.uid();
  o jsonb := to_jsonb(OLD); n jsonb := to_jsonb(NEW);
  fs text := o->>'review_status'; ts text := n->>'review_status';
  meta_keys text[] := array['review_status','updated_at','version','submitted_at','reviewed_by','reviewed_at','approved_by','approved_at','published_by','published_at','review_note','change_reason','is_active'];
  content_changed boolean;
  distinct_req boolean;
  patch jsonb := '{}';
begin
  if uid is null or current_setting('app.bypass_guard', true) = 'on' then return NEW; end if;
  content_changed := (o - meta_keys) is distinct from (n - meta_keys);

  if fs = 'published' and ts = 'published' and content_changed then
    raise exception 'PUBLISHED_LOCKED: published content must be changed through a new draft version';
  end if;

  if fs is distinct from ts then
    if not public.can_transition(uid, fs, ts) then
      raise exception 'TRANSITION_DENIED: % -> %', fs, ts;
    end if;
    if ts in ('approved','published') and coalesce((n->>'is_demo')::boolean, false) then
      raise exception 'DEMO_NOT_APPROVABLE: demo content cannot be approved or published';
    end if;
    select coalesce((value #>> '{}')::boolean, false) into distinct_req from public.app_settings where key = 'require_distinct_reviewer';
    if ts = 'approved' and distinct_req and (o->>'created_by') = uid::text then
      raise exception 'SEPARATION_OF_DUTIES: creator cannot approve own content';
    end if;
    if ts = 'in_review' then patch := jsonb_build_object('submitted_at', now());
    elsif ts in ('approved','changes_requested') then patch := jsonb_build_object('reviewed_by', uid, 'reviewed_at', now());
      if ts = 'approved' then patch := patch || jsonb_build_object('approved_by', uid, 'approved_at', now()); end if;
    elsif ts = 'published' then
      patch := jsonb_build_object('published_by', uid, 'published_at', now(),
        'version', (o->>'version')::int + case when o->>'published_at' is null then 0 else 1 end);
    end if;
  elsif content_changed and fs in ('in_review','approved','reviewed','pending_review') then
    patch := jsonb_build_object('review_status', 'draft'); -- edits invalidate review
  end if;
  if patch <> '{}' then NEW := jsonb_populate_record(NEW, patch); end if;
  return NEW;
end $$;

CREATE OR REPLACE FUNCTION public.governance_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare
  uid uuid := auth.uid();
  o jsonb; n jsonb; act text; changed text[];
begin
  if uid is null then return coalesce(NEW, OLD); end if;
  if TG_OP = 'DELETE' then
    insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
    values (uid, 'delete', TG_TABLE_NAME, (to_jsonb(OLD)->>'id')::uuid, '{}');
    return OLD;
  end if;
  n := to_jsonb(NEW);
  if TG_OP = 'INSERT' then
    act := 'create';
  else
    o := to_jsonb(OLD);
    select array_agg(k) into changed from jsonb_object_keys(n) k where (o->k) is distinct from (n->k) and k <> 'updated_at';
    if changed is null then return NEW; end if;
    act := public.audit_action_for(o->>'review_status', n->>'review_status');
    if act = 'update' and (o->>'is_active') is distinct from (n->>'is_active') then
      act := case when (n->>'is_active')::boolean then 'activate' else 'deactivate' end;
    end if;
  end if;
  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, entity_version, metadata)
  values (uid, act, TG_TABLE_NAME, (n->>'id')::uuid, (n->>'version')::int,
    jsonb_build_object('changed_fields', to_jsonb(changed), 'from', o->>'review_status', 'to', n->>'review_status',
      'note', n->>'review_note', 'reason', n->>'change_reason'));
  -- snapshot every published version
  if TG_OP = 'UPDATE' and n->>'review_status' = 'published' and (o->>'review_status') is distinct from 'published'
     and TG_TABLE_NAME in ('symptoms','conditions','questions','red_flags','first_aid_topics') then
    insert into public.content_versions(entity_type, entity_id, version, status, snapshot, change_reason, created_by, published_by, published_at)
    values (TG_TABLE_NAME, (n->>'id')::uuid, (n->>'version')::int, 'published', n, n->>'change_reason', uid, uid, now());
  end if;
  return NEW;
end $$;

-- stamp created_by on insert
CREATE OR REPLACE FUNCTION public.stamp_created_by()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
begin
  if auth.uid() is not null then NEW := jsonb_populate_record(NEW, jsonb_build_object('created_by', auth.uid(), 'review_status', 'draft')); end if;
  return NEW;
end $$;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY array['symptoms','conditions','questions','red_flags','first_aid_topics'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS gov_guard ON public.%I', t);
    EXECUTE format('CREATE TRIGGER gov_guard BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.governance_guard()', t);
    EXECUTE format('DROP TRIGGER IF EXISTS gov_created_by ON public.%I', t);
    EXECUTE format('CREATE TRIGGER gov_created_by BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.stamp_created_by()', t);
  END LOOP;
  FOREACH t IN ARRAY array['symptoms','conditions','questions','red_flags','first_aid_topics','first_aid_sections','condition_symptoms','question_options','question_rules','red_flag_rules','medical_sources','condition_sources','first_aid_sources','question_sources','red_flag_sources','emergency_contacts'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS gov_audit ON public.%I', t);
    EXECUTE format('CREATE TRIGGER gov_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.governance_audit()', t);
  END LOOP;
END $$;

-- version rows: validate transitions too
CREATE OR REPLACE FUNCTION public.version_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare uid uuid := auth.uid();
begin
  if uid is null or current_setting('app.bypass_guard', true) = 'on' then return NEW; end if;
  if OLD.status = 'published' then raise exception 'PUBLISHED_LOCKED'; end if;
  if OLD.status is distinct from NEW.status then
    if NEW.status = 'published' then raise exception 'USE_PUBLISH_FUNCTION'; end if;
    if not public.can_transition(uid, OLD.status, NEW.status) then raise exception 'TRANSITION_DENIED: % -> %', OLD.status, NEW.status; end if;
    if NEW.status = 'approved' and coalesce((NEW.snapshot->>'is_demo')::boolean,false) then raise exception 'DEMO_NOT_APPROVABLE'; end if;
    if NEW.status in ('approved','changes_requested') then NEW.reviewed_by := uid; NEW.reviewed_at := now(); end if;
    insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, entity_version, metadata)
    values (uid, public.audit_action_for(OLD.status, NEW.status), OLD.entity_type, OLD.entity_id, OLD.version,
      jsonb_build_object('version_id', OLD.id, 'from', OLD.status, 'to', NEW.status, 'note', NEW.review_note));
  elsif OLD.snapshot is distinct from NEW.snapshot and OLD.status in ('in_review','approved') then
    NEW.status := 'draft';
  end if;
  return NEW;
end $$;
CREATE TRIGGER content_versions_guard BEFORE UPDATE ON public.content_versions FOR EACH ROW EXECUTE FUNCTION public.version_guard();

-- Publish an approved draft version onto the live row (admin only).
CREATE OR REPLACE FUNCTION public.publish_content_version(_version_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare
  v public.content_versions; cols text; new_version int; uid uuid := auth.uid();
begin
  if not public.has_any_role(uid, array['admin','super_admin']) then raise exception 'FORBIDDEN'; end if;
  select * into v from public.content_versions where id = _version_id for update;
  if v.id is null then raise exception 'NOT_FOUND'; end if;
  if v.status <> 'approved' then raise exception 'NOT_APPROVED'; end if;
  if coalesce((v.snapshot->>'is_demo')::boolean,false) then raise exception 'DEMO_NOT_APPROVABLE'; end if;
  select string_agg(format('%I', column_name), ',') into cols
  from information_schema.columns
  where table_schema='public' and table_name = v.entity_type
    and column_name not in ('id','created_at','updated_at','created_by','review_status','version','published_at','published_by','is_demo')
    and v.snapshot ? column_name;
  perform set_config('app.bypass_guard', 'on', true);
  execute format('select coalesce(max(version),0)+1 from public.content_versions where entity_type=%L and entity_id=%L and status=''published''', v.entity_type, v.entity_id) into new_version;
  execute format('update public.%I t set (%s) = (select %s from jsonb_populate_record(null::public.%I, $1)), version = $3, review_status = ''published'', published_at = now(), published_by = $4 where id = $2',
    v.entity_type, cols, cols, v.entity_type) using v.snapshot, v.entity_id, new_version, uid;
  update public.content_versions set status='published', version=new_version, published_by=uid, published_at=now() where id=v.id;
  perform set_config('app.bypass_guard', 'off', true);
  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, entity_version, metadata)
  values (uid, 'publish', v.entity_type, v.entity_id, new_version, jsonb_build_object('version_id', v.id, 'reason', v.change_reason, 'source_ids', to_jsonb(v.source_ids)));
  return new_version;
end $$;
REVOKE EXECUTE ON FUNCTION public.publish_content_version(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.publish_content_version(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.governance_guard() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.governance_audit() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.version_guard() FROM public, anon;

-- ===== knowledge releases =====
CREATE TABLE IF NOT EXISTS public.knowledge_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  notes text,
  is_demo boolean NOT NULL DEFAULT false,
  manifest jsonb NOT NULL DEFAULT '{}',
  created_by uuid,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.knowledge_releases TO anon, authenticated;
GRANT ALL ON public.knowledge_releases TO service_role;
ALTER TABLE public.knowledge_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read releases" ON public.knowledge_releases FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.create_knowledge_release(_version text, _notes text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare rid uuid; m jsonb; uid uuid := auth.uid();
begin
  if not public.has_any_role(uid, array['admin','super_admin']) then raise exception 'FORBIDDEN'; end if;
  if _version !~ '^\d{4}\.\d{2}\.\d+$' then raise exception 'BAD_VERSION'; end if;
  m := jsonb_build_object(
    'conditions', (select coalesce(jsonb_object_agg(id, version), '{}') from public.conditions where review_status::text='published'),
    'red_flags', (select coalesce(jsonb_object_agg(id, version), '{}') from public.red_flags where review_status::text='published'),
    'questions', (select coalesce(jsonb_object_agg(id, version), '{}') from public.questions where review_status::text='published'),
    'first_aid_topics', (select coalesce(jsonb_object_agg(id, version), '{}') from public.first_aid_topics where review_status::text='published'));
  insert into public.knowledge_releases(version, notes, manifest, created_by) values (_version, _notes, m, uid) returning id into rid;
  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata) values (uid, 'publish', 'knowledge_releases', rid, jsonb_build_object('version', _version));
  return rid;
end $$;
REVOKE EXECUTE ON FUNCTION public.create_knowledge_release(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_knowledge_release(text, text) TO authenticated, service_role;

INSERT INTO public.knowledge_releases(version, notes, is_demo) VALUES ('2026.09.0-demo', 'DEMO KNOWLEDGE BASE — unreviewed seed content', true)
ON CONFLICT (version) DO NOTHING;

-- ===== session traceability =====
ALTER TABLE public.symptom_sessions
  ADD COLUMN IF NOT EXISTS knowledge_release_id uuid REFERENCES public.knowledge_releases(id),
  ADD COLUMN IF NOT EXISTS knowledge_release_version text;
ALTER TABLE public.session_results
  ADD COLUMN IF NOT EXISTS ruleset_version text,
  ADD COLUMN IF NOT EXISTS condition_version integer;

-- ===== content policies: visibility + staff writes =====
DROP POLICY IF EXISTS "public read" ON public.conditions;
CREATE POLICY "public read" ON public.conditions FOR SELECT TO anon, authenticated USING (public.content_visible(review_status::text, is_demo));
DROP POLICY IF EXISTS "public read" ON public.red_flags;
CREATE POLICY "public read" ON public.red_flags FOR SELECT TO anon, authenticated USING (public.content_visible(review_status::text, is_demo));
DROP POLICY IF EXISTS "public read" ON public.questions;
CREATE POLICY "public read" ON public.questions FOR SELECT TO anon, authenticated USING (public.content_visible(review_status::text, is_demo));
DROP POLICY IF EXISTS "public read" ON public.symptoms;
CREATE POLICY "public read" ON public.symptoms FOR SELECT TO anon, authenticated USING (public.content_visible(review_status::text, is_demo));
DROP POLICY IF EXISTS "public read" ON public.first_aid_sections;
CREATE POLICY "public read" ON public.first_aid_sections FOR SELECT TO anon, authenticated USING (public.content_visible(review_status::text, false));

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY array['symptoms','conditions','questions','red_flags','first_aid_topics','first_aid_sections','condition_symptoms','question_options','question_rules','red_flag_rules','medical_sources','condition_sources','first_aid_sources','question_sources','red_flag_sources','emergency_contacts'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "admin write" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "staff insert" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "staff update" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "admin delete" ON public.%I', t);
    EXECUTE format('CREATE POLICY "staff insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), array[''content_editor'',''admin'',''super_admin'']))', t);
    EXECUTE format('CREATE POLICY "staff update" ON public.%I FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "admin delete" ON public.%I FOR DELETE TO authenticated USING (public.has_any_role(auth.uid(), array[''admin'',''super_admin'']))', t);
    EXECUTE format('GRANT INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
  END LOOP;
END $$;
-- emergency contacts: admins only
DROP POLICY IF EXISTS "staff insert" ON public.emergency_contacts;
DROP POLICY IF EXISTS "staff update" ON public.emergency_contacts;
CREATE POLICY "staff insert" ON public.emergency_contacts FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), array['admin','super_admin']));
CREATE POLICY "staff update" ON public.emergency_contacts FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), array['admin','super_admin'])) WITH CHECK (public.has_any_role(auth.uid(), array['admin','super_admin']));

-- ===== roles management =====
CREATE POLICY "admins read roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_any_role(auth.uid(), array['admin','super_admin']));
CREATE POLICY "super admin grants roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (user_id <> auth.uid() AND (
    public.has_any_role(auth.uid(), array['super_admin'])
    OR (public.has_any_role(auth.uid(), array['admin']) AND role::text IN ('user','content_editor','medical_reviewer'))));
CREATE POLICY "super admin revokes roles" ON public.user_roles FOR DELETE TO authenticated
  USING (user_id <> auth.uid() AND (
    public.has_any_role(auth.uid(), array['super_admin'])
    OR (public.has_any_role(auth.uid(), array['admin']) AND role::text IN ('content_editor','medical_reviewer'))));
GRANT INSERT, DELETE ON public.user_roles TO authenticated;
CREATE POLICY "admins read profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), array['admin','super_admin']));

CREATE OR REPLACE FUNCTION public.audit_roles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if auth.uid() is null then return coalesce(NEW, OLD); end if;
  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), case when TG_OP='INSERT' then 'grant_role' else 'revoke_role' end, 'user_roles',
    coalesce(NEW.user_id, OLD.user_id), jsonb_build_object('role', coalesce(NEW.role, OLD.role)::text));
  return coalesce(NEW, OLD);
end $$;
REVOKE EXECUTE ON FUNCTION public.audit_roles() FROM public, anon;
DROP TRIGGER IF EXISTS user_roles_audit ON public.user_roles;
CREATE TRIGGER user_roles_audit AFTER INSERT OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.audit_roles();

-- ===== AI rate limiting (server only) =====
CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  bucket text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);
GRANT ALL ON public.ai_rate_limits TO service_role;
ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_rate_limit(_bucket text, _limit int, _window_seconds int)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare ws timestamptz := to_timestamp(floor(extract(epoch from now()) / _window_seconds) * _window_seconds); c int;
begin
  insert into public.ai_rate_limits(bucket, window_start, count) values (_bucket, ws, 1)
  on conflict (bucket, window_start) do update set count = public.ai_rate_limits.count + 1
  returning count into c;
  delete from public.ai_rate_limits where window_start < now() - interval '1 day';
  return c <= _limit;
end $$;
REVOKE EXECUTE ON FUNCTION public.consume_rate_limit(text, int, int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, int, int) TO service_role;
