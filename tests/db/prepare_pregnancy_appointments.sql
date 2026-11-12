-- Ephemeral CI database only. Never run this fixture against a user database.
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE service_role NOLOGIN;

CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid
  LANGUAGE sql STABLE
  AS 'SELECT NULLIF(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';

GRANT USAGE ON SCHEMA public, auth TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;

CREATE TABLE public.pregnancy_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  next_appointment date
);

INSERT INTO auth.users (id) VALUES
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');

INSERT INTO public.pregnancy_tracking (user_id, next_appointment) VALUES
 ('11111111-1111-4111-8111-111111111111', '2026-12-10'),
 ('22222222-2222-4222-8222-222222222222', '2026-12-11');
