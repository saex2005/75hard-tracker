'use client'
import { useState, useEffect } from 'react'

export function useOffline() {
  const [offline, setOffline] = useState(false)
  useEffect(() => {
    setOffline(!navigator.onLine)
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  return offline
}
