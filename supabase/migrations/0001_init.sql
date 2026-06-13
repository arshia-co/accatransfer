-- ACCA Smart Apply — initial schema (run on the NEW Supabase project).
-- Two tables, both row-level-security gated so a signed-in student can only
-- ever read/write their own rows. Safe to run with: supabase db push

-- ── profiles: one row per auth user ──────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  language    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles read own" on public.profiles;
create policy "profiles read own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles upsert own" on public.profiles;
create policy "profiles upsert own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', null))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── smart_apply_sessions: saved discovery results + transcript ────────────
create table if not exists public.smart_apply_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  language    text,
  goal        text,
  result      jsonb,         -- the full discovery result object
  transcript  jsonb,         -- optional saved conversation
  created_at  timestamptz not null default now()
);

alter table public.smart_apply_sessions enable row level security;

drop policy if exists "sessions read own" on public.smart_apply_sessions;
create policy "sessions read own" on public.smart_apply_sessions
  for select using (auth.uid() = user_id);

drop policy if exists "sessions insert own" on public.smart_apply_sessions;
create policy "sessions insert own" on public.smart_apply_sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists "sessions update own" on public.smart_apply_sessions;
create policy "sessions update own" on public.smart_apply_sessions
  for update using (auth.uid() = user_id);

create index if not exists smart_apply_sessions_user_idx
  on public.smart_apply_sessions (user_id, created_at desc);
