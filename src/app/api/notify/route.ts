import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import type { Database } from '@/lib/supabase'

// Llamado por n8n en 3 horarios distintos vía ?type=morning|midday|evening
// Authorization: Bearer <CRON_SECRET>

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

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

  const now = new Date()
  const todayISO = now.toISOString().split('T')[0]

  const { data: today } = await supabase
    .from('days')
    .select('completed, day_number, gym_done, cardio_done, water_bottles, diet_done, reading_done, photo_url')
    .eq('date', todayISO)
    .single()

  // Si el día no existe o ya está cerrado, no hay nada que notificar
  if (!today || today.completed) {
    return NextResponse.json({ sent: 0, reason: 'no active day' })
  }

  const { data: subs } = await supabase.from('push_subscriptions').select('*')
  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'no subscriptions' })
  }

  const dayNumber = today.day_number
  const pendingTasks = [
    !today.gym_done,
    !today.cardio_done,
    !today.diet_done,
    !today.reading_done,
    !today.photo_url,
  ].filter(Boolean).length
  const BOTTLES_GOAL = 8
  const waterPct = today.water_bottles / BOTTLES_GOAL

  let sent = 0

  if (type === 'morning') {
    sent = await sendPush(
      subs,
      `75 Hard — Día ${dayNumber}`,
      'Arrancó el día. Completá las 6 tasks antes de las 21hs.'
    )
  }

  if (type === 'midday') {
    const waterLow = waterPct < 0.5
    const manyPending = pendingTasks >= 3

    // Solo notificar si hay algo urgente
    if (!waterLow && !manyPending) {
      return NextResponse.json({ sent: 0, reason: 'on track, no notification needed' })
    }

    const parts: string[] = []
    if (waterLow) parts.push(`Agua: ${today.water_bottles}/${BOTTLES_GOAL} botellas.`)
    if (manyPending) parts.push(`Faltan ${pendingTasks} tasks.`)

    sent = await sendPush(subs, '75 Hard — Chequeo mediodía', parts.join(' '))
  }

  if (type === 'evening') {
    // Reset si el día anterior no fue completado
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayISO = yesterday.toISOString().split('T')[0]

    const { data: yDay } = await supabase
      .from('days')
      .select('completed')
      .eq('date', yesterdayISO)
      .single()

    if (yDay && !yDay.completed) {
      const { data: cs } = await supabase
        .from('challenge_state')
        .select('total_restarts')
        .eq('id', 1)
        .single()

      await supabase
        .from('challenge_state')
        .update({
          current_run_start: todayISO,
          total_restarts: (cs?.total_restarts ?? 0) + 1,
        })
        .eq('id', 1)
    }

    const body =
      pendingTasks === 0
        ? 'Completaste todo. Cerrá el día en la app.'
        : pendingTasks === 1
        ? 'Te falta 1 task. No rompas la racha.'
        : `Te faltan ${pendingTasks} tasks. No rompas la racha.`

    sent = await sendPush(subs, `75 Hard — Cerrá el Día ${dayNumber}`, body)
  }

  return NextResponse.json({ sent, total: subs.length, type })
}
