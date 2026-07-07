'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

const STORAGE_KEY = 'hard75-chat-history'
const MAX_STORED = 40

const SUGGESTIONS = [
  '¿Qué me falta hoy?',
  '¿Qué ceno con lo que tengo?',
  'Tengo un antojo terrible',
  '¿Cómo vengo con los macros?',
]

export default function AsistentePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setMessages(JSON.parse(saved))
    } catch {}
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED)))
    } catch {}
  }, [messages, loaded])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  const send = useCallback(
    async (text: string) => {
      const content = text.trim()
      if (!content || streaming) return
      setError(null)
      setInput('')

      const history = [...messages, { role: 'user' as const, content }]
      setMessages(history)
      setStreaming(true)

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history }),
          signal: controller.signal,
        })
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error || `Error ${res.status}`)
        }

        setMessages((prev) => [...prev, { role: 'assistant', content: '' }])
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const delta = decoder.decode(value, { stream: true })
          setMessages((prev) => {
            const next = [...prev]
            next[next.length - 1] = {
              role: 'assistant',
              content: next[next.length - 1].content + delta,
            }
            return next
          })
        }
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : 'Error de conexión')
          // Si no llegó nada del asistente, saco el mensaje vacío
          setMessages((prev) =>
            prev.length && prev[prev.length - 1].role === 'assistant' && !prev[prev.length - 1].content
              ? prev.slice(0, -1)
              : prev
          )
        }
      } finally {
        setStreaming(false)
        abortRef.current = null
      }
    },
    [messages, streaming]
  )

  function clearChat() {
    abortRef.current?.abort()
    setMessages([])
    setError(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }

  return (
    <main className="max-w-md mx-auto flex flex-col h-dvh pb-16">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-3 shrink-0">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Asistente</h1>
          <p className="text-xs text-[#52525B] font-medium">Conoce tu reto y tu día en tiempo real</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="text-[11px] font-bold tracking-wide uppercase text-[#52525B] border border-[#262626] rounded-lg px-3 py-2 active:scale-[0.98]"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-3">
        {messages.length === 0 && loaded && (
          <div className="pt-8 space-y-2">
            <p className="text-sm text-[#52525B] font-medium text-center mb-4">
              Preguntale lo que sea del reto — tiene tu estado del día.
            </p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="w-full text-left text-sm font-medium text-[#A1A1AA] bg-[#141414] border border-[#262626] rounded-xl px-4 py-3 active:scale-[0.99]"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm font-medium whitespace-pre-wrap break-words',
              m.role === 'user'
                ? 'ml-auto bg-accent text-black rounded-br-md'
                : 'mr-auto bg-[#141414] border border-[#262626] text-[#E4E4E7] rounded-bl-md'
            )}
          >
            {m.content || (
              <span className="inline-flex gap-1 py-1" aria-label="Pensando">
                <Dot delay="0ms" />
                <Dot delay="150ms" />
                <Dot delay="300ms" />
              </span>
            )}
          </div>
        ))}

        {error && (
          <div className="bg-[#1A0A0A] border border-red-500/20 rounded-xl px-4 py-3">
            <p className="text-xs text-red-500 font-medium">{error}</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="shrink-0 px-4 pb-3 pt-2 border-t border-[#1C1C1C] flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribí acá…"
          enterKeyHint="send"
          className="flex-1 h-11 rounded-xl bg-[#141414] border border-[#262626] px-4 text-sm text-[#FAFAFA] placeholder-[#3F3F46] outline-none focus:border-accent transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim() || streaming}
          aria-label="Enviar"
          className="h-11 w-11 shrink-0 rounded-xl bg-accent text-black font-black disabled:opacity-40 transition-transform active:scale-[0.96] flex items-center justify-center"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12L19 12M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
    </main>
  )
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full bg-[#52525B] animate-pulse"
      style={{ animationDelay: delay }}
    />
  )
}
