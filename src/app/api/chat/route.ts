import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'
import { todayART } from '@/lib/utils'
import { ASSISTANT_SYSTEM_PROMPT } from '@/lib/assistant-context'
import { AUTH_COOKIE, isValidToken } from '@/lib/auth'
import { CHALLENGE_CONFIG, BOTTLES_PER_DAY } from '@/config/challenge'
import { DAILY_MACROS } from '@/config/nutrition'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_HISTORY = 20

type ChatMessage = { role: 'user' | 'assistant'; content: string }

// Estado vivo del día: se arma en cada request y va DESPUÉS del bloque cacheado
async function buildLiveState(): Promise<string> {
  const date = todayART()
  const [dayRes, stateRes, logsRes, weightRes] = await Promise.all([
    supabase.from('days').select('*').eq('date', date).maybeSingle(),
    supabase.from('challenge_state').select('*').eq('id', 1).maybeSingle(),
    supabase.from('food_logs').select('*').eq('date', date).order('created_at'),
    supabase.from('weight_checkpoints').select('*').order('date', { ascending: false }).limit(1),
  ])

  const day = dayRes.data
  const state = stateRes.data
  const logs = logsRes.data ?? []
  const lastWeight = weightRes.data?.[0]

  const nowART = new Date(Date.now() - 3 * 3600 * 1000)
  const hora = nowART.toISOString().slice(11, 16)
  const diaSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][nowART.getUTCDay()]

  let dayNumber: number | null = null
  if (state) {
    const start = new Date(`${state.current_run_start}T00:00:00-03:00`)
    dayNumber = Math.floor((nowART.getTime() - (start.getTime() - 3 * 3600 * 1000)) / 86400000) + 1
  }
  const preChallenge = new Date(`${date}T00:00:00Z`) < new Date(`${CHALLENGE_CONFIG.startDate}T00:00:00Z`)

  const totals = logs.reduce(
    (acc, l) => ({ kcal: acc.kcal + l.kcal, p: acc.p + l.protein, c: acc.c + l.carbs, g: acc.g + l.fat }),
    { kcal: 0, p: 0, c: 0, g: 0 }
  )
  const comidas = logs.map((l) => `${l.meal}: ${l.food_name} (${l.kcal} kcal, ${l.protein}g P)`).join(' · ') || 'nada registrado todavía'

  const tasks = day
    ? [
        `gym: ${day.gym_done ? `✅ (${day.gym_minutes} min)` : '❌ pendiente'}`,
        `cardio: ${day.cardio_done ? `✅ (${day.cardio_minutes} min)` : '❌ pendiente'}`,
        `agua: ${day.water_bottles}/${BOTTLES_PER_DAY} botellas de 1L`,
        `dieta: ${day.diet_done ? '✅' : '❌ pendiente (se marca al cierre del día)'}`,
        `lectura: ${day.reading_done ? `✅ (pág. ${day.reading_page})` : '❌ pendiente'}`,
        `foto: ${day.photo_url ? '✅' : '❌ pendiente'}`,
        `insightmkt: ${day.insight_done ? `✅ (${day.insight_minutes} min)` : '❌ pendiente'}`,
      ].join('\n- ')
    : 'todavía no hay registro del día en la app'

  return `# Estado real de HOY (desde la app — usalo, no lo inventes)

- Fecha: ${diaSemana} ${date}, ${hora} hs (Argentina)
- ${preChallenge ? `PRE-INICIO: el reto arranca el ${CHALLENGE_CONFIG.startDate}` : `Día ${dayNumber ?? '?'} de ${CHALLENGE_CONFIG.totalDays}`}${state ? ` · reinicios: ${state.total_restarts} · mejor racha: ${state.best_streak}` : ''}
- Último peso registrado: ${lastWeight ? `${lastWeight.weight_kg} kg (${lastWeight.date})` : '87 kg (baseline 2026-07-03)'}

Tasks de hoy:
- ${tasks}

Macros de hoy (tracker, informativo): ${Math.round(totals.kcal)} kcal / ${Math.round(totals.p)}g P / ${Math.round(totals.c)}g C / ${Math.round(totals.g)}g G — objetivo ${DAILY_MACROS.kcal} / ${DAILY_MACROS.protein}P / ${DAILY_MACROS.carbs}C / ${DAILY_MACROS.fat}G
Comidas registradas: ${comidas}`
}

export async function POST(req: NextRequest) {
  if (!(await isValidToken(req.cookies.get(AUTH_COOKIE)?.value))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Falta ANTHROPIC_API_KEY en el server' }, { status: 500 })
  }

  let messages: ChatMessage[]
  try {
    const body = await req.json()
    messages = body.messages
    if (!Array.isArray(messages) || messages.length === 0) throw new Error()
    messages = messages
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-MAX_HISTORY)
    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') throw new Error()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  let liveState = ''
  try {
    liveState = await buildLiveState()
  } catch {
    liveState = '# Estado del día\n\nNo se pudo leer Supabase — respondé sin datos del día y aclaralo.'
  }

  const client = new Anthropic()

  try {
    const stream = client.messages.stream({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: [
        // Bloque estático cacheable — no tocar el orden: el breakpoint va acá
        { type: 'text', text: ASSISTANT_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
        // Estado vivo — cambia por request, va después del breakpoint
        { type: 'text', text: liveState },
      ],
      messages,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream<Uint8Array>({
      start(controller) {
        stream.on('text', (delta) => controller.enqueue(encoder.encode(delta)))
        stream.on('end', () => controller.close())
        stream.on('error', (err) => controller.error(err))
      },
      cancel() {
        stream.abort()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    const msg = err instanceof Anthropic.APIError ? `Error de la API (${err.status})` : 'Error inesperado'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
