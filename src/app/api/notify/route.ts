import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import type { Database } from '@/lib/supabase'

// Vercel cron: corre a las 00:00 UTC = 21:00 ARS
// Manda notificación si el día de hoy no está completado

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const todayISO = new Date().toISOString().split('T')[0]

  const { data: today } = await supabase
    .from('days')
    .select('completed, gym_done, cardio_done, water_bottles, diet_done, reading_done, photo_url')
    .eq('date', todayISO)
    .single()

  // Si el día ya está cerrado, no molestar
  if (!today || today.completed) {
    return NextResponse.json({ sent: false, reason: 'already completed or no record' })
  }

  const { data: subs } = await supabase.from('push_subscriptions').select('*')
  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: false, reason: 'no subscriptions' })
  }

  const pendingTasks = [
    !today.gym_done,
    !today.cardio_done,
    !today.diet_done,
    !today.reading_done,
    !today.photo_url,
  ].filter(Boolean).length

  const payload = JSON.stringify({
    title: '75 Hard 🔥',
    body: pendingTasks === 1
      ? 'Te falta 1 task para cerrar el día.'
      : `Te faltan ${pendingTasks} tasks para cerrar el día.`,
    url: '/',
  })

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  )

  const sent = results.filter((r) => r.status === 'fulfilled').length
  return NextResponse.json({ sent, total: subs.length })
}
