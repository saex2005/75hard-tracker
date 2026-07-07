'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!password || loading) return
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) throw new Error()
      router.replace('/')
      router.refresh()
    } catch {
      setError(true)
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-xs space-y-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-tight">75 HARD</h1>
          <p className="text-sm text-[#52525B] font-medium mt-1">Ingresá la clave para entrar</p>
        </div>
        <input
          type="password"
          inputMode="text"
          autoFocus
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setError(false)
          }}
          placeholder="Clave"
          className={cn(
            'w-full h-12 rounded-xl bg-[#141414] border px-4 text-base text-[#FAFAFA] placeholder-[#3F3F46] outline-none transition-colors',
            error ? 'border-red-500/60' : 'border-[#262626] focus:border-accent'
          )}
        />
        {error && <p className="text-xs text-red-500 font-medium">Clave incorrecta.</p>}
        <button
          type="submit"
          disabled={!password || loading}
          className="w-full h-12 rounded-xl bg-accent text-black text-sm font-black tracking-wide disabled:opacity-40 transition-transform active:scale-[0.98]"
        >
          {loading ? 'Entrando…' : 'ENTRAR'}
        </button>
      </form>
    </main>
  )
}
