-- Políticas de storage para el bucket progress-photos.
-- Correr en el SQL editor de Supabase. Sin esto, TODA subida de foto falla
-- con "new row violates row-level security policy" (verificado 2026-07-07).

drop policy if exists "anon insert progress-photos" on storage.objects;
create policy "anon insert progress-photos" on storage.objects
  for insert to anon
  with check (bucket_id = 'progress-photos');

-- upsert (cambiar la foto del día) necesita también update
drop policy if exists "anon update progress-photos" on storage.objects;
create policy "anon update progress-photos" on storage.objects
  for update to anon
  using (bucket_id = 'progress-photos')
  with check (bucket_id = 'progress-photos');

drop policy if exists "anon select progress-photos" on storage.objects;
create policy "anon select progress-photos" on storage.objects
  for select to anon
  using (bucket_id = 'progress-photos');
