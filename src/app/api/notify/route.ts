import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import type { Database } from '@/lib/supabase'
import { todayART } from '@/lib/utils'
import { checkAndReset, ensureTodayRow } from '@/lib/reset'
import { CHALLENGE_CONFIG } from '@/config/challenge'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function sendPush(
  subs: { endpoint: string; p256dh: string; auth: string }[],
  title: string,
  body: string
) {
  const payload = JSON.stringify({ title, body, url: '/' })
  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  )
  return results.filter((r) => r.status === 'fulfilled').length
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const type = request.nextUrl.searchParams.get('type') ?? 'evening'
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Fechas en hora argentina — Vercel corre en UTC y después de las 21:00 ARS
  // el día UTC ya es el siguiente (bug que impedía el evening y rompía el reset)
  const todayISO = todayART()

  // Tipos sin task equivalente en el reto "100 Días" (23/09/2026 en adelante) —
  // agua y macros/dieta dejaron de ser reglas del reto. Quedan inertes acá
  // por si el workflow de n8n todavía los llama; desactivar/borrar esos
  // workflows en n8n para que dejen de correr del todo.
  if (type === 'water') {
    return NextResponse.json({ sent: 0, reason: 'water task removed 23/09/2026 — reto 100 Días' })
  }
  if (type === 'macros') {
    return NextResponse.json({ sent: 0, reason: 'diet is out of scope since 23/09/2026 — reto 100 Días' })
  }

  // Garantizar que la fila de hoy exista — si no, las notificaciones se apagan
  // justo los días que no se abrió la app (cuando más se necesitan)
  const { dayNumber, active } = await ensureTodayRow(supabase)
  if (!active) {
    return NextResponse.json({ sent: 0, reason: 'challenge not active' })
  }

  const { data: today } = await supabase
    .from('days')
    .select('completed, day_number, study_block_done, study_block_minutes, gym_done, gym_minutes, reading_done, steps')
    .eq('date', todayISO)
    .single()

  if (!today) {
    return NextResponse.json({ sent: 0, reason: 'no active day' })
  }

  if (today.completed && type !== 'evening') {
    return NextResponse.json({ sent: 0, reason: 'day already completed' })
  }

  const { data: subs } = await supabase.from('push_subscriptions').select('*')
  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'no subscriptions' })
  }

  // Día derivado de current_run_start — nunca el day_number congelado de la fila
  const d = dayNumber
  const total = CHALLENGE_CONFIG.totalDays
  let sent = 0

  // --- KICKOFF 07:30 ARS ---
  if (type === 'kickoff') {
    const title = `100 Días — Día ${d} de ${total}`
    const body = pick([
      `Otro día. Sin excusas. A romperla.`,
      `Día ${d}. La mayoría no llega hasta acá. Vos sí.`,
      `Arrancó el día ${d}. Cuatro reglas. Las hacés todas.`,
      `Día ${d} de ${total - d + 1} que quedan. Empezá por el bloque de estudio.`,
      `Cada día que completás es uno que no podés perder. Arrancá.`,
      d <= 14
        ? `Primer ciclo. No la cagues ahora.`
        : d <= 50
        ? `Vas por la mitad. Seguís en pie.`
        : d <= 85
        ? `Más de la mitad. No aflojés ahora.`
        : `Recta final. Quedan ${total - d + 1} días. No pares.`,
    ])
    sent = await sendPush(subs, title, body)
  }

  // --- PROGRESO GENERAL 14:00 ARS ---
  if (type === 'progress') {
    const done = [today.study_block_done, today.gym_done, today.reading_done, today.steps >= CHALLENGE_CONFIG.stepsGoal].filter(Boolean).length
    const pending = 4 - done

    if (pending === 0) {
      return NextResponse.json({ sent: 0, reason: 'all done' })
    }

    let body: string
    if (done === 0) {
      body = pick([
        `Son las 14hs y no marcaste nada todavía. Arrancá ya.`,
        `Ninguna regla completada. El día no se va a completar solo.`,
      ])
    } else {
      body = `${done}/4 reglas listas. Faltan ${pending}. Vamos.`
    }

    sent = await sendPush(subs, `Día ${d} — estado a las 14hs`, body)
  }

  // --- ESTUDIO/IMPLEMENTACIÓN 15:15 ARS (repurpuesto — ex tipo "insight", inerte desde julio) ---
  if (type === 'insight') {
    if (today.study_block_done) {
      return NextResponse.json({ sent: 0, reason: 'study block done' })
    }
    const body = pick([
      `90 minutos de estudio/implementación sin marcar. Bloqueá el tiempo ahora.`,
      `El bloque de hoy sigue pendiente. Es la regla con más peso — no la dejes para último momento.`,
      `Sin bloque de estudio/implementación todavía. 90 minutos, arrancá.`,
    ])
    sent = await sendPush(subs, '📚 Estudio/Implementación pendiente', body)
  }

  // --- ENTRENAMIENTO 17:30 ARS ---
  if (type === 'gymcardio') {
    if (today.gym_done) {
      return NextResponse.json({ sent: 0, reason: 'training done' })
    }
    const body = pick([
      'Entrenamiento sin marcar. Quedan pocas horas. No lo dejés para después.',
      '45 minutos de entrenamiento pendientes. Ahora.',
      'Sin entrenamiento todavía. Si no arrancás ahora, el día se te va.',
    ])
    sent = await sendPush(subs, '💪 Entrenamiento pendiente', body)
  }

  // --- LECTURA + PASOS 19:30 ARS ---
  if (type === 'readingphoto') {
    const readingPending = !today.reading_done
    const stepsPending = today.steps < CHALLENGE_CONFIG.stepsGoal

    if (!readingPending && !stepsPending) {
      return NextResponse.json({ sent: 0, reason: 'both done' })
    }

    let body: string
    if (readingPending && stepsPending) {
      body = pick([
        '10 páginas y los pasos sin cerrar. Aprovechá una caminata para las dos cosas.',
        'Lectura y pasos pendientes. Salir a caminar con el libro de audio no cuenta — pero la caminata sí suma pasos.',
      ])
    } else if (readingPending) {
      body = pick([
        '10 páginas. Las podés leer en 15 minutos. Agarrá el libro.',
        'La lectura sigue pendiente. No te vayas a dormir sin hacerla.',
      ])
    } else {
      body = `Te faltan pasos: ${today.steps}/${CHALLENGE_CONFIG.stepsGoal}. Una caminata corta cierra la regla.`
    }

    sent = await sendPush(subs, '📖 👟 Últimos detalles', body)
  }

  // --- CIERRE + RESET 21:05 ARS ---
  if (type === 'evening') {
    // Misma lógica que el cron de 03:05 — un solo lugar (lib/reset.ts)
    const { reset } = await checkAndReset(supabase)
    // Si hubo reset recién ahora (el cron de la mañana falló), hoy pasó a ser Día 1
    const dToday = reset ? 1 : d

    if (today.completed) {
      return NextResponse.json({ sent: 0, reset, reason: 'day already completed' })
    }

    const pending = [
      !today.study_block_done,
      !today.gym_done,
      !today.reading_done,
      today.steps < CHALLENGE_CONFIG.stepsGoal,
    ].filter(Boolean).length

    let body: string
    if (pending === 0) {
      body = 'Completaste todo. El día se cierra solo — a descansar.'
    } else if (pending === 1) {
      body = pick([
        'Te falta 1 sola regla. No rompas la racha por eso.',
        '1 regla pendiente. Terminala y cerrá el día.',
      ])
    } else {
      body = pick([
        `${pending} reglas pendientes. Todavía llegás. Arrancá ya.`,
        `Quedan ${pending} reglas para cerrar el Día ${dToday}. No lo dejes ir.`,
        `Día ${dToday} en riesgo. ${pending} reglas sin completar. Movete.`,
      ])
    }

    sent = await sendPush(subs, `Día ${dToday} — cerrá el día`, body)
    return NextResponse.json({ sent, total: subs.length, type, reset })
  }

  return NextResponse.json({ sent, total: subs.length, type })
}
