-- Migración para el reto "100 Días" (23/09/2026 → 31/12/2026), que sucede al
-- 75 Hard (75/75 completado el 19/09/2026). Se agregan las columnas nuevas
-- que necesitan las reglas del reto nuevo; NO se tocan ni se borran las
-- columnas viejas (cardio_done, cardio_minutes, water_bottles, diet_done,
-- photo_url, insight_done, insight_minutes) — quedan como historial intacto
-- del 75 Hard para fechas anteriores al 23/09/2026. gym_done/gym_minutes y
-- reading_done/reading_page se reutilizan tal cual (Entrenamiento y Lectura).
--
-- Correr una sola vez en el SQL editor de Supabase.

alter table days add column if not exists study_block_done boolean not null default false;
alter table days add column if not exists study_block_minutes int not null default 0;
alter table days add column if not exists steps int not null default 0;
