'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, type DayRecord } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { BOTTLES_PER_DAY } from '@/config/challenge'

export default function HistoriaPage() {
  const [days, setDays] = useState<DayRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('days')
      .select('*')
      .order('day_number', { ascending: true })
      .then(({ data }) => {
        setDays(data ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 pt-6" aria-busy="true" aria-label="Cargando historial...">
        <div className="mb-6 space-y-2">
          <div className="h-9 w-40 bg-surface2 rounded-lg animate-pulse" />
          <div className="h-3 w-24 bg-surface2 rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-[60px] bg-surface border border-[#262626] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <main className="max-w-md mx-auto px-4 pt-6 pb-4">
      <header className="mb-6">
        <h1 className="text-3xl font-black tracking-tight">Historial</h1>
        <p className="text-sm text-[#A1A1AA] mt-1">{days.length} días registrados</p>
      </header>

      {days.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[#52525B] text-sm">Todavía no hay días registrados.</p>
          <Link href="/" className="text-accent text-sm mt-2 inline-block hover:underline">
            Ir al día de hoy →
          </Link>
        </div>
      ) : (
        <ol className="space-y-2" aria-label="Lista de días del reto">
          {days.map((day) => {
            const completed = day.completed
            const gymOk = day.gym_done
            const cardioOk = day.cardio_done
            const waterOk = day.water_bottles >= BOTTLES_PER_DAY
            const dietOk = day.diet_done
            const readingOk = day.reading_done
            const photoOk = !!day.photo_url

            const tasksDone = [gymOk, cardioOk, waterOk, dietOk, readingOk, photoOk].filter(Boolean).length

            return (
              <li key={day.id}>
                <div
                  className={cn(
                    'rounded-xl border p-4 transition-colors duration-150',
                    completed
                      ? 'bg-green-500/5 border-green-500/20'
                      : 'bg-surface border-[#262626]'
                  )}
                  role="article"
                  aria-label={`Día ${day.day_number}: ${completed ? 'completado' : `${tasksDone} de 6 tasks`}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'text-lg leading-none',
                          completed ? 'text-green-400' : 'text-[#52525B]'
                        )}
                        aria-hidden="true"
                      >
                        {completed ? '✓' : '○'}
                      </span>
                      <div>
                        <p className="font-bold text-sm">Día {day.day_number}</p>
                        <p className="text-xs text-[#A1A1AA]">{formatDate(day.date)}</p>
                      </div>
                    </div>

                    <div className="flex gap-1" aria-label={`${tasksDone} de 6 tasks completados`}>
                      {[gymOk, cardioOk, waterOk, dietOk, readingOk, photoOk].map((ok, i) => (
                        <span
                          key={i}
                          className={cn(
                            'w-2 h-2 rounded-full',
                            ok ? 'bg-green-500' : 'bg-[#262626]'
                          )}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                  </div>

                  {!completed && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {!gymOk && <Tag>💪 gym</Tag>}
                      {!cardioOk && <Tag>🏃 cardio</Tag>}
                      {!waterOk && <Tag>💧 agua</Tag>}
                      {!dietOk && <Tag>🥗 dieta</Tag>}
                      {!readingOk && <Tag>📖 lectura</Tag>}
                      {!photoOk && <Tag>📸 foto</Tag>}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </main>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface2 text-[#52525B] font-medium">
      {children}
    </span>
  )
}
