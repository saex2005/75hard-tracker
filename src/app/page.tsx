'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, type DayRecord, type ChallengeState } from '@/lib/supabase'
import { calcDayNumber, todayISO, isPastDay } from '@/lib/utils'
import { CHALLENGE_CONFIG, BOTTLES_PER_DAY } from '@/config/challenge'
import ProgressBar from '@/components/ProgressBar'
import TaskCard from '@/components/TaskCard'
import WaterCounter from '@/components/WaterCounter'
import MinutePicker from '@/components/MinutePicker'
import DayFailed from '@/components/DayFailed'
import PhotoUpload from '@/components/PhotoUpload'

type AppState =
  | { status: 'loading' }
  | { status: 'failed'; dayNumber: number; streak: number }
  | { status: 'complete' }
  | { status: 'active'; day: DayRecord; challengeState: ChallengeState; dayNumber: number }
  | { status: 'error'; message: string }

export default function HomePage() {
  const [state, setState] = useState<AppState>({ status: 'loading' })
  const [saving, setSaving] = useState(false)
  const [closing, setClosing] = useState(false)
  const [restartLoading, setRestartLoading] = useState(false)

  const loadData = useCallback(async () => {
    setState({ status: 'loading' })

    const { data: cs, error: csError } = await supabase
      .from('challenge_state')
      .select('*')
      .eq('id', 1)
      .single()

    if (csError || !cs) {
      setState({ status: 'error', message: 'No se pudo cargar el estado del reto.' })
      return
    }

    const dayNumber = calcDayNumber(cs.current_run_start)

    if (dayNumber > CHALLENGE_CONFIG.totalDays) {
      setState({ status: 'complete' })
      return
    }

    // Detectar si el día anterior falló
    if (dayNumber > 1) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayISO = yesterday.toISOString().split('T')[0]

      const { data: yDay } = await supabase
        .from('days')
        .select('completed')
        .eq('date', yesterdayISO)
        .single()

      if (yDay && !yDay.completed) {
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

    setState({ status: 'active', day: dayData, challengeState: cs, dayNumber })
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function updateDay(patch: Partial<DayRecord>) {
    if (state.status !== 'active') return
    setSaving(true)

    const updated = { ...state.day, ...patch }
    const { error } = await supabase
      .from('days')
      .update(patch)
      .eq('id', state.day.id)

    if (!error) {
      setState({
        status: 'active',
        day: updated,
        challengeState: state.challengeState,
        dayNumber: state.dayNumber,
      })
    }
    setSaving(false)
  }

  async function closeDay() {
    if (state.status !== 'active') return
    setClosing(true)

    const { error: dayError } = await supabase
      .from('days')
      .update({ completed: true })
      .eq('id', state.day.id)

    if (!dayError) {
      const newStreak = state.dayNumber
      if (newStreak > state.challengeState.best_streak) {
        await supabase
          .from('challenge_state')
          .update({ best_streak: newStreak })
          .eq('id', 1)
      }
      setState({
        status: 'active',
        day: { ...state.day, completed: true },
        challengeState: state.challengeState,
        dayNumber: state.dayNumber,
      })
    }

    setClosing(false)
  }

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
      <div className="min-h-dvh flex items-center justify-center">
        <div
          className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"
          role="status"
          aria-label="Cargando..."
        />
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
  const allDone =
    day.gym_done &&
    day.cardio_done &&
    waterDone &&
    day.diet_done &&
    day.reading_done &&
    !!day.photo_url

  return (
    <main className="max-w-md mx-auto px-4 pt-6 pb-4 space-y-5" aria-label="Checklist del día">
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h1 className="text-5xl font-black tracking-tighter">Día {dayNumber}</h1>
          <span className="text-sm text-[#A1A1AA] font-mono">de 75</span>
        </div>
        <ProgressBar current={dayNumber} total={CHALLENGE_CONFIG.totalDays} />
        <p className="text-xs text-[#A1A1AA] font-medium">
          🔥 Racha: {dayNumber > 1 ? `${dayNumber - 1} días` : 'recién arrancás'}
        </p>
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
            disabled={saving || day.completed}
          >
            {day.gym_done && (
              <MinutePicker
                minutes={day.gym_minutes}
                onChange={(n) => updateDay({ gym_minutes: n })}
                label="gym"
                disabled={saving || day.completed}
              />
            )}
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
            disabled={saving || day.completed}
          >
            {day.cardio_done && (
              <MinutePicker
                minutes={day.cardio_minutes}
                onChange={(n) => updateDay({ cardio_minutes: n })}
                label="cardio"
                disabled={saving || day.completed}
              />
            )}
          </TaskCard>

          {/* Agua */}
          <TaskCard
            icon="💧"
            label="Agua — 1 galón"
            done={waterDone}
            disabled={saving || day.completed}
          >
            <WaterCounter
              bottles={day.water_bottles}
              onChange={(n) => updateDay({ water_bottles: n })}
              disabled={saving || day.completed}
            />
          </TaskCard>

          {/* Dieta */}
          <TaskCard
            icon="🥗"
            label="Dieta — sin cheat meals"
            done={day.diet_done}
            onToggle={() => updateDay({ diet_done: !day.diet_done })}
            disabled={saving || day.completed}
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
            disabled={saving || day.completed}
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
            disabled={saving || day.completed}
          >
            <PhotoUpload
              date={day.date}
              currentUrl={day.photo_url}
              onUploaded={(url) => updateDay({ photo_url: url })}
              disabled={saving || day.completed}
            />
          </TaskCard>
        </div>
      </section>

      {/* CTA Cerrar día */}
      {allDone && !day.completed && (
        <div className="animate-slide-up pt-2">
          <button
            type="button"
            onClick={closeDay}
            disabled={closing}
            className="w-full h-14 bg-accent text-black font-black text-base rounded-xl
              transition-all duration-150 active:scale-[0.98] hover:brightness-105
              disabled:opacity-60 disabled:cursor-not-allowed tracking-tight"
          >
            {closing ? 'Guardando...' : 'CERRAR DÍA ✓'}
          </button>
        </div>
      )}

      {day.completed && (
        <div className="text-center py-2 animate-fade-in" role="status" aria-live="polite">
          <p className="text-green-400 font-bold text-sm">✓ Día {dayNumber} completado</p>
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
