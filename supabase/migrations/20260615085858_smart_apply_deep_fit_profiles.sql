-- Private, resumable ACCA Deep Fit progress for signed-in Smart Apply users.
-- The first 25 answers may be seeded from the guest discovery; the remaining
-- core and adaptive answers continue in the same conversation.

create table if not exists public.smart_apply_deep_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed')),
  answers jsonb not null default '[]'::jsonb
    check (jsonb_typeof(answers) = 'array'),
  adaptive_question_ids jsonb not null default '[]'::jsonb
    check (jsonb_typeof(adaptive_question_ids) = 'array'),
  result jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists smart_apply_deep_profiles_user_idx
  on public.smart_apply_deep_profiles (user_id, updated_at desc);

alter table public.smart_apply_deep_profiles enable row level security;

drop policy if exists "deep profiles read own" on public.smart_apply_deep_profiles;
create policy "deep profiles read own"
  on public.smart_apply_deep_profiles for select
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "deep profiles insert own" on public.smart_apply_deep_profiles;
create policy "deep profiles insert own"
  on public.smart_apply_deep_profiles for insert
  to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "deep profiles update own" on public.smart_apply_deep_profiles;
create policy "deep profiles update own"
  on public.smart_apply_deep_profiles for update
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "deep profiles delete own" on public.smart_apply_deep_profiles;
create policy "deep profiles delete own"
  on public.smart_apply_deep_profiles for delete
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop trigger if exists smart_apply_deep_profiles_set_updated_at
  on public.smart_apply_deep_profiles;
create trigger smart_apply_deep_profiles_set_updated_at
  before update on public.smart_apply_deep_profiles
  for each row execute function public.set_updated_at();

-- Explicit grants are required for Data API exposure on current Supabase
-- projects; RLS still restricts every authenticated request to its owner.
revoke all on table public.smart_apply_deep_profiles from anon;
grant select, insert, update, delete
  on table public.smart_apply_deep_profiles to authenticated;
grant select, insert, update, delete
  on table public.smart_apply_deep_profiles to service_role;
