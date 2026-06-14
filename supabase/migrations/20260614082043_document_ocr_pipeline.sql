-- Shared OCR and human-review pipeline for Smart Apply and AI Transfer.
-- The original private document remains the source of truth.

alter table public.student_documents
  add column if not exists quality_report jsonb not null default '{}'::jsonb,
  add column if not exists ocr_provider text,
  add column if not exists ocr_model text,
  add column if not exists ocr_confidence smallint
    check (ocr_confidence is null or (ocr_confidence between 0 and 100)),
  add column if not exists review_status text not null default 'pending'
    check (review_status in (
      'pending',
      'student_confirmation',
      'confirmed',
      'admin_review',
      'reviewed',
      'rejected'
    )),
  add column if not exists confirmed_extraction jsonb,
  add column if not exists confirmed_at timestamptz,
  add column if not exists review_notes text,
  add column if not exists processed_at timestamptz;

create index if not exists student_documents_review_queue_idx
  on public.student_documents (review_status, updated_at desc)
  where review_status in ('student_confirmation', 'admin_review');

comment on column public.student_documents.ai_extraction is
  'Machine-extracted preliminary document data. Never treated as student-confirmed.';
comment on column public.student_documents.confirmed_extraction is
  'Snapshot explicitly confirmed by the student or reviewed by authorized staff.';

grant select, insert, update, delete on public.student_documents to authenticated;
