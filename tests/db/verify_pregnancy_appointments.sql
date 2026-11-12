-- Verify real PostgreSQL RLS on a temporary CI service with synthetic accounts.
DO $$
BEGIN
  IF (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.pregnancy_appointments'::regclass) IS NOT TRUE
  THEN RAISE EXCEPTION 'RLS must be enabled'; END IF;

  IF (SELECT count(*) FROM pg_policies WHERE schemaname='public'
      AND tablename='pregnancy_appointments' AND cmd IN ('SELECT','INSERT','UPDATE','DELETE')) <> 4
  THEN RAISE EXCEPTION 'Missing one or more RLS policies'; END IF;

  IF (SELECT count(*) FROM public.pregnancy_appointments) <> 2
  THEN RAISE EXCEPTION 'Legacy migration backfill must create two test appointments'; END IF;

  IF has_table_privilege('anon', 'public.pregnancy_appointments', 'SELECT')
  THEN RAISE EXCEPTION 'Anonymous SELECT grant detected'; END IF;
END
$$;

BEGIN;
  SET LOCAL ROLE anon;
  DO $$
  BEGIN
    BEGIN
      PERFORM id FROM public.pregnancy_appointments LIMIT 1;
      RAISE EXCEPTION 'Anonymous role unexpectedly read the appointments table';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
  END
  $$;
ROLLBACK;

BEGIN;
  SET LOCAL ROLE authenticated;
  SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111', true);

  DO $$
  BEGIN
    IF (SELECT count(*) FROM public.pregnancy_appointments) <> 1
    THEN RAISE EXCEPTION 'User A should see only their own backfilled appointment'; END IF;
  END $$;

  INSERT INTO public.pregnancy_appointments (id,user_id,appointment_date,kind,title)
  VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111', '2026-12-13', 'test', 'A test appointment');

  UPDATE public.pregnancy_appointments SET title='A updated'
  WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  DO $$
  BEGIN
    IF (SELECT title FROM public.pregnancy_appointments
        WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 'A updated'
    THEN RAISE EXCEPTION 'Owner cannot edit their own appointment'; END IF;
  END $$;

  SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222', true);
  DO $$
  BEGIN
    IF (SELECT count(*) FROM public.pregnancy_appointments) <> 1
    THEN RAISE EXCEPTION 'User B must see only their own appointment'; END IF;

    IF EXISTS (SELECT 1 FROM public.pregnancy_appointments
       WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    THEN RAISE EXCEPTION 'User B can read user A appointment'; END IF;

    BEGIN
      INSERT INTO public.pregnancy_appointments (user_id,appointment_date,title)
      VALUES ('11111111-1111-4111-8111-111111111111','2026-12-14','Spoofed owner');
      RAISE EXCEPTION 'User B forged an appointment for User A';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
  END $$;

  UPDATE public.pregnancy_appointments SET title='Tampered'
    WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  DELETE FROM public.pregnancy_appointments
    WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111', true);
  DO $$
  BEGIN
    IF (SELECT title FROM public.pregnancy_appointments
        WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 'A updated'
    THEN RAISE EXCEPTION 'Cross-account edit or delete was possible'; END IF;
  END $$;

  DELETE FROM public.pregnancy_appointments
  WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM public.pregnancy_appointments
        WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    THEN RAISE EXCEPTION 'Owner cannot delete their own appointment'; END IF;
  END $$;
ROLLBACK;

-- This is not a production privilege smoke test. Owner policies on live
-- infrastructure and client auth behavior still require external acceptance.
