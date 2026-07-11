-- Live account panel (Supabase Realtime).
--
-- The account portal opens a Realtime channel (subscribeAccountRealtime) that
-- watches the signed-in student's own rows and shows in-panel toasts when a
-- document is reviewed, grades/OCR are extracted, a transfer result refreshes,
-- an application status/stage advances, or a server notification arrives.
--
-- Two things are required for that to work and are set up idempotently here:
--   1. The tables must be in the `supabase_realtime` publication.
--   2. UPDATE events must carry the previous row so the client can detect the
--      TRANSITION (e.g. review_status pending -> confirmed). That needs
--      REPLICA IDENTITY FULL; otherwise `old` only contains the primary key.

do $$
declare
  t text;
  tables text[] := array[
    'user_notifications',
    'student_documents',
    'transfer_assessments',
    'application_submissions',
    'profiles'
  ];
begin
  foreach t in array tables loop
    -- Skip tables that don't exist in this project (defensive).
    if to_regclass(format('public.%I', t)) is null then
      continue;
    end if;

    -- Full row on UPDATE so the client sees old + new values.
    execute format('alter table public.%I replica identity full', t);

    -- Add to the realtime publication only if not already a member.
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
