-- Server-only outbound email settings for the Telegram admin bot.
-- Browser clients never receive grants for this table; Edge Functions read it
-- with service_role only.

create table if not exists public.email_delivery_settings (
  id boolean primary key default true,
  provider text not null default 'resend' check (provider in ('resend')),
  resend_api_key text,
  from_address text not null default 'ACCA Admissions <no-reply@accatransfer.com>',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_delivery_settings_singleton check (id = true)
);

insert into public.email_delivery_settings (id)
values (true)
on conflict (id) do nothing;

drop trigger if exists email_delivery_settings_set_updated_at on public.email_delivery_settings;
create trigger email_delivery_settings_set_updated_at
  before update on public.email_delivery_settings
  for each row execute function public.set_updated_at();

alter table public.email_delivery_settings enable row level security;

drop policy if exists "email delivery settings deny client access" on public.email_delivery_settings;
create policy "email delivery settings deny client access"
  on public.email_delivery_settings for all to anon, authenticated
  using (false) with check (false);

revoke all on table public.email_delivery_settings from anon, authenticated;
grant select, insert, update, delete on table public.email_delivery_settings to service_role;
