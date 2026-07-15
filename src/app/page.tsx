'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase, type DayRecord, type ChallengeState } from '@/lib/supabase'
import { calcDayNumber, todayISO, yesterdayART, isDayComplete } from '@/lib/utils'
import { getSessionForDate, SESSION_LABELS } from '@/config/gym'
import { cacheDay, cacheChallengeState, getCachedDay, getCachedChallengeState, enqueue, getQueue, clearQueue } from '@/lib/offlineCache'
import { CHALLENGE_CONFIG, BOTTLES_PER_DAY } from '@/config/challenge'
import ProgressBar from '@/components/ProgressBar'
import TaskCard from '@/components/TaskCard'
import WaterCounter from '@/components/WaterCounter'
import MinutePicker from '@/components/MinutePicker'
import DayFailed from '@/components/DayFailed'
import PhotoUpload from '@/components/PhotoUpload'

type AppState =
  | { status: 'loading' }
  | { status: 'pending'; startDate: string; daysLeft: number }
  | { status: 'failed'; dayNumber: number; streak: number }
  | { status: 'complete' }
  | { status: 'active'; day: DayRecord; challengeState: ChallengeState; dayNumber: number }
  | { status: 'error'; message: string }

export default function HomePage() {
  const [state, setState] = useState<AppState>({ status: 'loading' })
  const [saving, setSaving] = useState(false)
  const [restartLoading, setRestartLoading] = useState(false)

  const loadData = useCallback(async () => {
    setState({ status: 'loading' })

    const { data: cs, error: csError } = await supabase
      .from('challenge_state')
      .select('*')
      .eq('id', 1)
      .single()

    if (csError || !cs) {
      const cachedDay = getCachedDay()
      const cachedCs = getCachedChallengeState()
      if (cachedDay && cachedCs) {
        const dn = calcDayNumber(cachedCs.current_run_start)
        setState({ status: 'active', day: cachedDay, challengeState: cachedCs, dayNumber: dn })
      } else {
        setState({ status: 'error', message: csError?.message ?? 'Sin datos en challenge_state' })
      }
      return
    }

    const dayNumber = calcDayNumber(cs.current_run_start)

    if (dayNumber < 1) {
      setState({ status: 'pending', startDate: cs.current_run_start, daysLeft: 1 - dayNumber })
      return
    }

    if (dayNumber > CHALLENGE_CONFIG.totalDays) {
      setState({ status: 'complete' })
      return
    }

    // Detectar si el día anterior falló — pero si las 7 tasks estaban hechas
    // y solo faltó el flag, NO es un fallo (el cron lo cierra por red de seguridad)
    if (dayNumber > 1) {
      const yesterdayISO = yesterdayART()

      const { data: yDay } = await supabase
        .from('days')
        .select('*')
        .eq('date', yesterdayISO)
        .single()

      if (yDay && !yDay.completed && !isDayComplete(yDay)) {
        setState({ status: 'failed', dayNumber: dayNumber - 1, streak: dayNumber - 1 })
        return
      }
    }

    const todayDate = todayISO()

    // Cargar o crear el día de hoy
    let { data: dayData } = await supabase
      .from('days')
      .select('*')
      .eq('date', todayDate)
      .single()

    if (!dayData) {
      const { data: newDay, error: insertError } = await supabase
        .from('days')
        .insert({
          day_number: dayNumber,
          date: todayDate,
          gym_done: false,
          gym_minutes: 0,
          cardio_done: false,
          cardio_minutes: 0,
          water_bottles: 0,
          diet_done: false,
          reading_done: false,
          reading_page: 0,
          photo_url: null,
          insight_done: false,
          insight_minutes: 0,
          completed: false,
        })
        .select()
        .single()

      if (insertError || !newDay) {
        setState({ status: 'error', message: 'Error al crear el registro del día.' })
        return
      }
      dayData = newDay
    }

    if (!dayData) {
      setState({ status: 'error', message: 'Error al cargar el día.' })
      return
    }

    // Fila creada antes de un reset → day_number desactualizado, corregirlo
    if (dayData.day_number !== dayNumber) {
      await supabase.from('days').update({ day_number: dayNumber }).eq('id', dayData.id)
      dayData = { ...dayData, day_number: dayNumber }
    }

    cacheDay(dayData)
    cacheChallengeState(cs)
    setState({ status: 'active', day: dayData, challengeState: cs, dayNumber })
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function updateDay(patch: Partial<DayRecord>) {
    if (state.status !== 'active') return
    const prev = state.day
    const optimistic = { ...prev, ...patch }

    // Auto-cierre: `completed` es un derivado de las 7 tasks, en cada escritura.
    // Se cierra solo al marcar la última y se reabre si desmarcás algo.
    optimistic.completed = isDayComplete(optimistic)
    const fullPatch = { ...patch, completed: optimistic.completed }

    let challengeState = state.challengeState
    const justCompleted = optimistic.completed && !prev.completed
    if (justCompleted && state.dayNumber > challengeState.best_streak) {
      challengeState = { ...challengeState, best_streak: state.dayNumber }
    }

    setState({ status: 'active', day: optimistic, challengeState, dayNumber: state.dayNumber })
    cacheDay(optimistic)
    cacheChallengeState(challengeState)
    setSaving(true)

    if (!navigator.onLine) {
      enqueue({ dayId: prev.id, patch: fullPatch })
      setSaving(false)
      return
    }

    const { error } = await supabase.from('days').update(fullPatch).eq('id', prev.id)
    if (error) {
      setState({ status: 'active', day: prev, challengeState: state.challengeState, dayNumber: state.dayNumber })
    } else if (justCompleted && state.dayNumber > state.challengeState.best_streak) {
      await supabase
        .from('challenge_state')
        .update({ best_streak: state.dayNumber })
        .eq('id', 1)
    }
    setSaving(false)
  }

  useEffect(() => {
    async function flushQueue() {
      if (state.status !== 'active') return
      const q = getQueue()
      if (q.length === 0) return
      // Solo descartar lo que se aplicó bien — si algo falla queda en cola
      const failed: typeof q = []
      for (const item of q) {
        const { error } = await supabase.from('days').update(item.patch).eq('id', item.dayId)
        if (error) failed.push(item)
      }
      clearQueue()
      for (const item of failed) enqueue(item)
      if (failed.length === 0) loadData()
    }
    window.addEventListener('online', flushQueue)
    return () => window.removeEventListener('online', flushQueue)
  }, [state, loadData])

  async function handleRestart() {
    setRestartLoading(true)
    const todayDate = todayISO()

    const { data: cs } = await supabase
      .from('challenge_state')
      .select('total_restarts')
      .eq('id', 1)
      .single()

    await supabase
      .from('challenge_state')
      .update({
        current_run_start: todayDate,
        total_restarts: (cs?.total_restarts ?? 0) + 1,
      })
      .eq('id', 1)

    setRestartLoading(false)
    loadData()
  }

  // --- Render states ---

  if (state.status === 'loading') {
    return (
      <div className="max-w-md mx-auto px-4 pt-6 space-y-5" aria-busy="true" aria-label="Cargando...">
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <div className="h-12 w-36 bg-surface2 rounded-lg animate-pulse" />
            <div className="h-4 w-10 bg-surface2 rounded animate-pulse" />
          </div>
          <div className="h-1.5 bg-surface2 rounded-full animate-pulse" />
          <div className="h-3 w-28 bg-surface2 rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-24 bg-surface2 rounded animate-pulse mb-3" />
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-[60px] bg-surface border border-[#262626] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="min-h-dvh flex items-center justify-center px-6 text-center" role="alert">
        <div className="space-y-4">
          <p className="text-red-400 font-semibold">{state.message}</p>
          <button onClick={loadData} className="text-sm text-[#A1A1AA] underline">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (state.status === 'pending') {
    const start = new Date(state.startDate + 'T00:00:00')
    const formatted = start.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center space-y-3">
        <p className="text-accent text-xs font-mono tracking-[0.3em] uppercase">Próximamente</p>
        <h1 className="text-4xl font-black tracking-tight">75 Hard</h1>
        <p className="text-[#A1A1AA] text-base">
          El reto empieza el <span className="text-[#FAFAFA] font-semibold">{formatted}</span>.
        </p>
        <p className="text-[#52525B] text-sm font-mono tabular-nums">
          {state.daysLeft === 1 ? 'Mañana arrancamos.' : `Faltan ${state.daysLeft} días.`}
        </p>
      </div>
    )
  }

  if (state.status === 'failed') {
    return (
      <DayFailed
        dayNumber={state.dayNumber}
        streak={state.streak}
        onRestart={handleRestart}
        loading={restartLoading}
      />
    )
  }

  if (state.status === 'complete') {
    return (
      <div
        className="min-h-dvh flex flex-col items-center justify-center px-6 text-center space-y-4"
        role="main"
      >
        <p className="text-accent text-xs font-mono tracking-[0.3em] uppercase">
          Completado
        </p>
        <h1 className="text-4xl font-black tracking-tight">75 días.</h1>
        <p className="text-[#A1A1AA] text-base">Terminaste el reto.</p>
      </div>
    )
  }

  const { day, dayNumber } = state
  const waterDone = day.water_bottles >= BOTTLES_PER_DAY
  const todaySession = getSessionForDate(day.date)

  return (
    <main className="max-w-md mx-auto px-4 pt-6 pb-4 space-y-5" aria-label="Checklist del día">
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h1 className="text-5xl font-black tracking-tighter">Día {dayNumber}</h1>
          <span className="text-sm text-[#A1A1AA] font-mono">de 75</span>
        </div>
        <ProgressBar current={dayNumber} total={CHALLENGE_CONFIG.totalDays} showLabel={false} />
        {dayNumber > 1 && (
          <p className="text-xs text-[#A1A1AA] font-medium tabular-nums">
            Racha · {dayNumber - 1} {dayNumber - 1 === 1 ? 'día' : 'días'}
          </p>
        )}
      </header>

      {/* Tasks */}
      <section aria-labelledby="tasks-heading">
        <h2
          id="tasks-heading"
          className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#52525B] mb-3"
        >
          Tasks de hoy
        </h2>

        <div className="space-y-2">
          {/* Gym */}
          <TaskCard
            icon="💪"
            label="Gym — 45 min"
            done={day.gym_done}
            onToggle={() =>
              updateDay({
                gym_done: !day.gym_done,
                gym_minutes: !day.gym_done ? 45 : 0,
              })
            }
          >
            <div className="space-y-2">
              <Link
                href="/gym"
                className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:brightness-110"
              >
                Hoy toca {SESSION_LABELS[todaySession]} — ver rutina →
              </Link>
              {day.gym_done && (
                <MinutePicker
                  minutes={day.gym_minutes}
                  onChange={(n) => updateDay({ gym_minutes: n })}
                  label="gym"
                />
              )}
            </div>
          </TaskCard>

          {/* Cardio */}
          <TaskCard
            icon="🏃"
            label="Cardio outdoor — 45 min"
            done={day.cardio_done}
            onToggle={() =>
              updateDay({
                cardio_done: !day.cardio_done,
                cardio_minutes: !day.cardio_done ? 45 : 0,
              })
            }
          >
            {day.cardio_done && (
              <MinutePicker
                minutes={day.cardio_minutes}
                onChange={(n) => updateDay({ cardio_minutes: n })}
                label="cardio"
              />
            )}
          </TaskCard>

          {/* Agua */}
          <TaskCard
            icon="💧"
            label="Agua — 1 galón"
            done={waterDone}
          >
            <WaterCounter
              bottles={day.water_bottles}
              onChange={(n) => updateDay({ water_bottles: n })}
            />
          </TaskCard>

          {/* Dieta */}
          <TaskCard
            icon="🥗"
            label="Dieta — sin cheat meals"
            done={day.diet_done}
            onToggle={() => updateDay({ diet_done: !day.diet_done })}
          />

          {/* Video diario */}
          <TaskCard
            icon="🎥"
            label="Video — @santimeza.ads"
            done={day.insight_done}
            onToggle={() =>
              updateDay({
                insight_done: !day.insight_done,
                insight_minutes: !day.insight_done ? 1 : 0,
              })
            }
          />

          {/* Lectura */}
          <TaskCard
            icon="📖"
            label="Lectura — 10 páginas"
            done={day.reading_done}
            onToggle={() =>
              updateDay({
                reading_done: !day.reading_done,
                reading_page: !day.reading_done
                  ? (day.reading_page || 0) + 10
                  : Math.max(0, (day.reading_page || 0) - 10),
              })
            }
          >
            {day.reading_done && (
              <p className="text-xs text-[#A1A1AA] font-medium">
                Pág. acumulada: {day.reading_page}
              </p>
            )}
          </TaskCard>

          {/* Foto */}
          <TaskCard
            icon="📸"
            label="Foto del día"
            done={!!day.photo_url}
          >
            <PhotoUpload
              date={day.date}
              currentUrl={day.photo_url}
              onUploaded={(url) => updateDay({ photo_url: url })}
            />
          </TaskCard>
        </div>
      </section>

      {/* El día se cierra solo cuando las 7 tasks están completas */}
      {day.completed && (
        <div className="text-center py-3 animate-slide-up" role="status" aria-live="polite">
          <p className="text-green-400 font-black text-base">✓ Día {dayNumber} completado</p>
          <p className="text-xs text-[#52525B] mt-1">Cerrado automáticamente. Mañana se sigue.</p>
        </div>
      )}

      {saving && (
        <div
          className="fixed top-4 right-4 w-2 h-2 bg-accent rounded-full animate-pulse"
          role="status"
          aria-label="Guardando..."
        />
      )}
    </main>
  )
}
