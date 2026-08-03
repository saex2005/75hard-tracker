'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn, todayART, yesterdayART } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  image_url?: string | null
  audio_url?: string | null
  created_at?: string
}
type MenuState = { index: number; x: number; y: number } | null
type Attachment = { kind: 'image'; url: string; file: File } | null

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
  const [attachment, setAttachment] = useState<Attachment>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [attachError, setAttachError] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const atBottomRef = useRef(true)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingStreamRef = useRef<MediaStream | null>(null)

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
    async (text: string, opts?: { imageUrl?: string; audioUrl?: string }) => {
      const content = text.trim()
      if ((!content && !opts?.imageUrl) || streaming) return
      setError(null)
      setInput('')
      setAttachment(null)
      // Al enviar, siempre bajás al fondo — igual que WhatsApp
      atBottomRef.current = true
      setMessages((prev) => [
        ...prev,
        {
          role: 'user',
          content,
          image_url: opts?.imageUrl ?? null,
          audio_url: opts?.audioUrl ?? null,
          created_at: new Date().toISOString(),
        },
      ])
      setStreaming(true)

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content, imageUrl: opts?.imageUrl, audioUrl: opts?.audioUrl }),
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

  // ---------- Adjuntar foto (ej. etiqueta nutricional en el súper) ----------

  function handlePickImage(file: File) {
    setAttachError(null)
    if (!file.type.startsWith('image/')) {
      setAttachError('Solo se aceptan imágenes.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setAttachError('La imagen no puede superar 10 MB.')
      return
    }
    setAttachment({ kind: 'image', url: URL.createObjectURL(file), file })
  }

  async function uploadAttachment(): Promise<string | null> {
    if (!attachment) return null
    setUploadingImage(true)
    try {
      const ext = attachment.file.name.split('.').pop() ?? 'jpg'
      const path = `images/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(path, attachment.file, { upsert: true })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('chat-media').getPublicUrl(path)
      return data.publicUrl
    } catch {
      setAttachError('Error al subir la imagen. Intentá de nuevo.')
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  async function sendWithAttachment() {
    if (!attachment || streaming || uploadingImage) return
    const text = input
    const url = await uploadAttachment()
    if (!url) return
    send(text, { imageUrl: url })
  }

  // ---------- Nota de voz: grabar, subir y transcribir (Groq Whisper) ----------

  async function startRecording() {
    setAttachError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      recordingStreamRef.current = stream
      audioChunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setRecording(true)
    } catch {
      setAttachError('No se pudo acceder al micrófono.')
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current
    if (!recorder) return
    recorder.onstop = async () => {
      recordingStreamRef.current?.getTracks().forEach((t) => t.stop())
      recordingStreamRef.current = null
      setRecording(false)

      const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
      if (blob.size === 0) return
      setTranscribing(true)
      try {
        const ext = blob.type.includes('mp4') ? 'm4a' : 'webm'
        const path = `audio/${Date.now()}.${ext}`

        const [uploadResult, transcribeResult] = await Promise.all([
          supabase.storage.from('chat-media').upload(path, blob, { upsert: true }),
          fetch('/api/transcribe', {
            method: 'POST',
            body: (() => {
              const form = new FormData()
              form.append('audio', blob, `audio.${ext}`)
              return form
            })(),
          }).then((res) => res.json().catch(() => ({}))),
        ])

        if (uploadResult.error) throw uploadResult.error
        const { data } = supabase.storage.from('chat-media').getPublicUrl(path)

        const transcribed = (transcribeResult?.text ?? '').trim()
        if (!transcribed) {
          setAttachError('No se entendió el audio. Probá de nuevo o escribilo.')
          return
        }
        send(transcribed, { audioUrl: data.publicUrl })
      } catch {
        setAttachError('Error al procesar la nota de voz.')
      } finally {
        setTranscribing(false)
      }
    }
    recorder.stop()
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
    <div
      className="fixed inset-x-0 z-10 flex flex-col bg-bg"
      style={{
        top: 'env(safe-area-inset-top, 0px)',
        bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
    <main className="max-w-md mx-auto w-full h-full flex flex-col">
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
                  {m.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.image_url}
                      alt="Imagen adjunta"
                      className={cn('rounded-lg max-h-64 w-auto object-contain mb-1.5', m.content && 'mb-2')}
                    />
                  )}
                  {m.audio_url && (
                    <audio controls src={m.audio_url} className="w-56 max-w-full mb-1.5 h-9" />
                  )}
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
      <div className="shrink-0 border-t border-[#1C1C1C]">
        {/* Preview de la imagen adjunta antes de enviar */}
        {attachment && (
          <div className="px-4 pt-2 flex items-center gap-2">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={attachment.url} alt="Adjunto" className="h-16 w-16 object-cover rounded-lg border border-[#262626]" />
              <button
                type="button"
                onClick={() => setAttachment(null)}
                aria-label="Quitar imagen"
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-[#262626] text-[#FAFAFA] text-xs flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            {uploadingImage && <span className="text-xs text-[#52525B] font-medium">Subiendo…</span>}
          </div>
        )}

        {(attachError || transcribing) && (
          <div className="px-4 pt-2">
            {attachError && <p className="text-xs text-red-400 font-medium">{attachError}</p>}
            {transcribing && <p className="text-xs text-[#52525B] font-medium">Transcribiendo audio…</p>}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (attachment) sendWithAttachment()
            else send(input)
          }}
          className="px-4 pb-3 pt-2 flex gap-2 items-end"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Adjuntar imagen"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handlePickImage(file)
              e.target.value = ''
            }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={streaming || recording || transcribing}
            aria-label="Adjuntar imagen"
            className="h-11 w-11 shrink-0 rounded-xl bg-[#141414] border border-[#262626] disabled:opacity-40 flex items-center justify-center active:scale-[0.96] transition-transform"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M21.44 11.05l-9.19 9.19a5 5 0 01-7.07-7.07l9.19-9.19a3.5 3.5 0 014.95 4.95l-9.2 9.19a1.5 1.5 0 01-2.12-2.12l8.49-8.49" stroke="#A1A1AA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Enter envía, Shift+Enter hace salto de línea (igual que la mayoría de los chats)
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (attachment) sendWithAttachment()
                else send(input)
              }
            }}
            placeholder={attachment ? 'Agregá un mensaje (opcional)…' : 'Escribí acá…'}
            rows={1}
            enterKeyHint="send"
            autoCapitalize="sentences"
            autoCorrect="on"
            spellCheck
            disabled={recording}
            // Al cerrar el teclado, iOS a veces deja la página corrida — reacomodar
            onBlur={() => setTimeout(() => window.scrollTo(0, 0), 50)}
            className="flex-1 resize-none max-h-36 rounded-xl bg-[#141414] border border-[#262626] px-4 py-2.5 text-base leading-[1.4] text-[#FAFAFA] placeholder-[#3F3F46] outline-none focus:border-accent transition-colors disabled:opacity-40"
          />

          {!input.trim() && !attachment ? (
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              disabled={streaming || transcribing}
              aria-label={recording ? 'Detener grabación' : 'Grabar audio'}
              className={cn(
                'h-11 w-11 shrink-0 rounded-xl font-black disabled:opacity-40 transition-transform active:scale-[0.96] flex items-center justify-center',
                recording ? 'bg-red-500 text-white animate-pulse' : 'bg-[#141414] border border-[#262626]'
              )}
            >
              {recording ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <rect x="5" y="5" width="14" height="14" rx="2" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3z" stroke="#A1A1AA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M19 11a7 7 0 01-14 0M12 18v3" stroke="#A1A1AA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ) : (
            <button
              type="submit"
              disabled={(!input.trim() && !attachment) || streaming || uploadingImage}
              aria-label="Enviar"
              className="h-11 w-11 shrink-0 rounded-xl bg-accent text-black font-black disabled:opacity-40 transition-transform active:scale-[0.96] flex items-center justify-center"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12L19 12M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </form>
      </div>
    </main>
    </div>
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
