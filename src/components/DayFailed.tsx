'use client'

interface DayFailedProps {
  dayNumber: number
  streak: number
  onRestart: () => void
  loading?: boolean
}

export default function DayFailed({ dayNumber, streak, onRestart, loading }: DayFailedProps) {
  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 text-center animate-fade-in"
      role="alert"
      aria-live="assertive"
    >
      <p className="text-red-500 text-xs font-mono tracking-[0.3em] uppercase mb-6">
        DÍA NO COMPLETADO
      </p>

      <h1 className="text-2xl font-black tracking-tight mb-2 text-[#FAFAFA]">
        Fallaste el Día {dayNumber}.
      </h1>

      {streak > 1 && (
        <p className="text-[#A1A1AA] text-base mb-8">
          La racha de {streak} días terminó.
        </p>
      )}

      <blockquote className="italic text-[#71717A] text-sm max-w-xs mb-12 leading-relaxed">
        &ldquo;No importa cuántas veces caés, importa cuántas te levantás.&rdquo;
      </blockquote>

      <button
        type="button"
        onClick={onRestart}
        disabled={loading}
        className="border border-[#52525B] text-[#A1A1AA] font-semibold px-8 py-3.5 rounded-xl
          hover:border-[#A1A1AA] hover:text-[#FAFAFA] transition-all duration-200
          active:scale-97 disabled:opacity-40 disabled:cursor-not-allowed text-sm tracking-wide uppercase"
      >
        {loading ? 'Reiniciando...' : 'Reiniciar al Día 1'}
      </button>
    </div>
  )
}
