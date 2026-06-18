alter table public.profiles
  add column if not exists phone_country_code text,
  add column if not exists phone_number text,
  add column if not exists phone_e164 text;

comment on column public.profiles.phone_country_code is 'Student phone country calling code, for example +90.';
comment on column public.profiles.phone_number is 'Student phone number as entered and confirmed by the student.';
comment on column public.profiles.phone_e164 is 'Normalized phone number for CRM or notification handoff.';
