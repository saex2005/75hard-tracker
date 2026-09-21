-- Ciclos de estudio/implementación de 2 semanas del reto "100 Días".
-- Cada ciclo se cierra con un documento (tema estudiado, qué se va a
-- implementar, para qué cuenta, cuándo) el día de su end_date — sin ese
-- documento, la Regla 1 del día no se cumple (ver isDayComplete en
-- src/lib/utils.ts).
--
-- Seed inicial de los 7 ciclos: scripts/seed-study-cycles.ts

create table if not exists study_cycles (
  id uuid primary key default gen_random_uuid(),
  cycle_number int not null unique,
  topic text,
  account text, -- 'ThisWeek' | 'Archie' | 'Gufo' | null (sin definir todavía)
  start_date date not null,
  end_date date not null,
  closing_doc text,
  closed boolean not null default false,
  closed_at timestamptz
);

create index if not exists study_cycles_dates_idx on study_cycles (start_date, end_date);

alter table study_cycles enable row level security;

drop policy if exists "study_cycles all" on study_cycles;
create policy "study_cycles all" on study_cycles for all using (true) with check (true);
