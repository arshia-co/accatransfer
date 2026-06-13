-- ACCA Smart Apply + ACCA AI Transfer production account foundation.
-- All student records are private and owner-scoped through Row Level Security.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  language text default 'fa',
  current_product text check (current_product in ('smart_apply', 'ai_transfer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists current_product text
    check (current_product in ('smart_apply', 'ai_transfer'));

alter table public.profiles enable row level security;

drop policy if exists "profiles read own" on public.profiles;
create policy "profiles read own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles upsert own" on public.profiles;
create policy "profiles insert own"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, language, current_product)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'language', ''), 'fa'),
    case
      when new.raw_user_meta_data ->> 'current_product' in ('smart_apply', 'ai_transfer')
        then new.raw_user_meta_data ->> 'current_product'
      else null
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table if not exists public.smart_apply_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  guest_session_id text,
  language text default 'fa',
  goal text,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'preliminary_result', 'application_started', 'archived')),
  profile_snapshot jsonb not null default '{}'::jsonb,
  result jsonb,
  transcript jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.smart_apply_sessions
  add column if not exists guest_session_id text,
  add column if not exists status text not null default 'in_progress',
  add column if not exists profile_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists smart_apply_sessions_guest_user_unique
  on public.smart_apply_sessions (user_id, guest_session_id);

create index if not exists smart_apply_sessions_user_idx
  on public.smart_apply_sessions (user_id, updated_at desc);

alter table public.smart_apply_sessions enable row level security;

drop policy if exists "sessions read own" on public.smart_apply_sessions;
create policy "sessions read own"
  on public.smart_apply_sessions for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "sessions insert own" on public.smart_apply_sessions;
create policy "sessions insert own"
  on public.smart_apply_sessions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "sessions update own" on public.smart_apply_sessions;
create policy "sessions update own"
  on public.smart_apply_sessions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "sessions delete own" on public.smart_apply_sessions;
create policy "sessions delete own"
  on public.smart_apply_sessions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop trigger if exists smart_apply_sessions_set_updated_at on public.smart_apply_sessions;
create trigger smart_apply_sessions_set_updated_at
  before update on public.smart_apply_sessions
  for each row execute function public.set_updated_at();

create table if not exists public.transfer_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  guest_draft_id text,
  current_university text,
  current_program text,
  target_country text,
  target_program text,
  status text not null default 'draft'
    check (status in ('draft', 'documents_ready', 'analyzing', 'preliminary_result', 'human_review', 'archived')),
  ai_result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists transfer_assessments_guest_user_unique
  on public.transfer_assessments (user_id, guest_draft_id);

create index if not exists transfer_assessments_user_idx
  on public.transfer_assessments (user_id, updated_at desc);

alter table public.transfer_assessments enable row level security;

create policy "transfer assessments read own"
  on public.transfer_assessments for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "transfer assessments insert own"
  on public.transfer_assessments for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "transfer assessments update own"
  on public.transfer_assessments for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "transfer assessments delete own"
  on public.transfer_assessments for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create trigger transfer_assessments_set_updated_at
  before update on public.transfer_assessments
  for each row execute function public.set_updated_at();

create table if not exists public.student_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product text not null check (product in ('smart_apply', 'ai_transfer')),
  assessment_id uuid references public.transfer_assessments (id) on delete set null,
  document_kind text not null,
  bucket_id text not null default 'student-documents',
  object_path text not null unique,
  original_name text not null,
  mime_type text,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 15728640),
  status text not null default 'uploaded'
    check (status in ('uploaded', 'processing', 'review_ready', 'verified', 'rejected')),
  ai_extraction jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_documents_user_idx
  on public.student_documents (user_id, product, created_at desc);

alter table public.student_documents enable row level security;

create policy "student documents read own"
  on public.student_documents for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "student documents insert own"
  on public.student_documents for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "student documents update own"
  on public.student_documents for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "student documents delete own"
  on public.student_documents for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create trigger student_documents_set_updated_at
  before update on public.student_documents
  for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-documents',
  'student-documents',
  false,
  15728640,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "students upload own documents" on storage.objects;
create policy "students upload own documents"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'student-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "students read own documents" on storage.objects;
create policy "students read own documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'student-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "students update own documents" on storage.objects;
create policy "students update own documents"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'student-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'student-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "students delete own documents" on storage.objects;
create policy "students delete own documents"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'student-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.smart_apply_sessions to authenticated;
grant select, insert, update, delete on public.transfer_assessments to authenticated;
grant select, insert, update, delete on public.student_documents to authenticated;
