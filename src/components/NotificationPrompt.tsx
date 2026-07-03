'use client'

import { useEffect, useState } from 'react'

export default function NotificationPrompt() {
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    if (Notification.permission === 'granted' || Notification.permission === 'denied') return
    setShow(true)
  }, [])

  async function enable() {
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setShow(false); return }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!).buffer as ArrayBuffer,
      })

      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      })
    } catch {
      // permiso denegado o error — simplemente ocultar
    } finally {
      setShow(false)
      setLoading(false)
    }
  }

  if (!show) return null

  return (
    <div className="flex items-center justify-between gap-3 bg-surface border border-[#262626] rounded-xl px-4 py-3">
      <p className="text-xs text-[#A1A1AA] leading-snug">
        Activá notificaciones para el recordatorio de las 21hs.
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setShow(false)}
          className="text-[11px] text-[#52525B] hover:text-[#A1A1AA] transition-colors"
        >
          Ahora no
        </button>
        <button
          type="button"
          onClick={enable}
          disabled={loading}
          className="text-[11px] font-bold text-accent hover:brightness-110 transition-all disabled:opacity-50"
        >
          {loading ? '...' : 'Activar'}
        </button>
      </div>
    </div>
  )
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i)
  }
  return output
}
