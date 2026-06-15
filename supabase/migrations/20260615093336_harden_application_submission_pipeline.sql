-- Make the intentionally private delivery queue explicit to the RLS advisor.
-- The authenticated role has no table grants and this policy denies all rows.
drop policy if exists "delivery queue deny client access"
  on public.application_delivery_queue;
create policy "delivery queue deny client access"
  on public.application_delivery_queue
  for all
  to authenticated
  using (false)
  with check (false);

create index if not exists application_submissions_program_selection_idx
  on public.application_submissions (program_selection_id)
  where program_selection_id is not null;

create index if not exists application_delivery_queue_document_idx
  on public.application_delivery_queue (document_id)
  where document_id is not null;
