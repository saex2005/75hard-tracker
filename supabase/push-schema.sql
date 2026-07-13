-- Suscripciones de push notifications (Web Push API) para las notificaciones
-- diarias context-aware disparadas por n8n vía /api/notify.
-- Documentación de una tabla que YA EXISTE en producción.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

drop policy if exists "push_subscriptions all" on push_subscriptions;
create policy "push_subscriptions all" on push_subscriptions for all using (true) with check (true);
