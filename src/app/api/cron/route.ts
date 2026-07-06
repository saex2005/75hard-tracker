import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase'
import { todayART, yesterdayART } from '@/lib/utils'

// Vercel cron: 5 6 * * * (06:05 UTC = 03:05 ARS — el día anterior ya cerró seguro)
// Resetea el reto si el día anterior no fue completado,
// pero solo si el reto ya arrancó (current_run_start <= ayer)

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: cs } = await supabase
    .from('challenge_state')
    .select('*')
    .eq('id', 1)
    .single()

  if (!cs) return NextResponse.json({ reset: false, reason: 'no challenge state' })

  const todayISO = todayART()
  const yesterdayISO = yesterdayART()

  // Si el reto todavía no arrancó, no hacer nada
  if (cs.current_run_start > yesterdayISO) {
    return NextResponse.json({ reset: false, reason: 'challenge not started yet' })
  }

  const { data: yDay } = await supabase
    .from('days')
    .select('completed')
    .eq('date', yesterdayISO)
    .single()

  if (!yDay || !yDay.completed) {
    await supabase
      .from('challenge_state')
      .update({
        current_run_start: todayISO,
        total_restarts: (cs.total_restarts ?? 0) + 1,
      })
      .eq('id', 1)

    return NextResponse.json({ reset: true, date: todayISO })
  }

  return NextResponse.json({ reset: false })
}
