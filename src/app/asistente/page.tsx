'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn, todayART, yesterdayART } from '@/lib/utils'

type ChatMessage = { role: 'user' | 'assistant'; content: string; created_at?: string }
type MenuState = { index: number; x: number; y: number } | null

// "Nueva charla" no borra nada del server (memoria constante) — solo oculta
// los mensajes anteriores a este cutoff en la vista de este dispositivo.
const CUTOFF_KEY = 'hard75-chat-cutoff'

const SUGGESTIONS = [
  '¿Qué me falta hoy?',
  '¿Qué ceno con lo que tengo?',
  'Tengo un antojo terrible',
  '¿Cómo vengo con los macros?',
]

// Fecha ART (mismo offset fijo -3h que el resto de la app) para agrupar por día
function dayKey(iso?: string): string {
  const ms = iso ? new Date(iso).getTime() : Date.now()
  return new Date(ms - 3 * 3600 * 1000).toISOString().split('T')[0]
}

function timeLabel(iso?: string): string {
  const d = iso ? new Date(iso) : new Date()
  return d.toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' })
}

function dateLabel(iso?: string): string {
  const key = dayKey(iso)
  if (key === todayART()) return 'Hoy'
  if (key === yesterdayART()) return 'Ayer'
  const d = iso ? new Date(iso) : new Date()
  return d.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: 'numeric', month: 'long' })
}

export default function AsistentePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [menu, setMenu] = useState<MenuState>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const atBottomRef = useRef(true)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-grow del textarea (estilo iMessage/WhatsApp) — máximo ~6 líneas, después scroll interno
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`
  }, [input])

  // Historial desde el server — misma conversación en todos los dispositivos
  useEffect(() => {
    let cancelled = false
    fetch('/api/chat')
      .then((res) => (res.ok ? res.json() : { messages: [] }))
      .then((data: { messages: ChatMessage[] }) => {
        if (cancelled) return
        const cutoff = localStorage.getItem(CUTOFF_KEY)
        const visible = cutoff
          ? data.messages.filter((m) => m.created_at && m.created_at > cutoff)
          : data.messages
        setMessages(visible)
        setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Auto-scroll solo si ya estabas al fondo (como WhatsApp) — si scrolleaste
  // para arriba a leer historial, no te saca de ahí cuando llega una respuesta.
  useEffect(() => {
    if (atBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      setShowScrollBtn(false)
    } else if (messages.length > 0) {
      setShowScrollBtn(true)
    }
  }, [messages, streaming])

  function handleScroll() {
    const el = containerRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    const atBottom = distance < 80
    atBottomRef.current = atBottom
    setShowScrollBtn(!atBottom)
  }

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    atBottomRef.current = true
    setShowScrollBtn(false)
  }

  const send = useCallback(
    async (text: string) => {
      const content = text.trim()
      if (!content || streaming) return
      setError(null)
      setInput('')
      // Al enviar, siempre bajás al fondo — igual que WhatsApp
      atBottomRef.current = true
      setMessages((prev) => [...prev, { role: 'user', content, created_at: new Date().toISOString() }])
      setStreaming(true)

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content }),
          signal: controller.signal,
        })
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error || `Error ${res.status}`)
        }

        setMessages((prev) => [...prev, { role: 'assistant', content: '', created_at: new Date().toISOString() }])
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const delta = decoder.decode(value, { stream: true })
          setMessages((prev) => {
            const next = [...prev]
            next[next.length - 1] = {
              ...next[next.length - 1],
              content: next[next.length - 1].content + delta,
            }
            return next
          })
        }
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : 'Error de conexión')
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
    [streaming]
  )

  function newChat() {
    abortRef.current?.abort()
    setMessages([])
    setError(null)
    try {
      localStorage.setItem(CUTOFF_KEY, new Date().toISOString())
    } catch {}
  }

  // Copiar mensaje — mantener apretado (mobile) o click derecho (desktop),
  // igual que el menú de "Copiar / Reenviar / Eliminar" de WhatsApp. Acá solo
  // aplica Copiar: no hay hilos, contactos ni chats para reenviar/responder.
  function openMenu(index: number, x: number, y: number) {
    if (navigator.vibrate) navigator.vibrate(10)
    setMenu({ index, x, y })
  }

  function startLongPress(index: number, e: React.TouchEvent) {
    const touch = e.touches[0]
    const x = touch.clientX
    const y = touch.clientY
    longPressTimer.current = setTimeout(() => openMenu(index, x, y), 450)
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  function copyMessage(index: number) {
    const text = messages[index]?.content
    if (text) navigator.clipboard?.writeText(text).catch(() => {})
    setMenu(null)
  }

  return (
    <main className="max-w-md mx-auto flex flex-col h-dvh pb-16">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-3 shrink-0">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Asistente</h1>
          <p className="text-xs text-[#52525B] font-medium">Se acuerda de todo lo que hablaron</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={newChat}
            className="text-[11px] font-bold tracking-wide uppercase text-[#52525B] border border-[#262626] rounded-lg px-3 py-2 active:scale-[0.98]"
          >
            Nueva charla
          </button>
        )}
      </div>

      {/* Mensajes */}
      <div ref={containerRef} onScroll={handleScroll} className="relative flex-1 overflow-y-auto px-4 pb-3">
        {messages.length === 0 && loaded && (
          <div className="pt-8 space-y-2">
            <p className="text-sm text-[#52525B] font-medium text-center mb-4">
              Preguntale lo que sea del reto — tiene tu estado del día y recuerda las charlas anteriores.
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

        {messages.map((m, i) => {
          const prev = messages[i - 1]
          const next = messages[i + 1]
          const newDay = !prev || dayKey(m.created_at) !== dayKey(prev.created_at)
          const isFirstOfGroup = newDay || prev.role !== m.role
          const isLastOfGroup = !next || next.role !== m.role || dayKey(next.created_at) !== dayKey(m.created_at)

          return (
            <div key={i}>
              {newDay && (
                <div className="flex justify-center my-3">
                  <span className="text-[11px] font-semibold text-[#52525B] bg-[#141414] border border-[#262626] rounded-full px-3 py-1">
                    {dateLabel(m.created_at)}
                  </span>
                </div>
              )}
              <div className={cn('flex flex-col', m.role === 'user' ? 'items-end' : 'items-start', isFirstOfGroup ? 'mt-3' : 'mt-0.5')}>
                <div
                  onContextMenu={(e) => {
                    e.preventDefault()
                    openMenu(i, e.clientX, e.clientY)
                  }}
                  onTouchStart={(e) => startLongPress(i, e)}
                  onTouchEnd={cancelLongPress}
                  onTouchMove={cancelLongPress}
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm font-medium whitespace-pre-wrap break-words select-text',
                    m.role === 'user'
                      ? cn('bg-accent text-black', isLastOfGroup && 'rounded-br-md')
                      : cn('bg-[#141414] border border-[#262626] text-[#E4E4E7]', isLastOfGroup && 'rounded-bl-md')
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
                {isLastOfGroup && m.content && (
                  <span className="text-[10px] font-mono text-[#3F3F46] mt-1 px-1">{timeLabel(m.created_at)}</span>
                )}
              </div>
            </div>
          )
        })}

        {error && (
          <div className="bg-[#1A0A0A] border border-red-500/20 rounded-xl px-4 py-3 mt-3">
            <p className="text-xs text-red-500 font-medium">{error}</p>
          </div>
        )}
        <div ref={bottomRef} />

        {/* Volver al fondo — aparece si scrolleaste para arriba, como en WhatsApp */}
        {showScrollBtn && (
          <button
            onClick={scrollToBottom}
            aria-label="Ir al último mensaje"
            className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-[#141414] border border-[#262626] shadow-lg flex items-center justify-center active:scale-[0.95] transition-transform"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 5v14M12 19l-6-6M12 19l6-6" stroke="#A1A1AA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Menú contextual — mantener apretado o click derecho sobre un mensaje */}
      {menu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenu(null)}
            onTouchStart={() => setMenu(null)}
          />
          <div
            className="fixed z-50 bg-[#1C1C1C] border border-[#262626] rounded-xl shadow-xl overflow-hidden"
            style={{
              left: Math.min(menu.x, (typeof window !== 'undefined' ? window.innerWidth : 400) - 170),
              top: Math.max(menu.y - 48, 8),
            }}
          >
            <button
              onClick={() => copyMessage(menu.index)}
              className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-[#FAFAFA] active:bg-[#262626] whitespace-nowrap w-full text-left"
            >
              Copiar mensaje
            </button>
          </div>
        </>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="shrink-0 px-4 pb-3 pt-2 border-t border-[#1C1C1C] flex gap-2"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Enter envía, Shift+Enter hace salto de línea (igual que la mayoría de los chats)
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send(input)
            }
          }}
          placeholder="Escribí acá…"
          rows={1}
          enterKeyHint="send"
          autoCapitalize="sentences"
          autoCorrect="on"
          spellCheck
          // Al cerrar el teclado, iOS a veces deja la página corrida — reacomodar
          onBlur={() => setTimeout(() => window.scrollTo(0, 0), 50)}
          className="flex-1 resize-none max-h-36 rounded-xl bg-[#141414] border border-[#262626] px-4 py-2.5 text-base leading-[1.4] text-[#FAFAFA] placeholder-[#3F3F46] outline-none focus:border-accent transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim() || streaming}
          aria-label="Enviar"
          className="h-11 w-11 shrink-0 self-end rounded-xl bg-accent text-black font-black disabled:opacity-40 transition-transform active:scale-[0.96] flex items-center justify-center"
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
