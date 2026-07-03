'use client'

import { cn } from '@/lib/utils'

interface MinutePickerProps {
  minutes: number
  onChange: (n: number) => void
  label: string
  disabled?: boolean
}

export default function MinutePicker({ minutes, onChange, label, disabled }: MinutePickerProps) {
  const options = [30, 45, 60, 75, 90]

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            disabled={disabled}
            aria-label={`${opt} minutos de ${label}`}
            aria-pressed={minutes === opt}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
              'active:scale-95',
              minutes === opt
                ? 'bg-accent text-black'
                : 'bg-surface2 text-[#A1A1AA] hover:text-[#FAFAFA]',
              disabled && 'opacity-40 cursor-not-allowed active:scale-100'
            )}
          >
            {opt} min
          </button>
        ))}
      </div>
    </div>
  )
}
