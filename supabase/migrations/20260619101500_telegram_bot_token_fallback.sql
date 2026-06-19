-- Let the Telegram admin Edge Function download admin-uploaded files without
-- requiring a separate TELEGRAM_BOT_TOKEN Edge secret. The token is copied from
-- the existing private Telegram notification config and remains server-only.

alter table public.telegram_bot_settings
  add column if not exists bot_token text;

update public.telegram_bot_settings settings
set bot_token = cfg.bot_token,
    updated_at = now()
from private.telegram_notification_config cfg
where settings.id = true
  and cfg.id = true
  and cfg.enabled
  and coalesce(trim(cfg.bot_token), '') <> '';

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

  update public.telegram_bot_settings
  set bot_token = cfg.bot_token,
      updated_at = now()
  where id = true;

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
