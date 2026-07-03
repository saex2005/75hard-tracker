'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase, type DayRecord } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function FotosPage() {
  const [days, setDays] = useState<DayRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<DayRecord | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    supabase
      .from('days')
      .select('*')
      .not('photo_url', 'is', null)
      .order('day_number', { ascending: true })
      .then(({ data }) => {
        setDays((data ?? []).filter((d) => d.photo_url))
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
      <div className="min-h-dvh flex items-center justify-center">
        <div
          className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"
          role="status"
          aria-label="Cargando fotos..."
        />
      </div>
    )
  }

  return (
    <main className="max-w-md mx-auto px-4 pt-6 pb-4">
      <header className="mb-6">
        <h1 className="text-3xl font-black tracking-tight">Fotos</h1>
        <p className="text-sm text-[#A1A1AA] mt-1">{days.length} fotos de progreso</p>
      </header>

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
