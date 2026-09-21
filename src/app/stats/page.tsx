'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import dynamicImport from 'next/dynamic'
import { supabase, type ChallengeState, type WeightCheckpoint } from '@/lib/supabase'
import { CHALLENGE_CONFIG } from '@/config/challenge'
import { calcDayNumber } from '@/lib/utils'

const WeightChart = dynamicImport(() => import('@/components/WeightChart'), { ssr: false })

// Solo se muestran stats del reto activo ("100 Días", desde el 23/09/2026) —
// el historial del 75 Hard queda disponible en /historia, no se mezclan
// campos de eras distintas acá.
const NEW_ERA_START = CHALLENGE_CONFIG.startDate

type Stats = {
  challengeState: ChallengeState
  dayNumber: number
  totalDays: number
  completedDays: number
  failedDays: number
  taskCompletion: {
    study: number
    gym: number
    reading: number
    steps: number
  }
  weights: WeightCheckpoint[]
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: cs }, { data: allDays }, { data: weights }] = await Promise.all([
        supabase.from('challenge_state').select('*').eq('id', 1).single(),
        supabase.from('days').select('*').order('date', { ascending: true }),
        supabase.from('weight_checkpoints').select('*').order('date', { ascending: true }),
      ])

      if (!cs || !allDays) {
        setLoading(false)
        return
      }

      const days = allDays.filter((d) => d.date >= NEW_ERA_START)
      const dayNumber = calcDayNumber(cs.current_run_start)
      const total = days.length
      const completed = days.filter((d) => d.completed).length
      const failed = total - completed

      const taskCompletion = {
        study: pct(days.filter((d) => d.study_block_done).length, total),
        gym: pct(days.filter((d) => d.gym_done).length, total),
        reading: pct(days.filter((d) => d.reading_done).length, total),
        steps: pct(days.filter((d) => d.steps >= CHALLENGE_CONFIG.stepsGoal).length, total),
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
    { label: '📚 Estudio/Implementación', value: stats.taskCompletion.study },
    { label: '💪 Entrenamiento', value: stats.taskCompletion.gym },
    { label: '📖 Lectura', value: stats.taskCompletion.reading },
    { label: '👟 Pasos', value: stats.taskCompletion.steps },
  ]

  return (
    <main className="max-w-md mx-auto px-4 pt-6 pb-4 space-y-6">
      <header>
        <h1 className="text-3xl font-black tracking-tight">Estadísticas</h1>
      </header>

      {/* Métricas principales */}
      <section
        className="space-y-2"
        aria-label="Métricas del reto"
      >
        <div className="grid grid-cols-2 gap-2">
          <Metric label="Día actual" value={stats.dayNumber} unit={`/ ${CHALLENGE_CONFIG.totalDays}`} />
          <Metric label="Mejor racha" value={stats.challengeState.best_streak} unit="días" />
          <Metric label="Completados" value={stats.completedDays} unit="días" accent />
          <Metric label="Reintentos" value={stats.challengeState.total_restarts} />
        </div>
        {stats.dayNumber >= 1 && stats.dayNumber < CHALLENGE_CONFIG.totalDays && (() => {
          const end = new Date(CHALLENGE_CONFIG.endDate + 'T00:00:00')
          const dateStr = end.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
          return (
            <p className="text-xs text-[#52525B] font-medium text-center pt-1">
              El reto termina el <span className="text-[#A1A1AA]">{dateStr}</span>
            </p>
          )
        })()}
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
