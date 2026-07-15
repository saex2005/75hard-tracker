import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { todayART, dayNumberFor } from '@/lib/utils'
import { buildSystemPrompt } from '@/lib/assistant-context'
import { AUTH_COOKIE, isValidToken } from '@/lib/auth'
import { CHALLENGE_CONFIG, BOTTLES_PER_DAY } from '@/config/challenge'
import { DAILY_MACROS } from '@/config/nutrition'

export const runtime = 'nodejs'
export const maxDuration = 60

// gym_logs no está en el tipo Database de @/lib/supabase (tabla nueva) — cliente sin genérico,
// mismo patrón que /api/gym-log/route.ts hasta que se regeneren los tipos.
const supabaseUntyped = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const CONTEXT_MESSAGES = 30 // últimos mensajes de la DB que entran como contexto
const UI_MESSAGES = 50 // mensajes que devuelve el GET para renderizar
const MAX_TOOL_ROUNDS = 6

// ---------- Herramientas de lectura (Supabase) + memoria persistente ----------

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'consultar_dias',
    description:
      'Historial de días del reto: por día trae tasks completados, minutos de gym/cardio, si se publicó el video del día, botellas de agua, página de lectura y si el día cerró completo. Usar para preguntas sobre días pasados, rachas o patrones.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Cantidad de días hacia atrás (default 14, máximo 75)' },
      },
    },
  },
  {
    name: 'consultar_peso',
    description: 'Todos los checkpoints de peso registrados (pesaje quincenal). Usar para evolución del peso o proyecciones.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'consultar_comidas',
    description: 'Comidas registradas en el tracker de macros para una fecha dada, con totales del día.',
    input_schema: {
      type: 'object',
      properties: { fecha: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' } },
      required: ['fecha'],
    },
  },
  {
    name: 'consultar_gym',
    description:
      'Sets registrados en el gym: fecha, sesión (torso/piernas/empujes/traccion), ejercicio, peso y repeticiones por serie. Usar para hablar de progresión real, comparar con la sesión anterior del mismo ejercicio, o resumir qué entrenó en un rango de fechas.',
    input_schema: {
      type: 'object',
      properties: {
        ejercicio: { type: 'string', description: 'Filtrar por nombre de ejercicio (opcional, texto parcial)' },
        limit: { type: 'number', description: 'Cantidad de sets hacia atrás a traer (default 40, máximo 200)' },
      },
    },
  },
  {
    name: 'buscar_conversaciones',
    description:
      'Buscar en TODO el historial de conversaciones con Santiago (más allá de los últimos mensajes que ya tenés en contexto). Usar cuando pregunte por algo que hablaron antes y no esté a la vista.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Palabra o frase a buscar en los mensajes' } },
      required: ['query'],
    },
  },
  {
    name: 'guardar_memoria',
    description:
      'Guardar un hecho útil y duradero sobre Santiago para futuras conversaciones (preferencias, qué le funciona, contexto personal del reto). LLAMALA SIEMPRE que Santiago diga "acordate", "anotá", "guardá" o pida explícitamente recordar algo — sin esta llamada el dato se pierde. También usala por iniciativa propia ante hechos duraderos. No usar para datos del día ni para cosas ya presentes en el contexto.',
    input_schema: {
      type: 'object',
      properties: { texto: { type: 'string', description: 'El hecho, en una oración concreta' } },
      required: ['texto'],
    },
  },
  {
    name: 'borrar_memoria',
    description: 'Borrar una memoria guardada que resultó incorrecta u obsoleta. El id figura en la lista de memorias del contexto.',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'id (uuid) de la memoria a borrar' } },
      required: ['id'],
    },
  },
]

async function runTool(name: string, input: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
      case 'consultar_dias': {
        const limit = Math.min(Math.max(Number(input.limit) || 14, 1), 75)
        const { data, error } = await supabase
          .from('days')
          .select('*')
          .order('date', { ascending: false })
          .limit(limit)
        if (error) throw error
        const rows = (data ?? []).map((d) => ({
          fecha: d.date,
          dia: d.day_number,
          completo: d.completed,
          gym: d.gym_done ? d.gym_minutes : 0,
          cardio: d.cardio_done ? d.cardio_minutes : 0,
          agua_botellas: d.water_bottles,
          dieta: d.diet_done,
          lectura_pag: d.reading_done ? d.reading_page : null,
          foto: !!d.photo_url,
          insight_min: d.insight_done ? d.insight_minutes : 0,
        }))
        return JSON.stringify(rows)
      }
      case 'consultar_peso': {
        const { data, error } = await supabase
          .from('weight_checkpoints')
          .select('date, weight_kg, notes')
          .order('date', { ascending: true })
        if (error) throw error
        return JSON.stringify({ baseline: '2026-07-03: 87 kg', checkpoints: data ?? [] })
      }
      case 'consultar_comidas': {
        const fecha = String(input.fecha ?? '')
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return 'Error: fecha inválida, usar YYYY-MM-DD'
        const { data, error } = await supabase
          .from('food_logs')
          .select('meal, food_name, grams, kcal, protein, carbs, fat')
          .eq('date', fecha)
          .order('created_at')
        if (error) throw error
        const logs = data ?? []
        const totals = logs.reduce(
          (a, l) => ({ kcal: a.kcal + l.kcal, p: a.p + l.protein, c: a.c + l.carbs, g: a.g + l.fat }),
          { kcal: 0, p: 0, c: 0, g: 0 }
        )
        return JSON.stringify({ fecha, comidas: logs, totales: totals })
      }
      case 'consultar_gym': {
        const limit = Math.min(Math.max(Number(input.limit) || 40, 1), 200)
        let query = supabaseUntyped
          .from('gym_logs')
          .select('date, session, exercise, set_num, weight, reps')
          .order('date', { ascending: false })
          .order('set_num', { ascending: true })
          .limit(limit)
        const ejercicio = String(input.ejercicio ?? '').trim()
        if (ejercicio) query = query.ilike('exercise', `%${ejercicio.replace(/[%_]/g, '\\$&')}%`)
        const { data, error } = await query
        if (error) throw error
        return JSON.stringify(data ?? [])
      }
      case 'buscar_conversaciones': {
        const query = String(input.query ?? '').trim()
        if (!query) return 'Error: query vacía'
        const { data, error } = await supabase
          .from('chat_messages')
          .select('role, content, created_at')
          .ilike('content', `%${query.replace(/[%_]/g, '\\$&')}%`)
          .order('created_at', { ascending: false })
          .limit(20)
        if (error) throw error
        const rows = (data ?? []).map((m) => ({
          fecha: m.created_at.slice(0, 16).replace('T', ' '),
          quien: m.role === 'user' ? 'santiago' : 'vos',
          texto: m.content.length > 300 ? m.content.slice(0, 300) + '…' : m.content,
        }))
        return rows.length ? JSON.stringify(rows) : `Sin resultados para "${query}"`
      }
      case 'guardar_memoria': {
        const texto = String(input.texto ?? '').trim()
        if (!texto) return 'Error: texto vacío'
        const { error } = await supabase.from('assistant_memories').insert({ content: texto })
        if (error) throw error
        return 'Memoria guardada.'
      }
      case 'borrar_memoria': {
        const id = String(input.id ?? '')
        const { error } = await supabase.from('assistant_memories').delete().eq('id', id)
        if (error) throw error
        return 'Memoria borrada.'
      }
      default:
        return `Error: herramienta desconocida "${name}"`
    }
  } catch (err) {
    return `Error consultando datos: ${err instanceof Error ? err.message : 'desconocido'}`
  }
}

// ---------- Estado vivo del día (va DESPUÉS del bloque cacheado) ----------

async function buildLiveState(): Promise<string> {
  const date = todayART()
  const [dayRes, stateRes, logsRes, weightRes, memRes] = await Promise.all([
    supabase.from('days').select('*').eq('date', date).maybeSingle(),
    supabase.from('challenge_state').select('*').eq('id', 1).maybeSingle(),
    supabase.from('food_logs').select('*').eq('date', date).order('created_at'),
    supabase.from('weight_checkpoints').select('*').order('date', { ascending: false }).limit(1),
    supabase.from('assistant_memories').select('*').order('created_at'),
  ])

  const day = dayRes.data
  const state = stateRes.data
  const logs = logsRes.data ?? []
  const lastWeight = weightRes.data?.[0]
  const memories = memRes.data ?? []

  const nowART = new Date(Date.now() - 3 * 3600 * 1000)
  const hora = nowART.toISOString().slice(11, 16)
  const diaSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][nowART.getUTCDay()]

  const dayNumber = state ? dayNumberFor(date, state.current_run_start) : null
  const preChallenge = date < CHALLENGE_CONFIG.startDate

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
        `video @santimeza.ads: ${day.insight_done ? '✅ publicado' : '❌ pendiente'}`,
      ].join('\n- ')
    : 'todavía no hay registro del día en la app'

  const memoriesBlock = memories.length
    ? memories.map((m) => `- [${m.id}] ${m.content}`).join('\n')
    : '- (todavía no guardaste ninguna)'

  return `# Estado real de HOY (desde la app — usalo, no lo inventes)

- Fecha: ${diaSemana} ${date}, ${hora} hs (Argentina)
- ${preChallenge ? `PRE-INICIO: el reto arranca el ${CHALLENGE_CONFIG.startDate}` : `Día ${dayNumber ?? '?'} de ${CHALLENGE_CONFIG.totalDays}`}${state ? ` · reinicios: ${state.total_restarts} · mejor racha: ${state.best_streak}` : ''}
- Último peso registrado: ${lastWeight ? `${lastWeight.weight_kg} kg (${lastWeight.date})` : '87 kg (baseline 2026-07-03)'}

Tasks de hoy:
- ${tasks}

Macros de hoy (tracker, informativo): ${Math.round(totals.kcal)} kcal / ${Math.round(totals.p)}g P / ${Math.round(totals.c)}g C / ${Math.round(totals.g)}g G — objetivo ${DAILY_MACROS.kcal} / ${DAILY_MACROS.protein}P / ${DAILY_MACROS.carbs}C / ${DAILY_MACROS.fat}G
Comidas registradas: ${comidas}

Tus memorias guardadas:
${memoriesBlock}`
}

// ---------- Endpoints ----------

// GET: historial para renderizar en la UI (memoria constante entre dispositivos)
export async function GET(req: NextRequest) {
  if (!(await isValidToken(req.cookies.get(AUTH_COOKIE)?.value))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const { data, error } = await supabase
    .from('chat_messages')
    .select('role, content, created_at')
    .order('created_at', { ascending: false })
    .limit(UI_MESSAGES)
  if (error) {
    // Tabla inexistente u otro problema: la UI arranca vacía, el chat sigue andando
    return NextResponse.json({ messages: [] })
  }
  return NextResponse.json({ messages: (data ?? []).reverse() })
}

export async function POST(req: NextRequest) {
  if (!(await isValidToken(req.cookies.get(AUTH_COOKIE)?.value))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  // La key puede venir como ANTHROPIC_API_KEY o API_PRIVATE_KEY (nombre usado en Vercel)
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.API_PRIVATE_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Falta la API key de Anthropic en el server' }, { status: 500 })
  }

  // Acepta { message } (cliente nuevo) o { messages: [...] } (cliente viejo cacheado por la PWA)
  let userMessage = ''
  try {
    const body = await req.json()
    if (typeof body.message === 'string') {
      userMessage = body.message.trim()
    } else if (Array.isArray(body.messages)) {
      const last = body.messages[body.messages.length - 1]
      if (last?.role === 'user' && typeof last.content === 'string') userMessage = last.content.trim()
    }
    if (!userMessage) throw new Error()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  // Contexto: últimos mensajes desde la DB (memoria constante) + el mensaje nuevo.
  // Si la tabla no existe, sigue con historial vacío.
  const historyRes = await supabase
    .from('chat_messages')
    .select('role, content')
    .order('created_at', { ascending: false })
    .limit(CONTEXT_MESSAGES)
  const history = (historyRes.data ?? []).reverse()
  while (history.length && history[0].role !== 'user') history.shift() // el primer mensaje debe ser user

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userMessage },
  ]

  // Log del mensaje del usuario (best-effort: un fallo acá no corta el chat)
  supabase.from('chat_messages').insert({ role: 'user', content: userMessage }).then(() => {})

  let liveState = ''
  try {
    liveState = await buildLiveState()
  } catch {
    liveState = '# Estado del día\n\nNo se pudo leer Supabase — respondé sin datos del día y aclaralo.'
  }

  const client = new Anthropic({ apiKey })
  const encoder = new TextEncoder()
  const systemPrompt = buildSystemPrompt()

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      let assistantText = ''
      try {
        // Loop agéntico: streamea texto al cliente y resuelve tool calls entre rondas
        const turn: Anthropic.MessageParam[] = [...messages]
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const stream = client.messages.stream({
            model: 'claude-sonnet-5',
            max_tokens: 3000,
            thinking: { type: 'adaptive' },
            output_config: { effort: 'medium' },
            system: [
              // Bloque estático cacheable — no tocar el orden: el breakpoint va acá
              { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
              // Estado vivo — cambia por request, va después del breakpoint
              { type: 'text', text: liveState },
            ],
            tools: TOOLS,
            messages: turn,
          })

          stream.on('text', (delta) => {
            assistantText += delta
            controller.enqueue(encoder.encode(delta))
          })
          const final = await stream.finalMessage()

          if (final.stop_reason !== 'tool_use') break

          // Contenido completo de vuelta (incluye thinking blocks — requerido por la API)
          turn.push({ role: 'assistant', content: final.content })
          const toolUses = final.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
          )
          const results: Anthropic.ToolResultBlockParam[] = await Promise.all(
            toolUses.map(async (tu) => ({
              type: 'tool_result' as const,
              tool_use_id: tu.id,
              content: await runTool(tu.name, tu.input as Record<string, unknown>),
            }))
          )
          turn.push({ role: 'user', content: results })
        }
        // Log de la respuesta completa (best-effort)
        if (assistantText.trim()) {
          await supabase.from('chat_messages').insert({ role: 'assistant', content: assistantText })
        }
        controller.close()
      } catch (err) {
        // Persistir lo que alcanzó a generar — si no, el texto que el usuario
        // vio en pantalla desaparece del historial al recargar
        if (assistantText.trim()) {
          await supabase
            .from('chat_messages')
            .insert({ role: 'assistant', content: assistantText + '\n\n[respuesta cortada]' })
            .then(() => {})
        }
        controller.error(err)
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  })
}
