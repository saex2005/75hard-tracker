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
    <div className="space-y-4">
      {grouped.map((group) => (
        <div key={group.meal}>
          <h3 className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#52525B] mb-2">
            {MEAL_LABELS[group.meal]}
          </h3>
          <div className="space-y-2">
            {group.items.map((entry) => (
              <div
                key={entry.id}
                className="bg-[#141414] border border-[#262626] rounded-xl p-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{entry.food_name}</p>
                  <p className="text-xs text-[#52525B] font-medium tabular-nums">
                    {entry.grams} g · {Math.round(entry.kcal)} kcal · {Math.round(entry.protein)}g P
                    <span className="text-[#3F3F46]">
                      {' '}· {Math.round(entry.carbs)}C · {Math.round(entry.fat)}G
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => onDelete(entry.id)}
                  aria-label={`Borrar ${entry.food_name}`}
                  className="w-11 h-11 flex items-center justify-center shrink-0 text-[#52525B] active:scale-95 transition-transform"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
