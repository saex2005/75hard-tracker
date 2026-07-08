'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { supabase, type DayRecord } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function FotosPage() {
  const [days, setDays] = useState<DayRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<DayRecord | null>(null)
  const [compareA, setCompareA] = useState<string | null>(null)
  const [compareB, setCompareB] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    supabase
      .from('days')
      .select('*')
      .not('photo_url', 'is', null)
      .order('date', { ascending: true })
      .then(({ data }) => {
        const withPhoto = (data ?? []).filter((d) => d.photo_url)
        setDays(withPhoto)
        // Default: primera foto vs la más reciente
        if (withPhoto.length >= 2) {
          setCompareA(withPhoto[0].id)
          setCompareB(withPhoto[withPhoto.length - 1].id)
        }
        setLoading(false)
      })
  }, [])

  function openPhoto(day: DayRecord) {
    setSelected(day)
    dialogRef.current?.showModal()
  }

  function closePhoto() {
    dialogRef.current?.close()
    setSelected(null)
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handleEsc = () => setSelected(null)
    dialog.addEventListener('close', handleEsc)
    return () => dialog.removeEventListener('close', handleEsc)
  }, [])

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 pt-6" aria-busy="true" aria-label="Cargando fotos...">
        <div className="mb-6 space-y-2">
          <div className="h-9 w-24 bg-surface2 rounded-lg animate-pulse" />
          <div className="h-3 w-32 bg-surface2 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="aspect-square bg-surface2 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <main className="max-w-md mx-auto px-4 pt-6 pb-4">
      <header className="mb-6">
        <h1 className="text-3xl font-black tracking-tight">Fotos</h1>
        <p className="text-sm text-[#A1A1AA] mt-1">{days.length} fotos de progreso</p>
      </header>

      {/* Comparador: Día 1 vs hoy (o los días que elijas) */}
      {days.length >= 2 && compareA && compareB && (
        <section aria-label="Comparador de progreso" className="mb-6">
          <h2 className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#52525B] mb-3">
            Comparar
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: compareA, set: setCompareA, side: 'Antes' },
              { value: compareB, set: setCompareB, side: 'Después' },
            ].map(({ value, set, side }) => {
              const day = days.find((d) => d.id === value)
              return (
                <div key={side} className="space-y-1.5">
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-surface2 border border-[#262626]">
                    {day && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={day.photo_url!}
                        alt={`${side}: Día ${day.day_number}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {day && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 py-1.5 px-2 flex justify-between items-baseline">
                        <span className="text-xs font-black text-[#FAFAFA]">
                          Día {day.day_number}
                        </span>
                        <span className="text-[10px] font-mono text-[#A1A1AA]">
                          {formatDate(day.date)}
                        </span>
                      </div>
                    )}
                  </div>
                  <select
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    aria-label={`Elegir foto de ${side.toLowerCase()}`}
                    className="w-full h-9 bg-surface border border-[#262626] rounded-lg px-2 text-xs text-[#A1A1AA] focus:outline-none focus:border-accent"
                  >
                    {days.map((d) => (
                      <option key={d.id} value={d.id}>
                        Día {d.day_number} — {formatDate(d.date)}
                      </option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {days.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[#52525B] text-sm">Todavía no hay fotos subidas.</p>
        </div>
      ) : (
        <section aria-label="Galería de fotos de progreso">
          <ul className="grid grid-cols-3 gap-1.5">
            {days.map((day) => (
              <li key={day.id}>
                <button
                  type="button"
                  onClick={() => openPhoto(day)}
                  aria-label={`Foto del Día ${day.day_number}, ${formatDate(day.date)}`}
                  className="relative aspect-square w-full rounded-lg overflow-hidden bg-surface2 group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={day.photo_url!}
                    alt={`Progreso Día ${day.day_number}`}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-1 px-1.5">
                    <span className="text-[10px] font-mono text-[#FAFAFA]">D{day.day_number}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Modal fullscreen */}
      <dialog
        ref={dialogRef}
        className={cn(
          'fixed inset-0 z-50 m-0 w-full h-full max-w-none max-h-none p-0',
          'bg-black backdrop:bg-black',
          'open:flex open:flex-col open:items-center open:justify-center'
        )}
        aria-label={selected ? `Foto del Día ${selected.day_number}` : 'Foto de progreso'}
        onClick={(e) => {
          if (e.target === dialogRef.current) closePhoto()
        }}
      >
        {selected && (
          <div className="relative max-w-md w-full px-4">
            <button
              type="button"
              onClick={closePhoto}
              aria-label="Cerrar foto"
              className="absolute top-2 right-6 z-10 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white text-sm"
            >
              ✕
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected.photo_url!}
              alt={`Progreso Día ${selected.day_number}`}
              className="w-full rounded-xl object-contain max-h-[80dvh]"
            />
            <p className="text-center text-sm text-[#A1A1AA] mt-3">
              Día {selected.day_number} — {formatDate(selected.date)}
            </p>
          </div>
        )}
      </dialog>
    </main>
  )
}
