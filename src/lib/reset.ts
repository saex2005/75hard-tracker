import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, StudyCycle } from '@/lib/supabase'
import { todayART, yesterdayART, dayNumberFor, isDayComplete, isChallengeWindowOver } from '@/lib/utils'
import { CHALLENGE_CONFIG } from '@/config/challenge'

// Única lógica de cierre/reset del reto. La usan el cron (03:05) y el
// notify evening (21:05) — nunca duplicar esto en otro lado.
//
// Red de seguridad: si ayer tiene las 4 tasks completas pero completed=false
// (no se tocó "cerrar" o falló el auto-cierre), se cierra en vez de resetear.
// Solo se resetea cuando de verdad faltó una task.
//
// Techo absoluto: el reto "100 Días" corre 23/09→31/12/2026. Un reset nunca
// puede hacer que siga corriendo después del 31/12, sin importar cuántas
// veces se haya reseteado current_run_start — bug real detectado al cierre
// del 75 Hard (el cron reseteó a "Día 1" el 21/09 porque no había fila para
// el 20/09, un día en que el reto anterior ya había terminado).

export type ResetResult = {
  reset: boolean
  closedSafetyNet: boolean
  reason: string
}

async function getCycleForDate(
  supabase: SupabaseClient<Database>,
  dateISO: string
): Promise<StudyCycle | null> {
  const { data } = await supabase
    .from('study_cycles')
    .select('*')
    .lte('start_date', dateISO)
    .gte('end_date', dateISO)
    .maybeSingle()
  return data ?? null
}

export async function checkAndReset(
  supabase: SupabaseClient<Database>
): Promise<ResetResult> {
  const todayISO = todayART()
  const yesterdayISO = yesterdayART()

  // El reto ya terminó (fecha de calendario) — no resetear nunca más.
  if (isChallengeWindowOver(todayISO)) {
    return { reset: false, closedSafetyNet: false, reason: 'challenge window over' }
  }

  const { data: cs } = await supabase
    .from('challenge_state')
    .select('*')
    .eq('id', 1)
    .single()

  if (!cs) return { reset: false, closedSafetyNet: false, reason: 'no challenge state' }

  // El reto todavía no arrancó
  if (cs.current_run_start > yesterdayISO) {
    return { reset: false, closedSafetyNet: false, reason: 'challenge not started yet' }
  }

  const { data: yDay } = await supabase
    .from('days')
    .select('*')
    .eq('date', yesterdayISO)
    .single()

  if (yDay?.completed) {
    return { reset: false, closedSafetyNet: false, reason: 'yesterday completed' }
  }

  const yCycle = await getCycleForDate(supabase, yesterdayISO)

  // Red de seguridad: las 4 tasks estaban, solo faltó el flag
  if (yDay && isDayComplete(yDay, yCycle)) {
    await supabase.from('days').update({ completed: true }).eq('id', yDay.id)

    const streak = dayNumberFor(yesterdayISO, cs.current_run_start)
    if (streak > cs.best_streak) {
      await supabase.from('challenge_state').update({ best_streak: streak }).eq('id', 1)
    }
    return { reset: false, closedSafetyNet: true, reason: 'all tasks done — closed via safety net' }
  }

  // Fallo real (día sin abrir o task sin completar) → vuelta al Día 1
  await supabase
    .from('challenge_state')
    .update({
      current_run_start: todayISO,
      total_restarts: (cs.total_restarts ?? 0) + 1,
    })
    .eq('id', 1)

  // Si la fila de hoy ya existía (creada antes del reset), corregir su day_number
  await supabase.from('days').update({ day_number: 1 }).eq('date', todayISO)

  return { reset: true, closedSafetyNet: false, reason: yDay ? 'tasks incomplete' : 'no day row' }
}

// Garantiza que la fila de hoy exista con el day_number correcto.
// Sin esto, las notificaciones se apagan los días que no se abre la app.
export async function ensureTodayRow(
  supabase: SupabaseClient<Database>
): Promise<{ dayNumber: number; active: boolean }> {
  const todayISO = todayART()

  if (isChallengeWindowOver(todayISO)) {
    return { dayNumber: 0, active: false }
  }

  const { data: cs } = await supabase
    .from('challenge_state')
    .select('current_run_start')
    .eq('id', 1)
    .single()

  if (!cs) return { dayNumber: 0, active: false }

  const dayNumber = dayNumberFor(todayISO, cs.current_run_start)
  if (dayNumber < 1 || dayNumber > CHALLENGE_CONFIG.totalDays) {
    return { dayNumber, active: false }
  }

  const { data: existing } = await supabase
    .from('days')
    .select('id, day_number')
    .eq('date', todayISO)
    .single()

  if (!existing) {
    await supabase.from('days').insert({
      day_number: dayNumber,
      date: todayISO,
      study_block_done: false,
      study_block_minutes: 0,
      gym_done: false,
      gym_minutes: 0,
      reading_done: false,
      reading_page: 0,
      steps: 0,
      completed: false,
    })
  } else if (existing.day_number !== dayNumber) {
    // Fila creada antes de un reset — número desactualizado
    await supabase.from('days').update({ day_number: dayNumber }).eq('id', existing.id)
  }

  return { dayNumber, active: true }
}
