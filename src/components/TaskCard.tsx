'use client'

import { cn } from '@/lib/utils'

interface TaskCardProps {
  icon: string
  label: string
  done: boolean
  children?: React.ReactNode
  onToggle?: () => void
  disabled?: boolean
}

export default function TaskCard({ icon, label, done, children, onToggle, disabled }: TaskCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-colors duration-300',
        done
          ? 'bg-green-500/5 border-green-500/25'
          : 'bg-surface border-[#262626]'
      )}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          aria-pressed={done}
          aria-label={`Marcar ${label} como ${done ? 'incompleto' : 'completado'}`}
          className={cn(
            'w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-150',
            'active:scale-95',
            done
              ? 'bg-green-500 border-green-500'
              : 'border-[#52525B] bg-transparent hover:border-[#A1A1AA]',
            disabled && 'opacity-40 cursor-not-allowed'
          )}
        >
          {done && (
            <svg
              className="w-3.5 h-3.5 text-black"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2.5 7L5.5 10L11.5 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        <span className="text-base" aria-hidden="true">{icon}</span>

        <span className="font-semibold text-sm flex-1 text-[#FAFAFA]">
          {label}
        </span>
      </div>

      {children && (
        <div className="mt-3 pl-9">{children}</div>
      )}
    </div>
  )
}
