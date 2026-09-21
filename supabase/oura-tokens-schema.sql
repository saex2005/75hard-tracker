-- Guarda el refresh token de la integración OAuth2 con Oura Ring (single-user,
-- solo Santiago). El access token se refresca en cada request vía
-- src/lib/oura.ts::getValidAccessToken() — nunca se guarda el access token,
-- solo el refresh token (de vida larga, puede rotar en cada refresh).

create table if not exists oura_tokens (
  id int primary key default 1,
  refresh_token text not null,
  updated_at timestamptz not null default now(),
  constraint oura_tokens_singleton check (id = 1)
);

alter table oura_tokens enable row level security;

drop policy if exists "oura_tokens all" on oura_tokens;
create policy "oura_tokens all" on oura_tokens for all using (true) with check (true);
