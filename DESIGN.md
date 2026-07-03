# DESIGN.md — 75 Hard Tracker

## Atmosphere

Dark como el gym a la 1am. Silencioso, pesado, sin adornos. Cada elemento en pantalla tiene un único propósito: decirle a Santiago qué le falta y darle el control para completarlo. No hay celebración antes de que termine el día.

El acento naranja es tensión, no alegría. Es el semáforo en amarillo.

---

## Color System

```
Background:    #0A0A0A   — Void. El espacio donde ocurre el esfuerzo.
Surface:       #141414   — Cards y contenedores. Un grado más claro que el fondo.
Surface 2:     #1C1C1C   — Estado hover, inputs activos.
Border:        #262626   — Separadores. Casi invisible pero presente.
Accent:        #F97316   — orange-500. Único color de acción en toda la app.
Accent dim:    #7C3A12   — Naranja apagado para estados disabled del acento.
Text primary:  #FAFAFA   — Blanco suave. No #FFFFFF puro.
Text muted:    #A1A1AA   — zinc-400. Para labels y metadata.
Text disabled: #52525B   — zinc-600. Para lo que no se puede hacer aún.
Success:       #22C55E   — green-500. Solo para "task completado".
Danger:        #EF4444   — red-500. Solo para "día fallado".
```

**Reglas absolutas:**
- Solo UN acento por vista. Si hay dos elementos naranja en pantalla, uno sobra.
- No gradients. Si existe una razón excepcional, usar gradientes lineales de 2 colores máximo.
- No transparencias decorativas. Solo si afectan el z-stacking real.
- Cards no tienen sombra. El contraste de fondo vs surface es suficiente.

---

## Typography

**Heading / Display:** `font-black tracking-tight` — Geist o system-ui stack.
- Day counter: text-5xl font-black
- Section titles: text-lg font-bold tracking-wide uppercase
- Metric large: text-4xl font-black tabular-nums

**Body:** `font-medium` — Legible en pantalla OLED a brillo bajo.
- Task names: text-base font-semibold
- Labels y metadata: text-sm font-medium text-zinc-400
- Números contadores: font-mono tabular-nums

**Rules:**
- NO Inter como fuente decorativa genérica. Si Geist no está disponible, usar system-ui.
- Números de conteo → siempre tabular-nums para que no salte el layout.
- Headings con letter-spacing negativo en tamaños display (tracking-tight o tighter).
- No mixear más de 2 pesos de fuente en la misma vista.

---

## Component Signatures

### TaskCard
```
bg-[#141414] border border-[#262626] rounded-xl p-4
Estado pending: border-[#262626], icon en zinc-500
Estado done: border-green-500/30, bg-green-500/5, icon en green-500
Tap area: mínimo 56px height para touch
```

### WaterCounter
```
Botones +/−: circulares, 44px mínimo, bg-[#1C1C1C]
Barra de progreso: scaleX (nunca width animation), bg-orange-500
Feedback al tap: scale(0.95) 80ms ease-out
```

### Progress Bar (global)
```
Container: h-1.5, bg-[#262626], rounded-full
Fill: bg-orange-500, transition-transform con scaleX
Label: text-muted a la derecha, tabular-nums
```

### CTA Button (Cerrar día)
```
Estado disabled: bg-[#1C1C1C] text-zinc-600 cursor-not-allowed
Estado activo: bg-orange-500 text-black font-bold rounded-xl h-14
Aparición: animate-in fade-in slide-in-from-bottom-2 duration-300
```

### DayFailed Screen
```
Full screen, bg-[#0A0A0A]
Texto de fallo: uppercase, tracked, text-red-500
Quote: italic, text-zinc-400, text-center
CTA reinicio: outline variant, border-zinc-600
```

---

## Spacing & Layout

```
Mobile-first. Ancho máximo: max-w-md mx-auto.
Safe area: padding-bottom: env(safe-area-inset-bottom) en nav.
Body padding: px-4
Section gap: space-y-3
Card gap: space-y-2
Nav bottom: h-16 + safe-area
```

---

## Motion

**Philosophy:** Motion confirma, no decora. Cada animación tiene una razón funcional.

```
Micro tap:       scale(0.97) 80ms ease-out → back 150ms ease-out
Appear:          fade-in + slide-up 4px, duration 200ms ease-out
Disappear:       fade-out + slide-down 4px, duration 150ms
Counter +/-:     número → scale 1.05 → 1.0, 120ms spring
Progress fill:   scaleX, duration 400ms cubic-bezier(0.4, 0, 0.2, 1)
Day close:       pantalla flash orange/10 → revert, 600ms
```

**Reglas de motion performance:**
- Solo transform y opacity en animaciones. Nunca width, height, top, left.
- prefers-reduced-motion: todas las animaciones desactivadas o instant.
- Blur decorativo: nunca. Blur funcional: máx 8px.
- No animar scroll nativo. IntersectionObserver para reveals.

---

## Anti-patterns (lo que nunca va en esta app)

- ❌ Cards con sombra tipo `shadow-lg`
- ❌ Nav horizontal tipo tabs en el top
- ❌ Métricas en azul (el azul no existe en esta paleta)
- ❌ Emojis en títulos principales (solo en task labels)
- ❌ Loading spinners — usar skeleton estructural
- ❌ Toast de éxito flotante después de cada tap en WaterCounter
- ❌ `rounded-full` en contenedores grandes (solo en íconos y botones circulares)
- ❌ Glassmorphism — no hay blur de fondo
- ❌ Colores pastel o cualquier saturación baja
- ❌ Animate de `scale(0)` → `scale(1)` — siempre desde `scale(0.97)`

---

*Generado: 2026-07-03 | Stack: Next.js 14 App Router + Tailwind CSS*
