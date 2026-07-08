-- Registro de pesos del gym (feature "gym del día").
-- Correr manual en el SQL editor de Supabase (igual que foods-schema.sql).

create table if not exists gym_logs (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  session text not null, -- torso | piernas | empujes | traccion
  exercise text not null, -- nombre del ejercicio (matchea config/gym.ts)
  set_num int not null default 1,
  weight numeric not null, -- kg
  reps int not null,
  created_at timestamptz not null default now()
);

create index if not exists gym_logs_date_idx on gym_logs (date desc);
create index if not exists gym_logs_exercise_idx on gym_logs (exercise, date desc);

alter table gym_logs enable row level security;

-- Mismo modelo que el resto de la app: anon con acceso total,
-- la protección real es el password del middleware
drop policy if exists "gym_logs all" on gym_logs;
create policy "gym_logs all" on gym_logs for all using (true) with check (true);
