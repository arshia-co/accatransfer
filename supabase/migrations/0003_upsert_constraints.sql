-- PostgREST upserts need non-partial unique indexes for the conflict target.
drop index if exists public.smart_apply_sessions_guest_user_unique;
create unique index smart_apply_sessions_guest_user_unique
  on public.smart_apply_sessions (user_id, guest_session_id);

drop index if exists public.transfer_assessments_guest_user_unique;
create unique index transfer_assessments_guest_user_unique
  on public.transfer_assessments (user_id, guest_draft_id);
