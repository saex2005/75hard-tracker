'use client'
import { useOffline } from '@/hooks/useOffline'

export default function OfflineBanner() {
  const offline = useOffline()
  if (!offline) return null
  return (
    <div className="bg-[#1C1C1C] border-b border-[#262626] px-4 py-2 text-center">
      <p className="text-xs text-[#A1A1AA] font-medium">Sin conexión — los cambios se guardan localmente</p>
    </div>
  )
}
