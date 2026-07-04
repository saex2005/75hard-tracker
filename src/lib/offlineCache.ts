import type { DayRecord, ChallengeState } from './supabase'

const KEYS = {
  day: '75hard_day',
  cs: '75hard_cs',
  queue: '75hard_queue',
}

type QueueItem = {
  dayId: string
  patch: Partial<DayRecord>
}

export function cacheDay(day: DayRecord) {
  try { localStorage.setItem(KEYS.day, JSON.stringify(day)) } catch {}
}

export function getCachedDay(): DayRecord | null {
  try { return JSON.parse(localStorage.getItem(KEYS.day) ?? 'null') } catch { return null }
}

export function cacheChallengeState(cs: ChallengeState) {
  try { localStorage.setItem(KEYS.cs, JSON.stringify(cs)) } catch {}
}

export function getCachedChallengeState(): ChallengeState | null {
  try { return JSON.parse(localStorage.getItem(KEYS.cs) ?? 'null') } catch { return null }
}

export function enqueue(item: QueueItem) {
  try {
    const q = getQueue()
    const idx = q.findIndex((x) => x.dayId === item.dayId)
    if (idx >= 0) {
      q[idx].patch = { ...q[idx].patch, ...item.patch }
    } else {
      q.push(item)
    }
    localStorage.setItem(KEYS.queue, JSON.stringify(q))
  } catch {}
}

export function getQueue(): QueueItem[] {
  try { return JSON.parse(localStorage.getItem(KEYS.queue) ?? '[]') } catch { return [] }
}

export function clearQueue() {
  try { localStorage.removeItem(KEYS.queue) } catch {}
}
