-- Tabla central del reto: una fila por día, con los 7 tasks binarios.
-- Documentación de una tabla que YA EXISTE en producción (creada antes de que
-- existiera esta convención de archivos .sql versionados). No hace falta
-- correr esto salvo que se pierda la base y haya que recrearla desde cero.

create table if not exists days (
  id uuid primary key default gen_random_uuid(),
  day_number int not null,
  date date not null unique,
  gym_done boolean not null default false,
  gym_minutes int not null default 0,
  cardio_done boolean not null default false,
  cardio_minutes int not null default 0,
  water_bottles int not null default 0,
  diet_done boolean not null default false,
  reading_done boolean not null default false,
  reading_page int not null default 0,
  photo_url text,
  insight_done boolean not null default false,
  insight_minutes int not null default 0,
  completed boolean not null default false, -- derivado de las 7 tasks (isDayComplete en src/lib/utils.ts)
  created_at timestamptz not null default now()
);

create index if not exists days_date_idx on days (date desc);

alter table days enable row level security;

drop policy if exists "days all" on days;
create policy "days all" on days for all using (true) with check (true);
