-- Estado global del reto: racha actual, reinicios, mejor racha.
-- Fila única (id=1) que se actualiza in-place — no se insertan filas nuevas.
-- Documentación de una tabla que YA EXISTE en producción.

create table if not exists challenge_state (
  id int primary key default 1,
  current_run_start date not null, -- fecha de inicio de la racha actual (se resetea a Día 1 si falla un task)
  total_restarts int not null default 0,
  best_streak int not null default 0,
  constraint challenge_state_singleton check (id = 1)
);

insert into challenge_state (id, current_run_start, total_restarts, best_streak)
values (1, '2026-07-07', 0, 0)
on conflict (id) do nothing;

alter table challenge_state enable row level security;

drop policy if exists "challenge_state all" on challenge_state;
create policy "challenge_state all" on challenge_state for all using (true) with check (true);
