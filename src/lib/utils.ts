import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { differenceInDays, parseISO, startOfDay, format } from 'date-fns'
import { CHALLENGE_CONFIG } from '@/config/challenge'

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

export function isToday(dateStr: string): boolean {
  return dateStr === todayISO()
}

export function isPastDay(dateStr: string): boolean {
  const date = parseISO(dateStr)
  const today = startOfDay(new Date())
  return differenceInDays(today, date) > 0
}
