-- Final Smart Apply / AI Transfer submission pipeline.
-- The browser can read its own submission status, while creation and Telegram
-- delivery are reserved for the authenticated Edge Function and service role.

create table if not exists public.application_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product text not null check (product in ('smart_apply', 'ai_transfer')),
  intent text not null check (intent in ('apply', 'consultation')),
  status text not null default 'submitted'
    check (status in ('submitted', 'queued', 'delivered', 'partial', 'failed')),
  program_selection_id uuid references public.student_program_selections (id) on delete set null,
  consent_at timestamptz not null,
  readiness_snapshot jsonb not null default '{}'::jsonb,
  payload_snapshot jsonb not null default '{}'::jsonb,
  dossier_bucket text,
  dossier_path text,
  queued_items integer not null default 0,
  delivery_error text,
  submitted_at timestamptz not null default now(),
  delivered_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists application_submissions_user_idx
  on public.application_submissions (user_id, submitted_at desc);

alter table public.application_submissions enable row level security;

drop policy if exists "submissions read own" on public.application_submissions;
create policy "submissions read own"
  on public.application_submissions for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop trigger if exists application_submissions_set_updated_at
  on public.application_submissions;
create trigger application_submissions_set_updated_at
  before update on public.application_submissions
  for each row execute function public.set_updated_at();

revoke all on table public.application_submissions from anon, authenticated;
grant select on table public.application_submissions to authenticated;
grant select, insert, update, delete on table public.application_submissions to service_role;

create table if not exists public.application_delivery_queue (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.application_submissions (id) on delete cascade,
  item_type text not null check (item_type in ('summary', 'document', 'dossier')),
  document_id uuid references public.student_documents (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'queued', 'failed')),
  net_request_id bigint,
  delivery_error text,
  created_at timestamptz not null default now(),
  queued_at timestamptz
);

create index if not exists application_delivery_queue_submission_idx
  on public.application_delivery_queue (submission_id, created_at);

alter table public.application_delivery_queue enable row level security;
revoke all on table public.application_delivery_queue from anon, authenticated;
grant select, insert, update, delete on table public.application_delivery_queue to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'application-dossiers',
  'application-dossiers',
  false,
  5242880,
  array['application/json']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.notify_telegram_application_delivery()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  cfg record;
  endpoint text;
  request_body jsonb;
  request_id bigint;
begin
  select bot_token, chat_id, enabled
  into cfg
  from private.telegram_notification_config
  where id = true;

  if not found or not cfg.enabled or coalesce(trim(cfg.chat_id), '') = '' then
    update public.application_delivery_queue
    set status = 'failed',
        delivery_error = 'Telegram delivery is not configured.'
    where id = new.id;
    return new;
  end if;

  if new.item_type = 'summary' then
    endpoint := 'sendMessage';
    request_body := jsonb_build_object(
      'chat_id', cfg.chat_id,
      'text', new.payload ->> 'text',
      'disable_web_page_preview', true,
      'protect_content', true
    );
  else
    endpoint := 'sendDocument';
    request_body := jsonb_build_object(
      'chat_id', cfg.chat_id,
      'document', new.payload ->> 'url',
      'caption', left(coalesce(new.payload ->> 'caption', ''), 1024),
      'protect_content', true
    );
  end if;

  select net.http_post(
    url := 'https://api.telegram.org/bot' || cfg.bot_token || '/' || endpoint,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := request_body,
    timeout_milliseconds := 10000
  ) into request_id;

  update public.application_delivery_queue
  set status = 'queued',
      net_request_id = request_id,
      queued_at = now()
  where id = new.id;

  return new;
exception
  when others then
    update public.application_delivery_queue
    set status = 'failed',
        delivery_error = left(sqlerrm, 500)
    where id = new.id;
    return new;
end;
$$;

revoke all on function private.notify_telegram_application_delivery() from public;

drop trigger if exists application_delivery_queue_telegram
  on public.application_delivery_queue;
create trigger application_delivery_queue_telegram
  after insert on public.application_delivery_queue
  for each row execute function private.notify_telegram_application_delivery();
