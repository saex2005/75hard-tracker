'use client'

import type { FoodLog, MealSlot } from '@/lib/supabase'

const MEAL_ORDER: MealSlot[] = ['desayuno', 'almuerzo', 'merienda', 'cena', 'extra']

const MEAL_LABELS: Record<MealSlot, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  merienda: 'Merienda',
  cena: 'Cena',
  extra: 'Extra',
}

export default function FoodLogList({
  entries,
  onDelete,
}: {
  entries: FoodLog[]
  onDelete: (id: string) => void
}) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-[#52525B] font-medium text-center py-6">Nada registrado hoy</p>
    )
  }

  const grouped = MEAL_ORDER.map((meal) => ({
    meal,
    items: entries.filter((e) => e.meal === meal),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="space-y-3">
      {grouped.map((group) => (
        <div key={group.meal}>
          <h3 className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#52525B] mb-1.5">
            {MEAL_LABELS[group.meal]}
          </h3>
          <div className="space-y-1">
            {group.items.map((entry) => {
              // grams:1 es el placeholder de "comida completa" (receta o comida del
              // plan, ver registrar()/quickAdd() en /nutricion) — no es un gramaje real
              const isWholeMeal = entry.grams === 1
              return (
                <div
                  key={entry.id}
                  className="bg-[#141414] border border-[#262626] rounded-lg pl-2.5 pr-1 py-1.5 flex items-center gap-2"
                >
                  {isWholeMeal && (
                    <span className="shrink-0 text-[13px] leading-none" aria-label="Comida completa" title="Receta / comida del plan">
                      🍽
                    </span>
                  )}
                  <div className="flex-1 min-w-0 flex items-baseline gap-1.5">
                    <p className="text-[13px] font-semibold truncate">{entry.food_name}</p>
                    <p className="text-[11px] text-[#52525B] font-medium tabular-nums shrink-0">
                      {isWholeMeal ? '' : `${entry.grams}g · `}
                      {Math.round(entry.kcal)}kcal · {Math.round(entry.protein)}P · {Math.round(entry.carbs)}C · {Math.round(entry.fat)}G
                    </p>
                  </div>
                  <button
                    onClick={() => onDelete(entry.id)}
                    aria-label={`Borrar ${entry.food_name}`}
                    className="w-9 h-9 flex items-center justify-center shrink-0 text-[#52525B] active:scale-95 transition-transform"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M6 6l12 12M18 6L6 18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
