-- Phase 2: store the server-side security re-validation + anti-virus verdict.
alter table public.student_documents add column if not exists security_scan jsonb;
comment on column public.student_documents.security_scan is 'Server-side re-validation + anti-virus verdict (defense in depth, set by the scan-document edge function).';
