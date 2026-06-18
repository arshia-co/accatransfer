-- Status-change emails and Telegram-admin attachments.
-- Files uploaded by admins stay in the private student-documents bucket and
-- are linked to the central student account through notifications/letters.

update storage.buckets
set
  public = false,
  file_size_limit = 15728640,
  allowed_mime_types = array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
where id = 'student-documents';

create table if not exists public.user_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  application_id uuid references public.application_submissions (id) on delete set null,
  document_id uuid references public.student_documents (id) on delete set null,
  title text not null,
  letter_type text not null,
  admin_message text,
  bucket_id text,
  object_path text,
  original_name text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes > 0),
  visibility text not null default 'student_panel'
    check (visibility in ('student_panel', 'internal')),
  email_status text not null default 'not_requested',
  panel_status text not null default 'visible'
    check (panel_status in ('visible', 'hidden', 'archived')),
  created_by_admin_id uuid references public.telegram_admins (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_letters_user_idx
  on public.user_letters (user_id, created_at desc);
create index if not exists user_letters_application_idx
  on public.user_letters (application_id, created_at desc)
  where application_id is not null;
create index if not exists user_letters_document_idx
  on public.user_letters (document_id)
  where document_id is not null;

drop trigger if exists user_letters_set_updated_at on public.user_letters;
create trigger user_letters_set_updated_at
  before update on public.user_letters
  for each row execute function public.set_updated_at();

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  application_id uuid references public.application_submissions (id) on delete set null,
  letter_id uuid references public.user_letters (id) on delete set null,
  recipient_email text,
  subject text not null,
  body_text text,
  body_html text,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'failed', 'skipped')),
  provider text not null default 'resend',
  provider_message_id text,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_admin_id uuid references public.telegram_admins (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_logs_user_idx
  on public.email_logs (user_id, created_at desc)
  where user_id is not null;
create index if not exists email_logs_application_idx
  on public.email_logs (application_id, created_at desc)
  where application_id is not null;
create index if not exists email_logs_status_idx
  on public.email_logs (status, created_at desc);

drop trigger if exists email_logs_set_updated_at on public.email_logs;
create trigger email_logs_set_updated_at
  before update on public.email_logs
  for each row execute function public.set_updated_at();

alter table public.user_notifications
  add column if not exists document_id uuid references public.student_documents (id) on delete set null,
  add column if not exists letter_id uuid references public.user_letters (id) on delete set null,
  add column if not exists email_log_id uuid references public.email_logs (id) on delete set null;

create index if not exists user_notifications_letter_idx
  on public.user_notifications (letter_id)
  where letter_id is not null;
create index if not exists user_notifications_document_idx
  on public.user_notifications (document_id)
  where document_id is not null;

alter table public.application_status_history
  add column if not exists notification_id uuid references public.user_notifications (id) on delete set null,
  add column if not exists document_id uuid references public.student_documents (id) on delete set null,
  add column if not exists letter_id uuid references public.user_letters (id) on delete set null,
  add column if not exists email_log_id uuid references public.email_logs (id) on delete set null,
  add column if not exists admin_message text;

create index if not exists application_status_history_notification_idx
  on public.application_status_history (notification_id)
  where notification_id is not null;

alter table public.user_letters enable row level security;
alter table public.email_logs enable row level security;

drop policy if exists "user letters read own visible" on public.user_letters;
create policy "user letters read own visible"
  on public.user_letters for select to authenticated
  using ((select auth.uid()) = user_id and panel_status = 'visible' and visibility = 'student_panel');

drop policy if exists "user letters deny client writes" on public.user_letters;
create policy "user letters deny client writes"
  on public.user_letters for all to anon, authenticated
  using (false) with check (false);

drop policy if exists "email logs deny client access" on public.email_logs;
create policy "email logs deny client access"
  on public.email_logs for all to anon, authenticated
  using (false) with check (false);

revoke all on table public.user_letters, public.email_logs from anon, authenticated;
grant select on table public.user_letters to authenticated;
grant select, insert, update, delete on table public.user_letters, public.email_logs to service_role;
