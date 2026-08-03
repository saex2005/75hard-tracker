import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE, isValidToken } from '@/lib/auth'

// Transcripción de audio (Groq, Whisper large-v3) para las notas de voz del chat del asistente.
export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  if (!(await isValidToken(req.cookies.get(AUTH_COOKIE)?.value))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Falta GROQ_API_KEY en el server' }, { status: 500 })
  }

  const form = await req.formData().catch(() => null)
  const audio = form?.get('audio')
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: 'Falta el audio' }, { status: 400 })
  }

  const groqForm = new FormData()
  groqForm.append('file', audio, 'audio.webm')
  groqForm.append('model', 'whisper-large-v3')
  groqForm.append('language', 'es')
  groqForm.append('response_format', 'json')

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: groqForm,
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    return NextResponse.json({ error: `Error de transcripción: ${errText || res.status}` }, { status: 502 })
  }

  const data = (await res.json()) as { text?: string }
  return NextResponse.json({ text: (data.text ?? '').trim() })
}
