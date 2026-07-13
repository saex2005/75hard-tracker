-- Checkpoints de peso (pesaje registrado en /peso).
-- Documentación de una tabla que YA EXISTE en producción.

create table if not exists weight_checkpoints (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  weight_kg numeric not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists weight_checkpoints_date_idx on weight_checkpoints (date desc);

alter table weight_checkpoints enable row level security;

drop policy if exists "weight_checkpoints all" on weight_checkpoints;
create policy "weight_checkpoints all" on weight_checkpoints for all using (true) with check (true);
