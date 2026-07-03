import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase'

// Vercel cron: corre a las 00:05 todos los días
// Resetea el reto si el día anterior no fue completado

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayISO = yesterday.toISOString().split('T')[0]

  const { data: yDay } = await supabase
    .from('days')
    .select('completed')
    .eq('date', yesterdayISO)
    .single()

  if (!yDay || !yDay.completed) {
    const todayISO = new Date().toISOString().split('T')[0]

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

    return NextResponse.json({ reset: true, date: todayISO })
  }

  return NextResponse.json({ reset: false })
}
