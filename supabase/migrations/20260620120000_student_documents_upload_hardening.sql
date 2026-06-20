-- Phase 1 upload hardening: dedup hash, versioning, lock flag, draft status.
alter table public.student_documents
  add column if not exists file_hash text,
  add column if not exists version integer not null default 1,
  add column if not exists replaces_id uuid references public.student_documents(id) on delete set null,
  add column if not exists is_locked boolean not null default false;

comment on column public.student_documents.file_hash is 'SHA-256 of the stored file, for duplicate detection.';
comment on column public.student_documents.is_locked is 'When true the student cannot delete/edit (e.g. submitted/company-bound). Company-issued docs live in user_letters.';

-- Allow a "draft" status for student-staged documents.
alter table public.student_documents drop constraint if exists student_documents_status_check;
alter table public.student_documents add constraint student_documents_status_check
  check (status = any (array['draft','uploaded','processing','review_ready','verified','rejected']));

-- Students may delete their own documents only while they are NOT locked.
drop policy if exists "student documents delete own" on public.student_documents;
create policy "student documents delete own" on public.student_documents
  for delete to authenticated
  using (((select auth.uid()) = user_id) and is_locked = false);

-- Fast duplicate lookups per user.
create index if not exists student_documents_user_hash_idx
  on public.student_documents (user_id, file_hash);
