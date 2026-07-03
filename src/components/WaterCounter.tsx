'use client'

import { cn } from '@/lib/utils'
import { BOTTLES_PER_DAY } from '@/config/challenge'

interface WaterCounterProps {
  bottles: number
  onChange: (n: number) => void
  disabled?: boolean
}

export default function WaterCounter({ bottles, onChange, disabled }: WaterCounterProps) {
  const pct = Math.min(1, bottles / BOTTLES_PER_DAY)

  function decrement() {
    if (bottles > 0) onChange(bottles - 1)
  }

  function increment() {
    if (bottles < BOTTLES_PER_DAY) onChange(bottles + 1)
  }

  return (
    <div className="space-y-2" aria-label="Contador de agua">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={decrement}
          disabled={disabled || bottles === 0}
          aria-label="Restar una botella"
          className={cn(
            'w-11 h-11 rounded-full bg-surface2 flex items-center justify-center text-xl font-bold',
            'transition-all duration-[80ms] active:scale-95 hover:bg-[#262626]',
            (disabled || bottles === 0) && 'opacity-30 cursor-not-allowed active:scale-100'
          )}
        >
          −
        </button>

        <div className="flex-1 space-y-1.5">
          <div className="relative h-2 bg-[#262626] rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-accent rounded-full origin-left transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
              style={{ transform: `scaleX(${pct})` }}
            />
          </div>
          <p
            className="text-xs text-center font-mono tabular-nums text-[#A1A1AA]"
            aria-live="polite"
            aria-atomic="true"
          >
            {bottles} / {BOTTLES_PER_DAY} botellas
          </p>
        </div>

        <button
          type="button"
          onClick={increment}
          disabled={disabled || bottles >= BOTTLES_PER_DAY}
          aria-label="Sumar una botella"
          className={cn(
            'w-11 h-11 rounded-full bg-accent text-black flex items-center justify-center text-xl font-bold',
            'transition-all duration-[80ms] active:scale-95 hover:brightness-110',
            (disabled || bottles >= BOTTLES_PER_DAY) && 'opacity-30 cursor-not-allowed active:scale-100'
          )}
        >
          +
        </button>
      </div>
    </div>
  )
}
