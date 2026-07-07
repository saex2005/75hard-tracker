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

-- Log completo de conversaciones del asistente (memoria constante).
-- El server usa los últimos mensajes como contexto y el resto es buscable vía tool.

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_created_at_idx on chat_messages (created_at desc);

alter table chat_messages enable row level security;

drop policy if exists "anon full access" on chat_messages;
create policy "anon full access" on chat_messages
  for all using (true) with check (true);
