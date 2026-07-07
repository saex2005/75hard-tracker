-- Memorias persistentes del asistente del reto.
-- Correr manualmente en el SQL editor de Supabase (igual que foods-schema.sql).

create table if not exists assistant_memories (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  created_at timestamptz not null default now()
);

alter table assistant_memories enable row level security;

drop policy if exists "anon full access" on assistant_memories;
create policy "anon full access" on assistant_memories
  for all using (true) with check (true);
