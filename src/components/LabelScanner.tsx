'use client'

import { useRef, useState } from 'react'
import type { Food } from '@/lib/supabase'

export type LabelScanResult =
  | { found: true; food: Food }
  | {
      found: false
      name?: string | null
      brand?: string | null
      kcal?: number | null
      protein?: number | null
      carbs?: number | null
      fat?: number | null
    }

// Achica la foto antes de subirla — una foto de cámara de iPhone pesa varios MB,
// esto la baja a ~1200px de lado mayor en JPEG calidad 0.8 (suficiente para leer
// una etiqueta, liviano para el límite de payload de la función serverless).
async function compressImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const maxSide = 1200
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo procesar la imagen')
  ctx.drawImage(bitmap, 0, 0, w, h)

  return canvas.toDataURL('image/jpeg', 0.8)
}

export default function LabelScanner({
  barcode,
  onResult,
  onError,
}: {
  barcode?: string
  onResult: (result: LabelScanResult) => void
  onError: (message: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite volver a elegir el mismo archivo después
    if (!file) return

    setLoading(true)
    try {
      const dataUrl = await compressImage(file)
      const res = await fetch('/api/foods/scan-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, barcode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'No se pudo leer la etiqueta')

      if (data.found) {
        onResult({ found: true, food: data.food as Food })
      } else {
        onResult({
          found: false,
          name: data.scannedName,
          brand: data.scannedBrand,
          kcal: data.scannedKcal,
          protein: data.scannedProtein,
          carbs: data.scannedCarbs,
          fat: data.scannedFat,
        })
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'No se pudo leer la etiqueta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 space-y-3 text-center">
      <p className="text-sm font-semibold">No lo encontramos en ninguna base</p>
      <p className="text-xs text-[#52525B] font-medium">
        Sacale una foto a la tabla de "Información Nutricional" del paquete — Claude la lee y completa los datos solo
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="w-full h-12 rounded-xl text-sm font-bold bg-orange-500 text-black active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="h-4 w-4 border-2 border-black/40 border-t-transparent rounded-full animate-spin" />
            Leyendo la etiqueta…
          </>
        ) : (
          '📷 Sacar foto de la etiqueta'
        )}
      </button>
    </div>
  )
}
