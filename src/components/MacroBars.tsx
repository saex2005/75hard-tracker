'use client'

import { DAILY_MACROS } from '@/config/nutrition'
import { cn } from '@/lib/utils'

export type MacroTotals = {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

const ROWS: { key: keyof MacroTotals; label: string; target: number; unit: string; overIsGood: boolean }[] = [
  { key: 'kcal', label: 'Calorías', target: DAILY_MACROS.kcal, unit: '', overIsGood: false },
  { key: 'protein', label: 'Proteína', target: DAILY_MACROS.protein, unit: 'g', overIsGood: true },
  { key: 'carbs', label: 'Carbos', target: DAILY_MACROS.carbs, unit: 'g', overIsGood: false },
  { key: 'fat', label: 'Grasas', target: DAILY_MACROS.fat, unit: 'g', overIsGood: false },
]

export default function MacroBars({ totals }: { totals: MacroTotals }) {
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 space-y-3">
      {ROWS.map((row) => {
        const value = totals[row.key]
        const pct = Math.min(1, value / row.target)
        const over = value > row.target
        // Proteína pasada = verde (bien); kcal/carbos/grasas pasados = rojo (mal)
        const fillColor = over
          ? row.overIsGood
            ? 'bg-green-500'
            : 'bg-red-500'
          : 'bg-orange-500'

        return (
          <div key={row.key}>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-sm font-semibold">{row.label}</span>
              <span
                className={cn(
                  'text-sm font-mono tabular-nums',
                  over ? (row.overIsGood ? 'text-green-500' : 'text-red-500') : 'text-[#A1A1AA]'
                )}
              >
                {Math.round(value)}
                {row.unit} / {row.target}
                {row.unit}
              </span>
            </div>
            <div className="h-1.5 bg-[#262626] rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full origin-left transition-transform duration-400', fillColor)}
                style={{ transform: `scaleX(${pct})` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
