'use client'

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useState } from 'react'
import { todayISO, cn } from '@/lib/utils'
import {
  GYM_SESSIONS,
  SESSION_LABELS,
  getSessionForDate,
  type SessionKey,
  type Exercise,
} from '@/config/gym'
import type { GymLog } from '@/app/api/gym-log/route'

const SESSION_KEYS: Exclude<SessionKey, 'descanso'>[] = ['torso', 'piernas', 'empujes', 'traccion']

export default function GymPage() {
  const date = todayISO()
  const todaySession = getSessionForDate(date)
  const [session, setSession] = useState<Exclude<SessionKey, 'descanso'>>(
    todaySession === 'descanso' ? 'torso' : todaySession
  )
  const [todayLogs, setTodayLogs] = useState<GymLog[]>([])
  const [lastLogs, setLastLogs] = useState<GymLog[]>([])
  const [lastDate, setLastDate] = useState<string | null>(null)
  const [tableMissing, setTableMissing] = useState(false)

  useEffect(() => {
    fetch(`/api/gym-log?date=${date}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: GymLog[]) => setTodayLogs(data))
      .catch(() => setTableMissing(true))
  }, [date])

  useEffect(() => {
    fetch(`/api/gym-log?session=${session}&before=${date}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: GymLog[]) => {
        setLastLogs(data)
        setLastDate(data.length > 0 ? data[0].date : null)
      })
      .catch(() => {})
  }, [session, date])

  const addLog = useCallback(
    async (exercise: string, weight: number, reps: number) => {
      const setNum = todayLogs.filter((l) => l.exercise === exercise).length + 1
      const res = await fetch('/api/gym-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, session, exercise, set_num: setNum, weight, reps }),
      })
      if (!res.ok) {
        setTableMissing(true)
        return false
      }
      const saved: GymLog = await res.json()
      setTodayLogs((prev) => [...prev, saved])
      return true
    },
    [date, session, todayLogs]
  )

  const removeLog = useCallback(async (id: string) => {
    setTodayLogs((prev) => prev.filter((l) => l.id !== id))
    await fetch(`/api/gym-log?id=${id}`, { method: 'DELETE' })
  }, [])

  const sessionData = GYM_SESSIONS[session]
  const isRestDay = todaySession === 'descanso'

  return (
    <main className="max-w-md mx-auto px-4 pt-6 pb-4 space-y-5">
      <header className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight">Gym</h1>
        <p className="text-sm text-[#A1A1AA]">
          Hoy toca{' '}
          <span className="text-accent font-bold">{SESSION_LABELS[todaySession]}</span>
          {' '}· Microciclo 1 (EG Coaching)
        </p>
      </header>

      {isRestDay && (
        <div className="bg-surface border border-[#262626] rounded-xl p-4 space-y-2">
          <p className="text-sm font-bold">🚶 Domingo / gym cerrado</p>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            Entrenamiento 1 = caminata de 45 min continuos a 4-5 km/h en la caminadora under
            desk. Mismo checkbox de la app.
          </p>
          <p className="text-xs text-[#52525B] leading-relaxed">
            Si son 2 días seguidos sin gym: sumá el circuito corto de fuerza (sentadilla búlgara,
            flexiones, puente de glúteo, plancha — 15-20 min) antes de la caminata en al menos uno
            de los dos días.
          </p>
        </div>
      )}

      {tableMissing && (
        <div className="bg-orange-500/10 border border-orange-500/25 rounded-xl p-3">
          <p className="text-xs text-orange-400 leading-relaxed">
            El registro de pesos no está disponible — falta correr{' '}
            <code className="font-mono">supabase/gym-schema.sql</code> en el SQL editor de
            Supabase. La rutina se puede ver igual.
          </p>
        </div>
      )}

      {/* Selector de sesión (para feriados o días corridos) */}
      <div className="flex gap-1.5" role="tablist" aria-label="Sesión de entrenamiento">
        {SESSION_KEYS.map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={session === key}
            onClick={() => setSession(key)}
            className={cn(
              'flex-1 py-2 rounded-lg text-xs font-bold transition-colors duration-150',
              session === key
                ? 'bg-accent text-black'
                : 'bg-surface border border-[#262626] text-[#52525B]'
            )}
          >
            {SESSION_LABELS[key]}
          </button>
        ))}
      </div>

      {/* Entrada en calor */}
      {sessionData.warmup.length > 0 && (
        <section aria-labelledby="warmup-heading">
          <h2
            id="warmup-heading"
            className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#52525B] mb-2"
          >
            Entrada en calor
          </h2>
          <div className="bg-surface border border-[#262626] rounded-xl p-3 space-y-1">
            {sessionData.warmup.map((w) => (
              <p key={w.name} className="text-xs text-[#A1A1AA]">
                <span className="text-[#FAFAFA] font-medium">{w.name}</span> — {w.sets} ×{' '}
                {w.reps}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* Ejercicios */}
      <section aria-labelledby="exercises-heading" className="space-y-2">
        <h2
          id="exercises-heading"
          className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#52525B]"
        >
          {sessionData.label}
          {lastDate && (
            <span className="normal-case tracking-normal font-medium">
              {' '}
              · última vez: {lastDate.split('-').reverse().slice(0, 2).join('/')}
            </span>
          )}
        </h2>
        {sessionData.exercises.map((ex) => (
          <ExerciseCard
            key={ex.code}
            exercise={ex}
            todaySets={todayLogs.filter((l) => l.exercise === ex.name)}
            lastSets={lastLogs.filter((l) => l.exercise === ex.name)}
            onAdd={addLog}
            onRemove={removeLog}
            disabled={tableMissing}
          />
        ))}
      </section>

      <p className="text-[11px] text-[#52525B] text-center leading-relaxed">
        2/1 = 2 series top + 1 backoff · RIR = reps en reserva al terminar la serie
      </p>
    </main>
  )
}

function ExerciseCard({
  exercise,
  todaySets,
  lastSets,
  onAdd,
  onRemove,
  disabled,
}: {
  exercise: Exercise
  todaySets: GymLog[]
  lastSets: GymLog[]
  onAdd: (exercise: string, weight: number, reps: number) => Promise<boolean>
  onRemove: (id: string) => void
  disabled: boolean
}) {
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    const w = parseFloat(weight.replace(',', '.'))
    const r = parseInt(reps, 10)
    if (!Number.isFinite(w) || w < 0 || !Number.isInteger(r) || r < 1) return
    setSaving(true)
    const ok = await onAdd(exercise.name, w, r)
    setSaving(false)
    if (ok) setReps('') // el peso suele repetirse entre series — se conserva
  }

  return (
    <div className="bg-surface border border-[#262626] rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-sm text-[#FAFAFA]">
            <span className="text-[#52525B] font-mono text-xs mr-1.5">{exercise.code}</span>
            {exercise.name}
          </p>
          <p className="text-xs text-[#A1A1AA] mt-0.5 font-mono tabular-nums">
            {exercise.sets} series · {exercise.reps} reps · RIR {exercise.rir} · descanso{' '}
            {exercise.rest}′
          </p>
        </div>
      </div>

      <details className="group">
        <summary className="text-[11px] text-[#52525B] cursor-pointer list-none select-none hover:text-[#A1A1AA] transition-colors">
          Técnica ▾
        </summary>
        <p className="text-xs text-[#A1A1AA] leading-relaxed mt-1.5">{exercise.notes}</p>
      </details>

      {lastSets.length > 0 && (
        <p className="text-[11px] text-[#52525B] font-mono tabular-nums">
          Última vez: {lastSets.map((s) => `${s.weight}×${s.reps}`).join(' · ')}
        </p>
      )}

      {todaySets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {todaySets.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onRemove(s.id)}
              aria-label={`Borrar set de ${s.weight} kg por ${s.reps} reps`}
              className="text-xs font-mono tabular-nums bg-green-500/10 border border-green-500/25 text-green-400 rounded-full px-2.5 py-1 active:scale-95 transition-transform"
            >
              {s.weight}kg × {s.reps} ✕
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          inputMode="decimal"
          placeholder="kg"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          disabled={disabled}
          aria-label={`Peso en kg para ${exercise.name}`}
          className="w-20 h-10 bg-surface2 border border-[#262626] rounded-lg px-3 text-base text-center font-mono tabular-nums text-[#FAFAFA] placeholder:text-[#3F3F46] focus:outline-none focus:border-accent disabled:opacity-40"
        />
        <input
          type="text"
          inputMode="numeric"
          placeholder="reps"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          disabled={disabled}
          aria-label={`Repeticiones para ${exercise.name}`}
          className="w-20 h-10 bg-surface2 border border-[#262626] rounded-lg px-3 text-base text-center font-mono tabular-nums text-[#FAFAFA] placeholder:text-[#3F3F46] focus:outline-none focus:border-accent disabled:opacity-40"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled || saving || !weight || !reps}
          className="flex-1 h-10 bg-accent text-black font-bold text-sm rounded-lg transition-all duration-150 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {saving ? '...' : '+ Set'}
        </button>
      </div>
    </div>
  )
}
