import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import type { Database } from '@/lib/supabase'
import { todayART, yesterdayART } from '@/lib/utils'

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

  const { data: today } = await supabase
    .from('days')
    .select('completed, day_number, gym_done, cardio_done, water_bottles, diet_done, reading_done, photo_url, insight_done')
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

  const d = today.day_number
  const BOTTLES_GOAL = 4
  let sent = 0

  // --- KICKOFF 07:30 ARS ---
  if (type === 'kickoff') {
    const title = `75 Hard — Día ${d} de 75`
    const body = pick([
      `Otro día. Sin excusas, sin cheat days. A romperla.`,
      `Día ${d}. La mayoría no llega hasta acá. Vos sí.`,
      `Arrancó el día ${d}. Seis tasks. Las hacés todas.`,
      `Día ${d} de ${75 - d + 1} que quedan. Empezá por el gym.`,
      `Cada día que completás es uno que no podés perder. Arrancá.`,
      d <= 7
        ? `Primera semana. La más difícil. No la cagas ahora.`
        : d <= 30
        ? `Mes uno casi completo. Seguís en pie.`
        : d <= 60
        ? `Más de la mitad. No aflojés ahora.`
        : `Recta final. Quedan ${75 - d + 1} días. No pares.`,
    ])
    sent = await sendPush(subs, title, body)
  }

  // --- AGUA 11:00 ARS ---
  if (type === 'water') {
    const bottles = today.water_bottles
    if (bottles >= 2) {
      return NextResponse.json({ sent: 0, reason: 'water on track' })
    }
    const falta = BOTTLES_GOAL - bottles
    const body = pick([
      `Llevás ${bottles}/${BOTTLES_GOAL} botellas. Tomá agua ahora, no lo dejés para la noche.`,
      `${bottles} botellas. Te faltan ${falta}. A mitad del día ya deberías tener 4.`,
      `El galón no se completa solo. ${bottles}/${BOTTLES_GOAL}. Dale con el agua.`,
      `Agua: ${bottles}/${BOTTLES_GOAL}. Si lo dejás para la noche, va a ser un infierno.`,
    ])
    sent = await sendPush(subs, '💧 Agua — chequeá el progreso', body)
  }

  // --- PROGRESO GENERAL 14:00 ARS ---
  if (type === 'progress') {
    const done = [today.gym_done, today.cardio_done, today.diet_done, today.insight_done, today.reading_done, !!today.photo_url].filter(Boolean).length
    const pending = 6 - done
    const water = today.water_bottles

    if (pending === 0 && water >= BOTTLES_GOAL) {
      return NextResponse.json({ sent: 0, reason: 'all done' })
    }

    let body: string
    if (pending === 0) {
      body = `Tasks listas. Solo te falta el agua — llevás ${water}/${BOTTLES_GOAL} botellas.`
    } else if (done === 0) {
      body = pick([
        `Son las 14hs y no marcaste nada todavía. Arrancá ya.`,
        `Ninguna task completada. El día no se va a completar solo.`,
      ])
    } else {
      body = `${done}/6 tasks listas. Faltan ${pending}. Agua: ${water}/${BOTTLES_GOAL}. Vamos.`
    }

    sent = await sendPush(subs, `Día ${d} — estado a las 14hs`, body)
  }

  // --- INSIGHTMKT 15:15 ARS ---
  if (type === 'insight') {
    if (today.insight_done) {
      return NextResponse.json({ sent: 0, reason: 'insight done' })
    }
    const body = pick([
      'Saliste de la fábrica. Ahora arrancan las 3 horas que te acercan al primer cliente.',
      'Bloque InsightMkt: 15:15 a 17:45. El primer cliente no se consigue solo.',
      '3 horas de InsightMkt pendientes. Esto también resetea el reto. Arrancá.',
      'La fábrica paga las cuentas. Estas 3 horas construyen la salida. Dale.',
    ])
    sent = await sendPush(subs, '💼 InsightMkt — 3 hs', body)
  }

  // --- GYM + CARDIO 17:30 ARS ---
  if (type === 'gymcardio') {
    const gymPending = !today.gym_done
    const cardioPending = !today.cardio_done

    if (!gymPending && !cardioPending) {
      return NextResponse.json({ sent: 0, reason: 'both done' })
    }

    let body: string
    if (gymPending && cardioPending) {
      body = pick([
        'Gym y cardio sin marcar. Quedan pocas horas. No lo dejés para después.',
        'Dos entrenamientos pendientes. Son 90 minutos en total. Ahora.',
        'Sin gym, sin cardio. Si no arrancás ahora, el día se te va.',
      ])
    } else if (gymPending) {
      body = pick([
        'Cardio listo, gym pendiente. 45 minutos y cerrás esa task.',
        'Te falta el gym. Terminalo hoy.',
      ])
    } else {
      body = pick([
        'Gym listo, cardio pendiente. Salí a correr aunque sea.',
        'El cardio outdoor sigue pendiente. 45 minutos afuera.',
      ])
    }

    sent = await sendPush(subs, '💪 Gym / Cardio pendiente', body)
  }

  // --- LECTURA + FOTO 19:30 ARS ---
  if (type === 'readingphoto') {
    const readingPending = !today.reading_done
    const photoPending = !today.photo_url

    if (!readingPending && !photoPending) {
      return NextResponse.json({ sent: 0, reason: 'both done' })
    }

    let body: string
    if (readingPending && photoPending) {
      body = pick([
        '10 páginas y una foto. 15 minutos en total. No los dejes para mañana.',
        'Lectura y foto sin hacer. Son las más fáciles — hacelas ya.',
        'Dos tasks rápidas pendientes: foto y lectura. Cerrá eso ahora.',
      ])
    } else if (readingPending) {
      body = pick([
        '10 páginas. Las podés leer en 15 minutos. Agarra el libro.',
        'La lectura sigue pendiente. No te vayas a dormir sin hacerla.',
      ])
    } else {
      body = pick([
        'La foto del día no está. 30 segundos y listo.',
        'Falta la foto de progreso. Hacela antes de que se te olvide.',
      ])
    }

    sent = await sendPush(subs, '📖 📸 Últimos detalles', body)
  }

  // --- MACROS 20:45 ARS ---
  if (type === 'macros') {
    const { data: logs } = await supabase
      .from('food_logs')
      .select('kcal, protein')
      .eq('date', todayISO)

    const KCAL_GOAL = 2350
    const PROTEIN_GOAL = 170

    let body: string
    if (!logs || logs.length === 0) {
      body = pick([
        'No registraste ninguna comida hoy. Entrá a Dieta → Registro y cargá el día.',
        'Cero comidas registradas. Los quick-add del plan son 1 tap — no hay excusa.',
      ])
    } else {
      const kcal = Math.round(logs.reduce((a, l) => a + Number(l.kcal), 0))
      const protein = Math.round(logs.reduce((a, l) => a + Number(l.protein), 0))
      const kcalLeft = KCAL_GOAL - kcal
      const proteinLeft = PROTEIN_GOAL - protein

      if (kcalLeft < -100) {
        body = `⚠️ Llevás ${kcal} kcal — te pasaste ${Math.abs(kcalLeft)} del objetivo. Cená liviano: proteína + verduras.`
      } else if (proteinLeft > 30) {
        body = `Llevás ${kcal}/${KCAL_GOAL} kcal pero solo ${protein}g de proteína. Te faltan ${proteinLeft}g — la cena tiene que ser proteica.`
      } else if (kcalLeft > 100) {
        body = `Vas bien: ${kcal}/${KCAL_GOAL} kcal, ${protein}g de proteína. Te quedan ${kcalLeft} kcal para la cena.`
      } else {
        body = `Día clavado: ${kcal}/${KCAL_GOAL} kcal y ${protein}g de proteína. Cerrá con la cena del plan y listo.`
      }
    }

    sent = await sendPush(subs, '🥗 Macros del día', body)
  }

  // --- CIERRE + RESET 21:05 ARS ---
  if (type === 'evening') {
    const yesterdayISO = yesterdayART()

    const { data: cs } = await supabase
      .from('challenge_state')
      .select('*')
      .eq('id', 1)
      .single()

    let reset = false
    // Solo resetear si el reto ya arrancó (current_run_start <= ayer)
    if (cs && cs.current_run_start <= yesterdayISO) {
      const { data: yDay } = await supabase
        .from('days')
        .select('completed')
        .eq('date', yesterdayISO)
        .single()

      if (yDay && !yDay.completed) {
        await supabase
          .from('challenge_state')
          .update({
            current_run_start: todayISO,
            total_restarts: (cs.total_restarts ?? 0) + 1,
          })
          .eq('id', 1)
        reset = true
      }
    }

    if (today.completed) {
      return NextResponse.json({ sent: 0, reset, reason: 'day already completed' })
    }

    const pending = [
      !today.gym_done,
      !today.cardio_done,
      !today.diet_done,
      !today.insight_done,
      !today.reading_done,
      !today.photo_url,
      today.water_bottles < BOTTLES_GOAL,
    ].filter(Boolean).length

    let body: string
    if (pending === 0) {
      body = 'Completaste todo. Abrí la app y cerrá el día.'
    } else if (pending === 1) {
      body = pick([
        'Te falta 1 sola task. No rompas la racha por una task.',
        '1 task pendiente. Terminala y cerrá el día.',
      ])
    } else {
      body = pick([
        `${pending} tasks pendientes. Todavía llegás. Arrancá ya.`,
        `Quedan ${pending} tasks para cerrar el Día ${d}. No lo dejes ir.`,
        `Día ${d} en riesgo. ${pending} tasks sin completar. Movete.`,
      ])
    }

    sent = await sendPush(subs, `Día ${d} — cerrá el día`, body)
    return NextResponse.json({ sent, total: subs.length, type, reset })
  }

  return NextResponse.json({ sent, total: subs.length, type })
}
