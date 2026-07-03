'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import dynamicImport from 'next/dynamic'
import { supabase, type DayRecord, type ChallengeState, type WeightCheckpoint } from '@/lib/supabase'
import { CHALLENGE_CONFIG, BOTTLES_PER_DAY } from '@/config/challenge'
import { calcDayNumber } from '@/lib/utils'

const WeightChart = dynamicImport(() => import('@/components/WeightChart'), { ssr: false })

type Stats = {
  challengeState: ChallengeState
  dayNumber: number
  totalDays: number
  completedDays: number
  failedDays: number
  taskCompletion: {
    gym: number
    cardio: number
    water: number
    diet: number
    reading: number
    photo: number
  }
  weights: WeightCheckpoint[]
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: cs }, { data: days }, { data: weights }] = await Promise.all([
        supabase.from('challenge_state').select('*').eq('id', 1).single(),
        supabase.from('days').select('*').order('day_number', { ascending: true }),
        supabase.from('weight_checkpoints').select('*').order('date', { ascending: true }),
      ])

      if (!cs || !days) {
        setLoading(false)
        return
      }

      const dayNumber = calcDayNumber(cs.current_run_start)
      const total = days.length
      const completed = days.filter((d) => d.completed).length
      const failed = total - completed

      const taskCompletion = {
        gym: pct(days.filter((d) => d.gym_done).length, total),
        cardio: pct(days.filter((d) => d.cardio_done).length, total),
        water: pct(days.filter((d) => d.water_bottles >= BOTTLES_PER_DAY).length, total),
        diet: pct(days.filter((d) => d.diet_done).length, total),
        reading: pct(days.filter((d) => d.reading_done).length, total),
        photo: pct(days.filter((d) => d.photo_url).length, total),
      }

      setStats({
        challengeState: cs,
        dayNumber,
        totalDays: total,
        completedDays: completed,
        failedDays: failed,
        taskCompletion,
        weights: weights ?? [],
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 pt-6 space-y-6" aria-busy="true" aria-label="Cargando estadísticas...">
        <div className="h-9 w-48 bg-surface2 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-surface border border-[#262626] rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          <div className="h-3 w-32 bg-surface2 rounded animate-pulse" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-8 bg-surface2 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-6 text-center">
        <p className="text-[#52525B] text-sm">No hay datos todavía.</p>
      </div>
    )
  }

  const tasks = [
    { label: '💪 Gym', value: stats.taskCompletion.gym },
    { label: '🏃 Cardio', value: stats.taskCompletion.cardio },
    { label: '💧 Agua', value: stats.taskCompletion.water },
    { label: '🥗 Dieta', value: stats.taskCompletion.diet },
    { label: '📖 Lectura', value: stats.taskCompletion.reading },
    { label: '📸 Foto', value: stats.taskCompletion.photo },
  ]

  return (
    <main className="max-w-md mx-auto px-4 pt-6 pb-4 space-y-6">
      <header>
        <h1 className="text-3xl font-black tracking-tight">Estadísticas</h1>
      </header>

      {/* Métricas principales */}
      <section
        className="grid grid-cols-2 gap-2"
        aria-label="Métricas del reto"
      >
        <Metric label="Día actual" value={stats.dayNumber} unit="/ 75" />
        <Metric label="Mejor racha" value={stats.challengeState.best_streak} unit="días" />
        <Metric label="Completados" value={stats.completedDays} unit="días" accent />
        <Metric label="Reintentos" value={stats.challengeState.total_restarts} />
      </section>

      {/* Completion por task */}
      <section aria-labelledby="tasks-heading">
        <h2 id="tasks-heading" className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#52525B] mb-3">
          Completado por task
        </h2>
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.label} className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{task.label}</span>
                <span className="text-sm font-mono tabular-nums text-[#A1A1AA]">{task.value}%</span>
              </div>
              <div className="h-1.5 bg-[#262626] rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full origin-left transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
                  style={{ transform: `scaleX(${task.value / 100})` }}
                  role="progressbar"
                  aria-valuenow={task.value}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${task.label}: ${task.value}%`}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Gráfica de peso */}
      <section aria-labelledby="weight-heading">
        <h2 id="weight-heading" className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#52525B] mb-3">
          Evolución de peso
        </h2>
        <div className="bg-surface rounded-xl border border-[#262626] p-4">
          <WeightChart data={stats.weights} />
        </div>
      </section>
    </main>
  )
}

function Metric({
  label,
  value,
  unit,
  accent,
}: {
  label: string
  value: number
  unit?: string
  accent?: boolean
}) {
  return (
    <div className="bg-surface rounded-xl border border-[#262626] p-4">
      <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#52525B] mb-1">{label}</p>
      <p className={`text-3xl font-black tabular-nums tracking-tight ${accent ? 'text-accent' : 'text-[#FAFAFA]'}`}>
        {value}
        {unit && (
          <span className="text-sm font-medium text-[#A1A1AA] ml-1">{unit}</span>
        )}
      </p>
    </div>
  )
}

function pct(n: number, total: number): number {
  if (total === 0) return 0
  return Math.round((n / total) * 100)
}
