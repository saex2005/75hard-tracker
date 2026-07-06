-- Schema del tracker de macros — correr en el SQL editor de Supabase
-- Plan: plans/2026-07-06-macro-tracker.md

-- Extensiones
create extension if not exists unaccent;
create extension if not exists pg_trgm;

-- Tabla de alimentos
create table if not exists foods (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('off', 'generic', 'custom')),
  barcode text unique,          -- solo productos OFF; null para generic/custom
  name text not null,
  brand text,
  kcal_100 numeric not null,
  protein_100 numeric not null,
  carbs_100 numeric not null,
  fat_100 numeric not null,
  fiber_100 numeric,
  serving_g numeric,            -- tamaño de porción en gramos si se conoce
  serving_name text,            -- ej: "1 pote (190 g)"
  source_ref text,              -- URL OFF o cita SARA/ArgenFoods
  search_text text,             -- generada por trigger: name + brand sin acentos
  created_at timestamptz default now()
);

-- unaccent() no es immutable, así que la columna de búsqueda se mantiene por trigger
create or replace function foods_search_text_trigger() returns trigger as $$
begin
  new.search_text := lower(unaccent(coalesce(new.name, '') || ' ' || coalesce(new.brand, '')));
  return new;
end;
$$ language plpgsql;

drop trigger if exists foods_search_text on foods;
create trigger foods_search_text before insert or update on foods
  for each row execute function foods_search_text_trigger();

create index if not exists foods_search_trgm on foods using gin (search_text gin_trgm_ops);

-- Log diario de comidas (macros desnormalizados: el historial no cambia si el food se edita)
create table if not exists food_logs (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  meal text not null check (meal in ('desayuno', 'almuerzo', 'merienda', 'cena', 'extra')),
  food_id uuid references foods(id) on delete set null,
  food_name text not null,
  grams numeric not null,
  kcal numeric not null,
  protein numeric not null,
  carbs numeric not null,
  fat numeric not null,
  created_at timestamptz default now()
);

create index if not exists food_logs_date on food_logs (date);

-- Búsqueda por similitud, insensible a acentos.
-- Los matches por substring rankean arriba de la similitud pura de trigramas
-- (si no, "lechuga" le gana a "pechuga de pollo" para q="pechuga").
create or replace function search_foods(q text)
returns setof foods as $$
  select *
  from foods
  where search_text % lower(unaccent(q))
     or search_text like '%' || lower(unaccent(q)) || '%'
  order by
    (search_text like lower(unaccent(q)) || '%') desc,
    (search_text like '%' || lower(unaccent(q)) || '%') desc,
    similarity(search_text, lower(unaccent(q))) desc
  limit 20;
$$ language sql stable;

-- RLS igual que las tablas existentes (app single-user con anon key)
alter table foods enable row level security;
alter table food_logs enable row level security;

drop policy if exists "foods all" on foods;
create policy "foods all" on foods for all using (true) with check (true);

drop policy if exists "food_logs all" on food_logs;
create policy "food_logs all" on food_logs for all using (true) with check (true);
