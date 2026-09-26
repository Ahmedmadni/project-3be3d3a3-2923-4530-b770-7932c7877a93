-- ========== Enums ==========
create type public.app_role as enum ('admin', 'moderator', 'user');
create type public.review_status as enum ('draft','pending_review','reviewed','retired');
create type public.care_level as enum ('emergency','urgent','routine','self_care');
create type public.relationship_type as enum ('supports','weak_support','neutral','contradicts');
create type public.question_type as enum ('yes_no','yes_no_unsure','single_choice','multi_choice','number','text','severity','duration');
create type public.severity_level as enum ('mild','moderate','severe');
create type public.symptom_pattern as enum ('continuous','intermittent','unknown');
create type public.session_status as enum ('in_progress','completed','emergency_redirected','abandoned');
create type public.matching_level as enum ('high','medium','low');
create type public.emergency_service_type as enum ('ambulance','unified_emergency','health_consultation','police','civil_defense');
create type public.source_type as enum ('guideline','government','academic','reference');

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- ========== Roles ==========
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- ========== Profiles ==========
create table public.profiles (
  id uuid primary key,
  display_name text,
  preferred_language text not null default 'ar',
  country_code text not null default 'SA',
  region_code text,
  date_of_birth date,
  sex text check (sex in ('male','female')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ========== Reference tables ==========
create table public.symptoms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_ar text not null, name_en text,
  description_ar text, description_en text,
  category text, body_system text,
  is_active boolean not null default true,
  is_red_flag_candidate boolean not null default false,
  sort_order int not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.conditions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_ar text not null, name_en text,
  summary_ar text, summary_en text,
  when_to_seek_care_ar text,
  category text, specialty text,
  care_level public.care_level not null default 'routine',
  is_active boolean not null default true,
  review_status public.review_status not null default 'draft',
  reviewed_by uuid, reviewed_at timestamptz, version int not null default 1,
  last_medical_review_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.condition_symptoms (
  id uuid primary key default gen_random_uuid(),
  condition_id uuid not null references public.conditions(id) on delete cascade,
  symptom_id uuid not null references public.symptoms(id) on delete cascade,
  relationship_type public.relationship_type not null default 'supports',
  weight numeric not null default 1,
  is_core_symptom boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (condition_id, symptom_id)
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  question_ar text not null, question_en text,
  question_type public.question_type not null,
  category text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  value text not null, label_ar text not null, label_en text,
  sort_order int not null default 0
);

create table public.question_rules (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  trigger_type text not null check (trigger_type in ('symptom_selected','answer_equals','always')),
  symptom_id uuid references public.symptoms(id) on delete cascade,
  condition_id uuid references public.conditions(id) on delete cascade,
  parent_question_id uuid references public.questions(id) on delete cascade,
  operator text not null default 'eq',
  expected_value text,
  priority int not null default 0,
  is_active boolean not null default true
);

create table public.red_flags (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title_ar text not null, title_en text,
  description_ar text, description_en text,
  care_level public.care_level not null check (care_level in ('emergency','urgent')),
  priority int not null default 0,
  is_active boolean not null default true,
  review_status public.review_status not null default 'draft',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.red_flag_rules (
  id uuid primary key default gen_random_uuid(),
  red_flag_id uuid not null references public.red_flags(id) on delete cascade,
  symptom_id uuid references public.symptoms(id) on delete cascade,
  question_id uuid references public.questions(id) on delete cascade,
  operator text not null default 'eq',
  value text,
  severity public.severity_level,
  min_age int, max_age int,
  is_active boolean not null default true
);

create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  country_code text not null,
  region_code text,
  service_type public.emergency_service_type not null,
  name_ar text not null, name_en text,
  phone_number text not null,
  priority int not null default 0,
  is_active boolean not null default true
);

create table public.medical_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null, organization text, url text,
  publication_date date, last_checked_at timestamptz,
  source_type public.source_type not null default 'reference',
  is_active boolean not null default true
);

create table public.condition_sources (
  condition_id uuid not null references public.conditions(id) on delete cascade,
  source_id uuid not null references public.medical_sources(id) on delete cascade,
  primary key (condition_id, source_id)
);

create table public.first_aid_topics (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title_ar text not null, title_en text,
  summary_ar text, summary_en text,
  category text, icon text, priority int not null default 0,
  is_critical boolean not null default false,
  review_status public.review_status not null default 'draft',
  reviewed_by uuid, reviewed_at timestamptz, version int not null default 1,
  last_reviewed_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.first_aid_sections (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.first_aid_topics(id) on delete cascade,
  section_type text not null check (section_type in ('what_is_happening','when_to_call','do_now','dont_do','while_waiting')),
  title_ar text not null, content_ar text,
  sort_order int not null default 0,
  review_status public.review_status not null default 'draft'
);

create table public.first_aid_sources (
  first_aid_topic_id uuid not null references public.first_aid_topics(id) on delete cascade,
  source_id uuid not null references public.medical_sources(id) on delete cascade,
  primary key (first_aid_topic_id, source_id)
);

-- grants + RLS for reference tables: public read, admin write
do $$
declare t text;
begin
  foreach t in array array['symptoms','conditions','condition_symptoms','questions','question_options','question_rules','red_flags','red_flag_rules','emergency_contacts','medical_sources','condition_sources','first_aid_topics','first_aid_sections','first_aid_sources'] loop
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
    execute format('create policy "admin write" on public.%I for all to authenticated using (public.has_role(auth.uid(), ''admin'')) with check (public.has_role(auth.uid(), ''admin''))', t);
  end loop;
end $$;

create trigger symptoms_updated before update on public.symptoms for each row execute function public.set_updated_at();
create trigger conditions_updated before update on public.conditions for each row execute function public.set_updated_at();
create trigger questions_updated before update on public.questions for each row execute function public.set_updated_at();
create trigger red_flags_updated before update on public.red_flags for each row execute function public.set_updated_at();
create trigger fa_updated before update on public.first_aid_topics for each row execute function public.set_updated_at();

-- ========== Session tables (user data) ==========
create table public.symptom_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  guest_session_id uuid,
  status public.session_status not null default 'in_progress',
  age int check (age between 0 and 120),
  sex text check (sex in ('male','female')),
  pregnancy_status text,
  free_text_description text,
  care_level public.care_level,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (user_id is not null or guest_session_id is not null)
);
create index on public.symptom_sessions (user_id, created_at desc);

create table public.session_symptoms (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.symptom_sessions(id) on delete cascade,
  symptom_id uuid not null references public.symptoms(id),
  severity public.severity_level,
  started_when text,
  pattern public.symptom_pattern default 'unknown',
  aggravating_factors text,
  created_at timestamptz not null default now()
);

create table public.session_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.symptom_sessions(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  answer_value jsonb not null,
  created_at timestamptz not null default now()
);

create table public.session_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.symptom_sessions(id) on delete cascade,
  condition_id uuid not null references public.conditions(id),
  matching_score numeric not null,
  matching_level public.matching_level not null,
  explanation_data jsonb not null default '{}',
  rank int not null,
  engine_version text not null,
  created_at timestamptz not null default now()
);

grant select, delete on public.symptom_sessions, public.session_symptoms, public.session_answers, public.session_results to authenticated;
grant all on public.symptom_sessions, public.session_symptoms, public.session_answers, public.session_results to service_role;
alter table public.symptom_sessions enable row level security;
alter table public.session_symptoms enable row level security;
alter table public.session_answers enable row level security;
alter table public.session_results enable row level security;

create policy "own sessions read" on public.symptom_sessions for select to authenticated using (auth.uid() = user_id);
create policy "own sessions delete" on public.symptom_sessions for delete to authenticated using (auth.uid() = user_id);
create or replace function public.owns_session(_session_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.symptom_sessions where id = _session_id and user_id = auth.uid())
$$;
create policy "own session symptoms" on public.session_symptoms for select to authenticated using (public.owns_session(session_id));
create policy "own session answers" on public.session_answers for select to authenticated using (public.owns_session(session_id));
create policy "own session results" on public.session_results for select to authenticated using (public.owns_session(session_id));

-- ========== Seed: DEMO data (not clinically validated) ==========
insert into public.symptoms (code, name_ar, name_en, is_red_flag_candidate, sort_order, is_demo) values
('headache','صداع','Headache',false,1,true),
('dizziness','دوخة','Dizziness',false,2,true),
('fatigue','تعب وإرهاق','Fatigue',false,3,true),
('fever','ارتفاع حرارة','Fever',false,4,true),
('cough','كحة','Cough',false,5,true),
('shortness_of_breath','ضيق تنفس','Shortness of breath',true,6,true),
('chest_pain','ألم صدر','Chest pain',true,7,true),
('abdominal_pain','ألم بطن','Abdominal pain',false,8,true),
('nausea','غثيان','Nausea',false,9,true),
('vomiting','قيء','Vomiting',false,10,true),
('diarrhea','إسهال','Diarrhea',false,11,true),
('constipation','إمساك','Constipation',false,12,true),
('palpitations','خفقان','Palpitations',false,13,true),
('excessive_thirst','عطش زائد','Excessive thirst',false,14,true),
('frequent_urination','كثرة التبول','Frequent urination',false,15,true),
('back_pain','ألم ظهر','Back pain',false,16,true),
('joint_pain','ألم مفاصل','Joint pain',false,17,true),
('fainting','إغماء','Fainting',true,18,true);

insert into public.conditions (code, name_ar, summary_ar, when_to_seek_care_ar, specialty, care_level, review_status, is_demo) values
('demo_anemia','نقص الحديد / الأنيميا','[بيانات تجريبية] انخفاض الهيموغلوبين قد يرتبط بالتعب والدوخة.','[تجريبي] راجع الطبيب إذا استمرت الأعراض.','طب الأسرة / الباطنية','routine','draft',true),
('demo_orthostatic','انخفاض الضغط الانتصابي','[بيانات تجريبية] هبوط مؤقت في الضغط عند الوقوف.','[تجريبي] راجع الطبيب إذا تكررت الدوخة.','الباطنية','routine','draft',true),
('demo_dehydration','الجفاف','[بيانات تجريبية] نقص السوائل قد يرتبط بالدوخة والعطش.','[تجريبي] راجع الطبيب إذا لم تتحسن.','طب الأسرة','self_care','draft',true),
('demo_viral','عدوى فيروسية','[بيانات تجريبية] عدوى شائعة قد ترتبط بالحرارة والإرهاق.','[تجريبي] راجع الطبيب إذا استمرت الحرارة.','طب الأسرة','self_care','draft',true);

insert into public.condition_symptoms (condition_id, symptom_id, relationship_type, weight, is_core_symptom, is_demo)
select c.id, s.id, v.rel::public.relationship_type, v.w, v.core, true from (values
 ('demo_anemia','fatigue','supports',1,true),('demo_anemia','dizziness','supports',1,true),('demo_anemia','palpitations','weak_support',1,false),
 ('demo_orthostatic','dizziness','supports',1,true),('demo_orthostatic','fainting','weak_support',1,false),
 ('demo_dehydration','excessive_thirst','supports',1,true),('demo_dehydration','dizziness','weak_support',1,false),('demo_dehydration','fatigue','weak_support',1,false),('demo_dehydration','diarrhea','weak_support',1,false),
 ('demo_viral','fever','supports',1,true),('demo_viral','fatigue','weak_support',1,false),('demo_viral','cough','weak_support',1,false),('demo_viral','headache','weak_support',1,false)
) v(cc, sc, rel, w, core) join public.conditions c on c.code = v.cc join public.symptoms s on s.code = v.sc;

insert into public.questions (code, question_ar, question_type, sort_order, is_demo) values
('dz_standing','هل تحدث الدوخة عند الوقوف بسرعة؟','yes_no_unsure',1,true),
('dz_faint','هل حدث إغماء أو فقدان وعي؟','yes_no',2,true),
('dz_faint_repeat','هل تكرر الإغماء أكثر من مرة؟','yes_no',3,true),
('cp_radiate','هل يمتد الألم إلى الذراع أو الفك أو الظهر؟','yes_no_unsure',4,true),
('dy_rest','هل تشعر بصعوبة شديدة في التنفس أثناء الراحة؟','yes_no',5,true),
('fv_days','هل استمرت الحرارة أكثر من ثلاثة أيام؟','yes_no_unsure',6,true),
('hd_sudden','هل هذا أسوأ صداع شعرت به وبدأ فجأة؟','yes_no_unsure',7,true),
('gen_worse','هل تزداد الأعراض سوءًا مع الوقت؟','yes_no_unsure',99,true);

insert into public.question_options (question_id, value, label_ar, sort_order)
select q.id, o.v, o.l, o.s from public.questions q
cross join (values ('yes','نعم',1),('no','لا',2),('unsure','غير متأكد',3)) o(v,l,s)
where q.question_type = 'yes_no_unsure' or (q.question_type = 'yes_no' and o.v <> 'unsure');

insert into public.question_rules (question_id, trigger_type, symptom_id, priority)
select q.id, 'symptom_selected', s.id, 1 from (values
 ('dz_standing','dizziness'),('dz_faint','dizziness'),('cp_radiate','chest_pain'),('dy_rest','shortness_of_breath'),('fv_days','fever'),('hd_sudden','headache')
) v(qc, sc) join public.questions q on q.code = v.qc join public.symptoms s on s.code = v.sc;
insert into public.question_rules (question_id, trigger_type, parent_question_id, operator, expected_value, priority)
select q.id, 'answer_equals', p.id, 'eq', 'yes', 2 from public.questions q, public.questions p where q.code='dz_faint_repeat' and p.code='dz_faint';
insert into public.question_rules (question_id, trigger_type, priority)
select id, 'always', 9 from public.questions where code='gen_worse';

insert into public.red_flags (code, title_ar, care_level, priority, is_demo) values
('severe_chest_pain','ألم صدر شديد','emergency',100,true),
('severe_dyspnea','صعوبة شديدة في التنفس','emergency',100,true),
('loss_of_consciousness','فقدان وعي','emergency',90,true),
('thunderclap_headache','صداع مفاجئ شديد','emergency',90,true),
('any_severe_symptom','عرض شديد','urgent',10,true);

insert into public.red_flag_rules (red_flag_id, symptom_id, question_id, operator, value, severity)
select f.id, s.id, q.id, v.op, v.val, v.sev::public.severity_level from (values
 ('severe_chest_pain','chest_pain',null,'selected',null,'severe'),
 ('severe_dyspnea','shortness_of_breath',null,'selected',null,'severe'),
 ('severe_dyspnea',null,'dy_rest','eq','yes',null),
 ('loss_of_consciousness',null,'dz_faint','eq','yes',null),
 ('loss_of_consciousness','fainting',null,'selected',null,null),
 ('thunderclap_headache',null,'hd_sudden','eq','yes',null),
 ('any_severe_symptom',null,null,'any_severity','severe','severe')
) v(fc, sc, qc, op, val, sev)
join public.red_flags f on f.code = v.fc
left join public.symptoms s on s.code = v.sc
left join public.questions q on q.code = v.qc;

insert into public.emergency_contacts (country_code, region_code, service_type, name_ar, name_en, phone_number, priority) values
('SA', null, 'ambulance', 'الإسعاف (الهلال الأحمر)', 'Ambulance', '997', 100),
('SA', null, 'health_consultation', 'وزارة الصحة - الاستشارات الصحية', 'MOH Health Consultation', '937', 50),
('SA', 'RIY', 'unified_emergency', 'الطوارئ الموحد', 'Unified Emergency', '911', 90),
('SA', 'MKK', 'unified_emergency', 'الطوارئ الموحد', 'Unified Emergency', '911', 90),
('SA', 'EP', 'unified_emergency', 'الطوارئ الموحد', 'Unified Emergency', '911', 90),
('SA', 'MDN', 'unified_emergency', 'الطوارئ الموحد', 'Unified Emergency', '911', 90);

insert into public.first_aid_topics (code, title_ar, summary_ar, icon, is_critical, priority) values
('bleeding','نزيف وجروح','التعامل الأولي مع الجروح والنزيف.','Droplet',true,1),
('burns','حروق','خطوات أولية للحروق البسيطة والشديدة.','Flame',false,2),
('fainting','إغماء','ما يجب فعله عند فقدان الوعي المؤقت.','PersonStanding',false,3),
('choking','اختناق','التعامل مع انسداد مجرى الهواء.','Wind',true,4),
('seizures','تشنجات','كيف تحمي الشخص أثناء النوبة.','Zap',true,5),
('head_injury','إصابات الرأس','علامات يجب الانتباه لها بعد الإصابة.','Brain',false,6),
('fractures','كسور','تثبيت الإصابة حتى وصول المساعدة.','Bone',false,7),
('poisoning','تسمم','خطوات أولية عند الاشتباه بالتسمم.','FlaskConical',true,8),
('anaphylaxis','حساسية شديدة','التعرف على الحساسية المفرطة.','ShieldAlert',true,9),
('chest_pain','ألم الصدر','متى يكون ألم الصدر حالة طارئة.','HeartPulse',true,10),
('breathing','ضيق التنفس','التعامل مع صعوبة التنفس المفاجئة.','Activity',true,11),
('eye_injury','إصابات العين','حماية العين حتى التقييم الطبي.','Eye',false,12);