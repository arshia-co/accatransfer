-- Shared target program selection for Smart Apply and AI Transfer.
-- The public catalog remains on accaco.com; this table stores a private,
-- immutable-enough snapshot of the student's exact choice.

create table if not exists public.student_program_selections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product text not null check (product in ('smart_apply', 'ai_transfer')),
  catalog_program_id text not null,
  country text not null check (country in ('Turkey', 'KKTC')),
  city text,
  university_name text not null,
  program_name text not null,
  degree text,
  language text,
  tuition_fee text,
  cash_fee text,
  university_logo text,
  official_url text,
  source text not null default 'accaco',
  catalog_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product)
);

create index if not exists student_program_selections_user_idx
  on public.student_program_selections (user_id, updated_at desc);

alter table public.student_program_selections enable row level security;

drop policy if exists "program selections read own" on public.student_program_selections;
create policy "program selections read own"
  on public.student_program_selections for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "program selections insert own" on public.student_program_selections;
create policy "program selections insert own"
  on public.student_program_selections for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "program selections update own" on public.student_program_selections;
create policy "program selections update own"
  on public.student_program_selections for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "program selections delete own" on public.student_program_selections;
create policy "program selections delete own"
  on public.student_program_selections for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop trigger if exists student_program_selections_set_updated_at on public.student_program_selections;
create trigger student_program_selections_set_updated_at
  before update on public.student_program_selections
  for each row execute function public.set_updated_at();

alter table public.transfer_assessments
  add column if not exists target_university text,
  add column if not exists target_program_id text,
  add column if not exists target_program_snapshot jsonb;

grant select, insert, update, delete on table public.student_program_selections to authenticated;
grant select, insert, update, delete on table public.student_program_selections to service_role;
