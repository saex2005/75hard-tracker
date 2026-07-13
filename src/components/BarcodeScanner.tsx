'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import type { IScannerControls } from '@zxing/browser'

export default function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (code: string) => void
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const reader = new BrowserMultiFormatReader()

    reader
      .decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        videoRef.current!,
        (result, err) => {
          if (cancelled) return
          if (result) {
            controlsRef.current?.stop()
            onDetected(result.getText())
          }
          // err llega en cada frame sin detección — no es un error real, se ignora
        }
      )
      .then((controls) => {
        if (cancelled) {
          controls.stop()
          return
        }
        controlsRef.current = controls
      })
      .catch((err) => {
        if (cancelled) return
        const msg =
          err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
            ? 'Sin permiso de cámara — habilitalo en Ajustes → Safari → Cámara y volvé a intentar'
            : err instanceof DOMException && err.name === 'NotFoundError'
              ? 'No se encontró ninguna cámara en este dispositivo'
              : 'No se pudo abrir la cámara'
        setError(msg)
      })

    return () => {
      cancelled = true
      controlsRef.current?.stop()
    }
  }, [onDetected])

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 safe-top">
        <p className="text-sm font-semibold text-white">Escanear código de barras</p>
        <button
          onClick={onClose}
          className="h-9 w-9 flex items-center justify-center rounded-full bg-white/10 text-white text-sm font-bold active:scale-95 transition-transform"
          aria-label="Cerrar escáner"
        >
          ✕
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          playsInline
          autoPlay
        />
        {/* Marco guía */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[80%] max-w-sm h-28 border-2 border-orange-500 rounded-xl" />
        </div>
        {error && (
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 bg-[#141414] border border-[#262626] rounded-xl p-4 text-center">
            <p className="text-sm text-white font-medium">{error}</p>
          </div>
        )}
      </div>

      <div className="px-4 py-4 safe-bottom">
        <p className="text-xs text-white/50 text-center font-medium">
          Apuntá al código de barras del producto — se lee solo, no hace falta tocar nada
        </p>
      </div>
    </div>
  )
}
