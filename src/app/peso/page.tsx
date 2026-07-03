'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase, type WeightCheckpoint } from '@/lib/supabase'
import { formatDate, todayISO } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function PesoPage() {
  const [checkpoints, setCheckpoints] = useState<WeightCheckpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    date: todayISO(),
    weight_kg: '',
    notes: '',
  })

  useEffect(() => {
    loadCheckpoints()
  }, [])

  async function loadCheckpoints() {
    const { data } = await supabase
      .from('weight_checkpoints')
      .select('*')
      .order('date', { ascending: false })

    setCheckpoints(data ?? [])
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const weight = parseFloat(form.weight_kg)
    if (!form.weight_kg || isNaN(weight) || weight < 30 || weight > 300) {
      setError('Ingresá un peso válido (entre 30 y 300 kg).')
      return
    }

    setSaving(true)

    const { error: insertError } = await supabase
      .from('weight_checkpoints')
      .insert({
        date: form.date,
        weight_kg: weight,
        notes: form.notes || null,
      })

    if (insertError) {
      setError('Error al guardar. Intentá de nuevo.')
    } else {
      setSuccess(true)
      setForm({ date: todayISO(), weight_kg: '', notes: '' })
      await loadCheckpoints()
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 pt-6 space-y-6" aria-busy="true" aria-label="Cargando...">
        <div className="h-9 w-24 bg-surface2 rounded-lg animate-pulse" />
        <div className="h-[220px] bg-surface border border-[#262626] rounded-xl animate-pulse" />
        <div className="space-y-2">
          <div className="h-3 w-24 bg-surface2 rounded animate-pulse mb-3" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-surface border border-[#262626] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <main className="max-w-md mx-auto px-4 pt-6 pb-4 space-y-6">
      <header>
        <h1 className="text-3xl font-black tracking-tight">Peso</h1>
        <p className="text-sm text-[#A1A1AA] mt-1">Registro cada 2 semanas</p>
      </header>

      {/* Formulario */}
      <section aria-labelledby="form-heading">
        <h2 id="form-heading" className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#52525B] mb-3">
          Registrar peso
        </h2>

        <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-[#262626] p-4 space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="date" className="text-xs font-semibold text-[#A1A1AA]">
              Fecha
            </label>
            <input
              id="date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
              className="w-full bg-surface2 border border-[#262626] rounded-lg px-3 py-2.5 text-sm text-[#FAFAFA] focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="weight" className="text-xs font-semibold text-[#A1A1AA]">
              Peso (kg) <span className="text-red-500" aria-label="requerido">*</span>
            </label>
            <input
              id="weight"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="30"
              max="300"
              placeholder="87.0"
              value={form.weight_kg}
              onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
              required
              aria-describedby={error ? 'weight-error' : undefined}
              aria-invalid={!!error}
              className={cn(
                'w-full bg-surface2 border rounded-lg px-3 py-2.5 text-sm text-[#FAFAFA] focus:outline-none transition-colors font-mono tabular-nums',
                error ? 'border-red-500' : 'border-[#262626] focus:border-accent'
              )}
            />
            {error && (
              <p id="weight-error" className="text-xs text-red-400" role="alert" aria-live="polite">
                {error}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="notes" className="text-xs font-semibold text-[#A1A1AA]">
              Notas (opcional)
            </label>
            <input
              id="notes"
              type="text"
              placeholder="Checkpoint semana 2..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full bg-surface2 border border-[#262626] rounded-lg px-3 py-2.5 text-sm text-[#FAFAFA] focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {success && (
            <p className="text-xs text-green-400 font-medium" role="status" aria-live="polite">
              ✓ Peso guardado correctamente
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full h-11 bg-accent text-black font-bold text-sm rounded-xl
              transition-all duration-150 active:scale-[0.98] hover:brightness-105
              disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </form>
      </section>

      {/* Historial */}
      {checkpoints.length > 0 && (
        <section aria-labelledby="history-heading">
          <h2 id="history-heading" className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#52525B] mb-3">
            Historial
          </h2>
          <ol className="space-y-2">
            {checkpoints.map((cp, i) => (
              <li
                key={cp.id}
                className="flex items-center justify-between bg-surface rounded-xl border border-[#262626] px-4 py-3"
              >
                <div>
                  <p className="text-xs text-[#A1A1AA]">{formatDate(cp.date)}</p>
                  {cp.notes && <p className="text-xs text-[#52525B] mt-0.5">{cp.notes}</p>}
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold tabular-nums text-base">
                    {Number(cp.weight_kg).toFixed(1)}
                    <span className="text-xs text-[#A1A1AA] font-medium ml-0.5">kg</span>
                  </span>
                  {i < checkpoints.length - 1 && (
                    <p className="text-[10px] font-mono tabular-nums mt-0.5">
                      {(() => {
                        const diff = Number(cp.weight_kg) - Number(checkpoints[i + 1].weight_kg)
                        return (
                          <span className={diff < 0 ? 'text-green-400' : diff > 0 ? 'text-red-400' : 'text-[#52525B]'}>
                            {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                          </span>
                        )
                      })()}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  )
}
