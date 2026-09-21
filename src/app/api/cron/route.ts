import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase'
import { checkAndReset, ensureTodayRow } from '@/lib/reset'
import { fetchStepsForDate } from '@/lib/oura'
import { yesterdayART } from '@/lib/utils'

// Vercel cron: 5 6 * * * (06:05 UTC = 03:05 ARS — el día anterior ya cerró seguro)
// 1. Sincroniza los pasos finales de ayer desde Oura (el chequeo de abajo
//    necesita el step count definitivo, no el que había a medianoche).
// 2. Cierra el día de ayer si las 4 tasks estaban (red de seguridad del auto-cierre)
//    o resetea el reto si de verdad se falló.
// 3. Crea la fila de hoy para que las notificaciones de n8n nunca se apaguen.

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  try {
    const yesterdayISO = yesterdayART()
    const steps = await fetchStepsForDate(yesterdayISO)
    await supabase.from('days').update({ steps }).eq('date', yesterdayISO)
  } catch {
    // Oura sin conectar todavía o request fallido — no bloquea el reset/cierre del día
  }

  const result = await checkAndReset(supabase)
  const today = await ensureTodayRow(supabase)

  return NextResponse.json({ ...result, todayRow: today })
}
