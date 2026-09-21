import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { differenceInDays, parseISO, format } from 'date-fns'
import { CHALLENGE_CONFIG } from '@/config/challenge'
import type { StudyCycle } from '@/lib/supabase'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calcDayNumber(currentRunStart: string): number {
  return dayNumberFor(todayART(), currentRunStart)
}

export function calcProgressPercent(dayNumber: number): number {
  return Math.min(100, Math.round((dayNumber / CHALLENGE_CONFIG.totalDays) * 100))
}

export function isChallengeComplete(dayNumber: number): boolean {
  return dayNumber > CHALLENGE_CONFIG.totalDays
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'dd/MM/yyyy')
}

export function todayISO(): string {
  return todayART()
}

// Fechas en hora argentina — únicas fuentes de "hoy"/"ayer" en toda la app.
// Vercel corre en UTC y el reloj del dispositivo no es confiable; las filas
// de `days` están keyeadas por fecha ART. Argentina es UTC-3 fijo, sin DST —
// el offset constante es correcto siempre.
export function todayART(): string {
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().split('T')[0]
}

export function yesterdayART(): string {
  return new Date(Date.now() - 27 * 3600 * 1000).toISOString().split('T')[0]
}

export function isToday(dateStr: string): boolean {
  return dateStr === todayISO()
}

// Día del reto para una fecha dada (server-safe: ambas son date-strings YYYY-MM-DD)
export function dayNumberFor(dateISO: string, currentRunStart: string): number {
  return differenceInDays(parseISO(dateISO), parseISO(currentRunStart)) + 1
}

// Verifica las 4 tasks reales de un día del reto "100 Días" — la fuente de
// verdad del cierre. `completed` es un derivado de esto; nunca al revés.
// Si el día es el end_date de un ciclo de estudio activo, además requiere
// que ese ciclo esté cerrado (con su documento) — sin eso, la Regla 1 no
// se cumple aunque el bloque de 90 min sí esté marcado.
type DayTasks = {
  date: string
  study_block_done: boolean
  gym_done: boolean
  reading_done: boolean
  steps: number
}

export function isCycleCloseDay(dateStr: string, cycle: StudyCycle | null): boolean {
  return !!cycle && cycle.end_date === dateStr
}

export function isDayComplete(day: DayTasks, cycle: StudyCycle | null): boolean {
  const cycleOk = !isCycleCloseDay(day.date, cycle) || !!cycle?.closed
  return (
    day.study_block_done &&
    cycleOk &&
    day.gym_done &&
    day.reading_done &&
    day.steps >= CHALLENGE_CONFIG.stepsGoal
  )
}

// Techo absoluto del reto — un reset nunca puede hacer que el reto siga
// corriendo más allá de esta fecha, sin importar cuántas veces se haya
// reseteado current_run_start.
export function isChallengeWindowOver(dateISO: string): boolean {
  return dateISO > CHALLENGE_CONFIG.endDate
}

export function isPastDay(dateStr: string): boolean {
  return dateStr < todayART()
}
