-- Account event emails and the post-acceptance registration-help request.

alter table public.application_submissions
  drop constraint if exists application_submissions_intent_check;

alter table public.application_submissions
  add constraint application_submissions_intent_check
  check (intent in ('apply', 'consultation', 'registration_help'));
