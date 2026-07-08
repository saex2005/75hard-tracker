import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { differenceInDays, parseISO, startOfDay, format } from 'date-fns'
import { CHALLENGE_CONFIG, BOTTLES_PER_DAY } from '@/config/challenge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calcDayNumber(currentRunStart: string): number {
  const start = parseISO(currentRunStart)
  const today = startOfDay(new Date())
  return differenceInDays(today, start) + 1
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
  return format(new Date(), 'yyyy-MM-dd')
}

// Fechas en hora argentina para server routes (Vercel corre en UTC).
// Argentina es UTC-3 fijo, sin DST — el offset constante es correcto siempre.
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

// Verifica las 7 tasks reales de un día — la fuente de verdad del cierre.
// `completed` es un derivado de esto; nunca al revés.
type DayTasks = {
  gym_done: boolean
  cardio_done: boolean
  water_bottles: number
  diet_done: boolean
  reading_done: boolean
  insight_done: boolean
  photo_url: string | null
}

export function isDayComplete(day: DayTasks): boolean {
  return (
    day.gym_done &&
    day.cardio_done &&
    day.water_bottles >= BOTTLES_PER_DAY &&
    day.diet_done &&
    day.reading_done &&
    day.insight_done &&
    !!day.photo_url
  )
}

export function isPastDay(dateStr: string): boolean {
  const date = parseISO(dateStr)
  const today = startOfDay(new Date())
  return differenceInDays(today, date) > 0
}
