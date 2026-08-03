-- Adjuntos multimedia del chat del asistente (fotos + audio real con transcripción).
-- Correr manualmente en el SQL editor de Supabase (mismo patrón que el resto de schemas).

alter table chat_messages add column if not exists image_url text;
alter table chat_messages add column if not exists audio_url text;

-- Bucket único para ambos tipos de adjunto (paths: images/... y audio/...)
insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', true)
on conflict (id) do nothing;

drop policy if exists "anon insert chat-media" on storage.objects;
create policy "anon insert chat-media" on storage.objects
  for insert to anon
  with check (bucket_id = 'chat-media');

drop policy if exists "anon select chat-media" on storage.objects;
create policy "anon select chat-media" on storage.objects
  for select to anon
  using (bucket_id = 'chat-media');
