'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface PhotoUploadProps {
  date: string
  currentUrl: string | null
  onUploaded: (url: string) => void
  disabled?: boolean
}

export default function PhotoUpload({ date, currentUrl, onUploaded, disabled }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Solo se aceptan imágenes.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('La imagen no puede superar 10 MB.')
      return
    }

    setError(null)
    setUploading(true)

    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      // Path con timestamp: cambiar la foto genera URL nueva y el CDN
      // no puede servir la versión vieja cacheada
      const path = `${date}/photo-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('progress-photos')
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('progress-photos')
        .getPublicUrl(path)

      onUploaded(data.publicUrl)
    } catch {
      setError('Error al subir la foto. Intentá de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      {currentUrl ? (
        <div className="relative rounded-lg overflow-hidden aspect-[4/3] bg-surface2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentUrl}
            alt={`Foto de progreso del ${date}`}
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 hover:opacity-100 transition-opacity duration-200 text-sm font-semibold text-white"
          >
            Cambiar foto
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          aria-label="Subir foto de progreso"
          className={cn(
            'w-full rounded-lg border border-dashed border-[#262626] py-6 text-center',
            'hover:border-[#A1A1AA] transition-colors duration-200',
            'flex flex-col items-center gap-2',
            (disabled || uploading) && 'opacity-40 cursor-not-allowed'
          )}
        >
          <span className="text-2xl" aria-hidden="true">📸</span>
          <span className="text-xs text-[#A1A1AA] font-medium">
            {uploading ? 'Subiendo...' : 'Subir foto del día'}
          </span>
        </button>
      )}

      {/* Sin `capture`: el picker nativo ofrece cámara O galería */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Seleccionar foto"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      {uploading && (
        <div
          className="h-1 bg-[#262626] rounded-full overflow-hidden"
          aria-label="Subiendo foto..."
          role="status"
        >
          <div className="h-full bg-accent rounded-full animate-pulse w-2/3" />
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400" role="alert" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  )
}
