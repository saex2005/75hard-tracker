import { cn } from '@/lib/utils'

interface ProgressBarProps {
  current: number
  total: number
  className?: string
  showLabel?: boolean
}

export default function ProgressBar({ current, total, className, showLabel = true }: ProgressBarProps) {
  const pct = Math.min(100, Math.round((current / total) * 100))

  return (
    <div className={cn('space-y-1', className)}>
      <div className="relative h-1.5 bg-[#262626] rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 w-full bg-accent rounded-full origin-left transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ transform: `scaleX(${pct / 100})` }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`Día ${current} de ${total}`}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between items-center">
          <span className="text-[11px] text-[#A1A1AA] font-medium">
            Día {current} de {total}
          </span>
          <span className="text-[11px] text-[#A1A1AA] font-mono tabular-nums">
            {pct}%
          </span>
        </div>
      )}
    </div>
  )
}
