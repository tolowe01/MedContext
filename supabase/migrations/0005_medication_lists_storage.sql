-- Private Storage bucket for uploaded medication-list PDFs (PHI).
-- Objects are stored as <pharmacy_id>/<patient_id>/<filename>.pdf so RLS can
-- authorize on the first path segment. Serve via signed URLs only.

insert into storage.buckets (id, name, public)
values ('medication-lists', 'medication-lists', false)
on conflict (id) do nothing;

-- Only a pharmacist of the owning pharmacy may read/write objects in their folder.
create policy "pharmacy_read_medication_lists" on storage.objects
  for select to authenticated using (
    bucket_id = 'medication-lists'
    and public.current_user_role() = 'pharmacist'
    and (storage.foldername(name))[1] = public.current_pharmacy_id()::text
  );

create policy "pharmacy_insert_medication_lists" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'medication-lists'
    and public.current_user_role() = 'pharmacist'
    and (storage.foldername(name))[1] = public.current_pharmacy_id()::text
  );

create policy "pharmacy_update_medication_lists" on storage.objects
  for update to authenticated using (
    bucket_id = 'medication-lists'
    and public.current_user_role() = 'pharmacist'
    and (storage.foldername(name))[1] = public.current_pharmacy_id()::text
  );

create policy "pharmacy_delete_medication_lists" on storage.objects
  for delete to authenticated using (
    bucket_id = 'medication-lists'
    and public.current_user_role() = 'pharmacist'
    and (storage.foldername(name))[1] = public.current_pharmacy_id()::text
  );
