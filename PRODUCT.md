# PRODUCT.md — 75 Hard Tracker

## Product Intent

App de uso personal, sin login, sin multi-tenant. Santiago la abre desde su iPhone como PWA. El flujo principal tarda menos de 60 segundos: abrir → marcar tasks → cerrar día.

No es una app de motivación. Es un sistema de accountability. El diseño sirve al producto, no al revés.

---

## User

**Santiago Meza, 20 años, Rosario, Argentina.**
Abre la app a las 10pm después de un día de trabajo y gym. Está cansado. Quiere saber qué le falta, completarlo, y cerrar. No quiere leer.

---

## Core Flow

```
Abrir app → Ver qué tasks faltan → Completarlos → Cerrar el día
```

Todo lo demás (galería, stats, historia) es secundario al flujo diario.

---

## Features por prioridad

### P0 — Flujo diario (MVP)
- Checklist de 6 tasks con estado persistido
- WaterCounter con botellas +/−
- Botón "Cerrar día" (aparece solo cuando todo está completo)
- Pantalla de fallo si el día no se cerró

### P1 — Tracking
- Log histórico de días (/historia)
- Foto del día con upload a Supabase Storage
- Reset automático al Día 1 si se falla

### P2 — Análisis
- Stats: gráfica de peso, completion por task, rachas
- Galería de fotos (/fotos)
- Registro de peso (/peso)
- Notificaciones PWA a las 21:00

### P3 — Integración workspace
- Script sync-to-workspace.ts → context/current-data.md

---

## Constraints técnicos

- Sin login, sin auth. App personal. Un solo usuario.
- Sin server components para data mutable (use client + Supabase JS client directo).
- PWA: manifest.json + service worker.
- Supabase Storage para fotos (bucket `progress-photos`).
- Vercel cron a las 00:05 para reset automático (backup del client-side).

---

## Paleta comprometida

```
#0A0A0A   bg
#141414   surface
#F97316   accent (orange-500) — único color de acción
#FAFAFA   text-primary
#22C55E   success (solo para tasks completados)
#EF4444   danger (solo para fallo)
```

Ver DESIGN.md para sistema completo.

---

## Tipografía comprometida

- Heading/Display: Geist + font-black + tracking-tight
- Body: font-medium / font-semibold
- Números: font-mono + tabular-nums

---

*75 Hard — Inicio: 6 julio 2026 | Fin: 18 septiembre 2026 | 75 días*
