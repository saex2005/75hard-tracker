'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { Food, MealSlot } from '@/lib/supabase'
import { cn } from '@/lib/utils'

// Carga diferida: @zxing arrastra ~125kB que no hace falta bajar en cada
// visita a /nutricion, solo cuando se toca el botón de escanear.
const BarcodeScanner = dynamic(() => import('./BarcodeScanner'), { ssr: false })

export type NewLogEntry = {
  meal: MealSlot
  food_id: string | null
  food_name: string
  grams: number
  kcal: number
  protein: number
  carbs: number
  fat: number
}

const GRAM_PRESETS = [50, 100, 150, 200]

const MEAL_OPTIONS: { value: MealSlot; label: string }[] = [
  { value: 'desayuno', label: 'Desayuno' },
  { value: 'almuerzo', label: 'Almuerzo' },
  { value: 'merienda', label: 'Merienda' },
  { value: 'cena', label: 'Cena' },
  { value: 'extra', label: 'Extra' },
]

function defaultMealByHour(): MealSlot {
  const h = new Date().getHours()
  if (h < 11) return 'desayuno'
  if (h < 16) return 'almuerzo'
  if (h < 19) return 'merienda'
  return 'cena'
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export default function FoodSearch({ onAdd }: { onAdd: (entry: NewLogEntry) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Food[]>([])
  const [recents, setRecents] = useState<Food[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [selected, setSelected] = useState<Food | null>(null)
  const [grams, setGrams] = useState<number>(100)
  const [meal, setMeal] = useState<MealSlot>(defaultMealByHour())
  const [showCreate, setShowCreate] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanLookup, setScanLookup] = useState(false)
  const [prefillFromScan, setPrefillFromScan] = useState<{
    barcode: string
    name?: string
    brand?: string
  } | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Alimentos más usados (últimos 30 días) — atajo antes de tipear
  useEffect(() => {
    let cancelled = false
    fetch('/api/foods/recent')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Food[]) => {
        if (!cancelled && Array.isArray(data)) setRecents(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // Búsqueda con debounce de 300ms
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setSearched(false)
      setSearching(false)
      return
    }

    setSearching(true)
    const t = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const res = await fetch(`/api/foods/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('search failed')
        const data: Food[] = await res.json()
        setResults(data)
        setSearched(true)
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setResults([])
          setSearched(true)
        }
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(t)
  }, [query])

  function selectFood(food: Food) {
    setSelected(food)
    setGrams(food.serving_g ?? 100)
    setShowCreate(false)
    setPrefillFromScan(null)
  }

  const handleBarcodeDetected = useCallback(async (code: string) => {
    setScanning(false)
    setScanLookup(true)
    try {
      const res = await fetch(`/api/foods/barcode/${encodeURIComponent(code)}`)
      const data = await res.json()
      if (data.found && data.food) {
        selectFood(data.food as Food)
      } else {
        // No está en la base local ni en Open Food Facts con macros completos —
        // llevar a "crear alimento" con el código ya cargado (nombre/marca si OFF los dio)
        setPrefillFromScan({ barcode: code, name: data.offName ?? undefined, brand: data.offBrand ?? undefined })
        setShowCreate(true)
      }
    } catch {
      setPrefillFromScan({ barcode: code })
      setShowCreate(true)
    } finally {
      setScanLookup(false)
    }
  }, [])

  function handleAdd() {
    if (!selected || grams <= 0) return
    onAdd({
      meal,
      food_id: selected.id,
      food_name: selected.brand ? `${selected.name} (${selected.brand})` : selected.name,
      grams,
      kcal: round1((selected.kcal_100 * grams) / 100),
      protein: round1((selected.protein_100 * grams) / 100),
      carbs: round1((selected.carbs_100 * grams) / 100),
      fat: round1((selected.fat_100 * grams) / 100),
    })
    // Reset para la próxima búsqueda
    setSelected(null)
    setQuery('')
    setResults([])
    setSearched(false)
  }

  return (
    <div className="space-y-3">
      {scanning && (
        <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setScanning(false)} />
      )}

      <div className="flex gap-2">
        <input
          type="search"
          inputMode="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelected(null)
          }}
          placeholder="Buscar alimento o marca…"
          className="flex-1 h-12 px-4 bg-[#1C1C1C] border border-[#262626] rounded-xl text-sm font-medium placeholder:text-[#52525B] focus:outline-none focus:border-[#3F3F46]"
        />
        <button
          onClick={() => {
            setSelected(null)
            setShowCreate(false)
            setScanning(true)
          }}
          disabled={scanLookup}
          aria-label="Escanear código de barras"
          className="h-12 w-12 shrink-0 flex items-center justify-center bg-[#1C1C1C] border border-[#262626] rounded-xl active:scale-95 transition-transform disabled:opacity-50"
        >
          {scanLookup ? (
            <span className="h-4 w-4 border-2 border-[#52525B] border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7V5a1 1 0 0 1 1-1h2M20 7V5a1 1 0 0 0-1-1h-2M4 17v2a1 1 0 0 0 1 1h2M20 17v2a1 1 0 0 1-1 1h-2M7 8v8M10 8v8M13 8v8M16 8v8" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {scanLookup && (
        <p className="text-xs text-[#52525B] font-medium text-center">Buscando el producto…</p>
      )}

      {/* Recientes — visibles solo sin búsqueda activa */}
      {!selected && query.trim().length < 2 && recents.length > 0 && (
        <div>
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#52525B] mb-2">
            Recientes
          </p>
          <div className="space-y-1.5">
            {recents.map((food) => (
              <button
                key={food.id}
                onClick={() => selectFood(food)}
                className="w-full bg-[#141414] border border-[#262626] rounded-xl px-3 py-2.5 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{food.name}</p>
                  {food.brand && (
                    <p className="text-xs text-[#52525B] font-medium truncate">{food.brand}</p>
                  )}
                </div>
                <p className="text-xs font-mono tabular-nums text-[#52525B] shrink-0">
                  {Math.round(food.kcal_100)} kcal · {food.protein_100}P
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Skeleton mientras busca */}
      {searching && !selected && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 bg-[#141414] border border-[#262626] rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Resultados */}
      {!searching && !selected && results.length > 0 && (
        <div className="space-y-2">
          {results.map((food) => (
            <button
              key={food.id}
              onClick={() => selectFood(food)}
              className="w-full bg-[#141414] border border-[#262626] rounded-xl p-3 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{food.name}</p>
                <p className="text-xs text-[#52525B] font-medium truncate">
                  {food.brand ?? (food.source === 'generic' ? 'Genérico' : 'Sin marca')}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-mono tabular-nums">{Math.round(food.kcal_100)} kcal</p>
                <p className="text-xs text-[#52525B] font-mono tabular-nums">
                  {food.protein_100}P · 100g
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Sin resultados → crear custom */}
      {!searching && !selected && searched && results.length === 0 && !showCreate && (
        <div className="text-center py-4 space-y-3">
          <p className="text-sm text-[#52525B] font-medium">Sin resultados para “{query.trim()}”</p>
          <button
            onClick={() => setShowCreate(true)}
            className="h-11 px-5 bg-[#1C1C1C] border border-[#262626] rounded-xl text-sm font-semibold active:scale-95 transition-transform"
          >
            Crear alimento
          </button>
        </div>
      )}

      {showCreate && !selected && (
        <CreateFoodForm
          initialName={prefillFromScan?.name ?? query.trim()}
          initialBrand={prefillFromScan?.brand}
          barcode={prefillFromScan?.barcode}
          onCreated={(food) => {
            setShowCreate(false)
            selectFood(food)
          }}
          onCancel={() => {
            setShowCreate(false)
            setPrefillFromScan(null)
          }}
        />
      )}

      {/* Selector de gramos + comida */}
      {selected && (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{selected.name}</p>
              {selected.brand && (
                <p className="text-xs text-[#52525B] font-medium truncate">{selected.brand}</p>
              )}
            </div>
            <button
              onClick={() => setSelected(null)}
              aria-label="Deseleccionar"
              className="text-xs text-[#52525B] font-semibold shrink-0 h-8 px-2"
            >
              Cambiar
            </button>
          </div>

          {/* Gramos */}
          <div>
            <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#52525B] mb-2">Cantidad</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                min={1}
                value={grams || ''}
                onChange={(e) => setGrams(Number(e.target.value))}
                className="w-20 h-11 px-3 bg-[#1C1C1C] border border-[#262626] rounded-xl text-sm font-mono tabular-nums text-center focus:outline-none focus:border-[#3F3F46]"
              />
              <span className="text-sm text-[#52525B] font-medium mr-1">g</span>
              {GRAM_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setGrams(preset)}
                  className={cn(
                    'h-11 px-2.5 rounded-xl text-xs font-mono tabular-nums border transition-colors',
                    grams === preset
                      ? 'bg-[#1C1C1C] border-[#3F3F46] text-[#FAFAFA]'
                      : 'bg-transparent border-[#262626] text-[#52525B]'
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Comida */}
          <div>
            <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#52525B] mb-2">Comida</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {MEAL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setMeal(option.value)}
                  className={cn(
                    'h-9 px-3 rounded-lg text-xs font-semibold border shrink-0 transition-colors',
                    meal === option.value
                      ? 'bg-[#1C1C1C] border-[#3F3F46] text-[#FAFAFA]'
                      : 'bg-transparent border-[#262626] text-[#52525B]'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Macros calculados */}
          {grams > 0 && (
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: 'kcal', value: round1((selected.kcal_100 * grams) / 100) },
                { label: 'P', value: round1((selected.protein_100 * grams) / 100) },
                { label: 'C', value: round1((selected.carbs_100 * grams) / 100) },
                { label: 'G', value: round1((selected.fat_100 * grams) / 100) },
              ].map((m) => (
                <div key={m.label} className="bg-[#1C1C1C] rounded-lg py-2">
                  <p className="text-sm font-black tabular-nums">{m.value}</p>
                  <p className="text-[10px] font-medium text-[#52525B]">{m.label}</p>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleAdd}
            disabled={!grams || grams <= 0}
            className={cn(
              'w-full h-12 rounded-xl text-sm font-bold transition-transform active:scale-[0.98]',
              grams > 0
                ? 'bg-orange-500 text-black'
                : 'bg-[#1C1C1C] text-[#52525B] cursor-not-allowed'
            )}
          >
            Agregar
          </button>
        </div>
      )}
    </div>
  )
}

function CreateFoodForm({
  initialName,
  initialBrand,
  barcode,
  onCreated,
  onCancel,
}: {
  initialName: string
  initialBrand?: string
  barcode?: string
  onCreated: (food: Food) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initialName)
  const [brand, setBrand] = useState(initialBrand ?? '')
  const [kcal, setKcal] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const valid =
    name.trim().length > 0 &&
    [kcal, protein, carbs, fat].every((v) => v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0)

  async function handleSave() {
    if (!valid || saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          brand: brand.trim() || undefined,
          kcal_100: Number(kcal),
          protein_100: Number(protein),
          carbs_100: Number(carbs),
          fat_100: Number(fat),
          barcode: barcode || undefined,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? 'No se pudo crear')
      }
      const food: Food = await res.json()
      onCreated(food)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full h-11 px-3 bg-[#1C1C1C] border border-[#262626] rounded-xl text-sm font-medium placeholder:text-[#52525B] focus:outline-none focus:border-[#3F3F46]'

  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 space-y-3">
      <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#52525B]">
        Nuevo alimento — valores por 100 g (de la etiqueta)
      </p>
      {barcode && (
        <p className="text-xs text-orange-500 font-medium">
          Código {barcode} escaneado — no está en la base, se guarda con este código para reconocerlo la próxima vez
        </p>
      )}
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" className={inputClass} />
      <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Marca (opcional)" className={inputClass} />
      <div className="grid grid-cols-4 gap-2">
        {[
          { value: kcal, set: setKcal, label: 'kcal' },
          { value: protein, set: setProtein, label: 'P (g)' },
          { value: carbs, set: setCarbs, label: 'C (g)' },
          { value: fat, set: setFat, label: 'G (g)' },
        ].map((field) => (
          <div key={field.label}>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={field.value}
              onChange={(e) => field.set(e.target.value)}
              className="w-full h-11 px-2 bg-[#1C1C1C] border border-[#262626] rounded-xl text-sm font-mono tabular-nums text-center focus:outline-none focus:border-[#3F3F46]"
            />
            <p className="text-[10px] font-medium text-[#52525B] text-center mt-1">{field.label}</p>
          </div>
        ))}
      </div>
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 h-11 rounded-xl text-sm font-semibold border border-[#262626] text-[#A1A1AA] active:scale-[0.98] transition-transform"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={!valid || saving}
          className={cn(
            'flex-1 h-11 rounded-xl text-sm font-bold transition-transform active:scale-[0.98]',
            valid && !saving ? 'bg-orange-500 text-black' : 'bg-[#1C1C1C] text-[#52525B] cursor-not-allowed'
          )}
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
