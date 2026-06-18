-- Telegram admin panel foundation for ACCA Leads.
-- All admin surfaces are private to trusted server-side code. Browser clients
-- never receive admin table grants; service_role is used only inside Edge
-- Functions and other trusted automation.

create extension if not exists pgcrypto;
create schema if not exists private;

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

create table if not exists public.telegram_admin_roles (
  role text primary key,
  label text not null,
  permissions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.telegram_admin_roles (role, label, permissions) values
  ('super_admin', 'Super Admin', '["*"]'::jsonb),
  ('admin', 'Admin', '["view_users","manage_users","view_applications","manage_applications","view_documents","manage_documents","manage_letters","send_notifications","view_stats","view_logs"]'::jsonb),
  ('admissions_officer', 'Admissions Officer', '["view_users","view_applications","manage_applications","manage_letters","send_notifications","view_stats"]'::jsonb),
  ('document_reviewer', 'Document Reviewer', '["view_users","view_applications","view_documents","manage_documents","view_stats"]'::jsonb),
  ('read_only', 'Read Only', '["view_users","view_applications","view_documents","view_stats"]'::jsonb)
on conflict (role) do update set
  label = excluded.label,
  permissions = excluded.permissions;

create table if not exists public.telegram_admins (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null unique,
  role text not null references public.telegram_admin_roles (role),
  display_name text,
  telegram_username text,
  is_active boolean not null default true,
  created_by uuid references public.telegram_admins (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create index if not exists telegram_admins_role_idx
  on public.telegram_admins (role, is_active);

drop trigger if exists telegram_admins_set_updated_at on public.telegram_admins;
create trigger telegram_admins_set_updated_at
  before update on public.telegram_admins
  for each row execute function public.set_updated_at();

create table if not exists public.telegram_bot_settings (
  id boolean primary key default true,
  webhook_secret text not null default encode(gen_random_bytes(32), 'hex'),
  bot_label text not null default 'ACCA Leads',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint telegram_bot_settings_singleton check (id = true)
);

insert into public.telegram_bot_settings (id)
values (true)
on conflict (id) do nothing;

drop trigger if exists telegram_bot_settings_set_updated_at on public.telegram_bot_settings;
create trigger telegram_bot_settings_set_updated_at
  before update on public.telegram_bot_settings
  for each row execute function public.set_updated_at();

create table if not exists public.telegram_bot_sessions (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null unique,
  chat_id bigint not null,
  state text not null default 'idle',
  context jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists telegram_bot_sessions_expires_idx
  on public.telegram_bot_sessions (expires_at);

drop trigger if exists telegram_bot_sessions_set_updated_at on public.telegram_bot_sessions;
create trigger telegram_bot_sessions_set_updated_at
  before update on public.telegram_bot_sessions
  for each row execute function public.set_updated_at();

create table if not exists public.telegram_bot_callback_refs (
  token text primary key,
  telegram_user_id bigint not null,
  chat_id bigint not null,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists telegram_bot_callback_refs_admin_idx
  on public.telegram_bot_callback_refs (telegram_user_id, expires_at);

create table if not exists public.telegram_admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.telegram_admins (id) on delete set null,
  telegram_user_id bigint,
  admin_display_name text,
  role text,
  action_type text not null,
  target_entity_type text,
  target_entity_id text,
  affected_user_id uuid references auth.users (id) on delete set null,
  application_id uuid references public.application_submissions (id) on delete set null,
  previous_value jsonb,
  new_value jsonb,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'success' check (status in ('success', 'failure')),
  error_message text,
  correlation_id uuid not null default gen_random_uuid(),
  source text not null default 'telegram_bot',
  created_at timestamptz not null default now()
);

create index if not exists telegram_admin_audit_logs_created_idx
  on public.telegram_admin_audit_logs (created_at desc);
create index if not exists telegram_admin_audit_logs_admin_idx
  on public.telegram_admin_audit_logs (admin_id, created_at desc);
create index if not exists telegram_admin_audit_logs_user_idx
  on public.telegram_admin_audit_logs (affected_user_id, created_at desc)
  where affected_user_id is not null;
create index if not exists telegram_admin_audit_logs_application_idx
  on public.telegram_admin_audit_logs (application_id, created_at desc)
  where application_id is not null;

alter table public.application_submissions
  add column if not exists admin_status text not null default 'new',
  add column if not exists assigned_admin_id uuid references public.telegram_admins (id) on delete set null,
  add column if not exists admin_status_updated_at timestamptz;

create index if not exists application_submissions_admin_status_idx
  on public.application_submissions (admin_status, submitted_at desc);
create index if not exists application_submissions_assigned_admin_idx
  on public.application_submissions (assigned_admin_id, submitted_at desc)
  where assigned_admin_id is not null;

create table if not exists public.application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.application_submissions (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  previous_status text,
  new_status text not null,
  changed_by_admin_id uuid references public.telegram_admins (id) on delete set null,
  note text,
  notify_user boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists application_status_history_application_idx
  on public.application_status_history (application_id, created_at desc);
create index if not exists application_status_history_user_idx
  on public.application_status_history (user_id, created_at desc)
  where user_id is not null;

alter table public.student_documents
  add column if not exists reviewer_admin_id uuid references public.telegram_admins (id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists expiration_date date;

create index if not exists student_documents_review_status_idx
  on public.student_documents (review_status, created_at desc);
create index if not exists student_documents_reviewer_idx
  on public.student_documents (reviewer_admin_id, reviewed_at desc)
  where reviewer_admin_id is not null;

create table if not exists public.internal_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  application_id uuid references public.application_submissions (id) on delete cascade,
  document_id uuid references public.student_documents (id) on delete cascade,
  note text not null,
  visibility text not null default 'internal' check (visibility in ('internal', 'student_visible')),
  created_by_admin_id uuid references public.telegram_admins (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists internal_notes_user_idx
  on public.internal_notes (user_id, created_at desc)
  where user_id is not null;
create index if not exists internal_notes_application_idx
  on public.internal_notes (application_id, created_at desc)
  where application_id is not null;

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  application_id uuid references public.application_submissions (id) on delete set null,
  title text not null,
  message text not null,
  notification_type text not null default 'information',
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  action_url text,
  created_by_admin_id uuid references public.telegram_admins (id) on delete set null,
  delivery_status text not null default 'created',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_notifications_user_idx
  on public.user_notifications (user_id, read_at, created_at desc);
create index if not exists user_notifications_application_idx
  on public.user_notifications (application_id, created_at desc)
  where application_id is not null;

alter table public.telegram_admin_roles enable row level security;
alter table public.telegram_admins enable row level security;
alter table public.telegram_bot_settings enable row level security;
alter table public.telegram_bot_sessions enable row level security;
alter table public.telegram_bot_callback_refs enable row level security;
alter table public.telegram_admin_audit_logs enable row level security;
alter table public.application_status_history enable row level security;
alter table public.internal_notes enable row level security;
alter table public.user_notifications enable row level security;

drop policy if exists "telegram admin roles deny client access" on public.telegram_admin_roles;
create policy "telegram admin roles deny client access"
  on public.telegram_admin_roles for all to anon, authenticated
  using (false) with check (false);

drop policy if exists "telegram admins deny client access" on public.telegram_admins;
create policy "telegram admins deny client access"
  on public.telegram_admins for all to anon, authenticated
  using (false) with check (false);

drop policy if exists "telegram bot settings deny client access" on public.telegram_bot_settings;
create policy "telegram bot settings deny client access"
  on public.telegram_bot_settings for all to anon, authenticated
  using (false) with check (false);

drop policy if exists "telegram bot sessions deny client access" on public.telegram_bot_sessions;
create policy "telegram bot sessions deny client access"
  on public.telegram_bot_sessions for all to anon, authenticated
  using (false) with check (false);

drop policy if exists "telegram bot callback refs deny client access" on public.telegram_bot_callback_refs;
create policy "telegram bot callback refs deny client access"
  on public.telegram_bot_callback_refs for all to anon, authenticated
  using (false) with check (false);

drop policy if exists "telegram audit logs deny client access" on public.telegram_admin_audit_logs;
create policy "telegram audit logs deny client access"
  on public.telegram_admin_audit_logs for all to anon, authenticated
  using (false) with check (false);

drop policy if exists "application status history read own" on public.application_status_history;
create policy "application status history read own"
  on public.application_status_history for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "application status history deny client writes" on public.application_status_history;
create policy "application status history deny client writes"
  on public.application_status_history for insert to authenticated
  with check (false);

drop policy if exists "internal notes deny client access" on public.internal_notes;
create policy "internal notes deny client access"
  on public.internal_notes for all to anon, authenticated
  using (false) with check (false);

drop policy if exists "user notifications read own" on public.user_notifications;
create policy "user notifications read own"
  on public.user_notifications for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "user notifications mark own read" on public.user_notifications;
create policy "user notifications mark own read"
  on public.user_notifications for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table
  public.telegram_admin_roles,
  public.telegram_admins,
  public.telegram_bot_settings,
  public.telegram_bot_sessions,
  public.telegram_bot_callback_refs,
  public.telegram_admin_audit_logs,
  public.application_status_history,
  public.internal_notes,
  public.user_notifications
from anon, authenticated;

grant select on table public.application_status_history to authenticated;
grant select, update (read_at) on table public.user_notifications to authenticated;

grant select, insert, update, delete on table
  public.telegram_admin_roles,
  public.telegram_admins,
  public.telegram_bot_settings,
  public.telegram_bot_sessions,
  public.telegram_bot_callback_refs,
  public.application_status_history,
  public.internal_notes,
  public.user_notifications
to service_role;

grant select, insert on table public.telegram_admin_audit_logs to service_role;
grant update (admin_status, assigned_admin_id, admin_status_updated_at, updated_at)
  on table public.application_submissions to service_role;
grant update (status, review_status, review_notes, reviewer_admin_id, reviewed_at, updated_at)
  on table public.student_documents to service_role;

create or replace function private.set_telegram_admin_webhook(function_url text)
returns bigint
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  cfg record;
  settings record;
  request_id bigint;
begin
  select bot_token, enabled
  into cfg
  from private.telegram_notification_config
  where id = true;

  if not found or not cfg.enabled or coalesce(trim(cfg.bot_token), '') = '' then
    raise exception 'Telegram notification config is not enabled or bot token is missing.';
  end if;

  select webhook_secret
  into settings
  from public.telegram_bot_settings
  where id = true;

  if not found or coalesce(trim(settings.webhook_secret), '') = '' then
    raise exception 'Telegram admin webhook secret is missing.';
  end if;

  select net.http_post(
    url := 'https://api.telegram.org/bot' || cfg.bot_token || '/setWebhook',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'url', function_url,
      'secret_token', settings.webhook_secret,
      'allowed_updates', jsonb_build_array('message', 'callback_query'),
      'drop_pending_updates', false
    ),
    timeout_milliseconds := 10000
  ) into request_id;

  return request_id;
end;
$$;

revoke all on function private.set_telegram_admin_webhook(text) from public, anon, authenticated;
