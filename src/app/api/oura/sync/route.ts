import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase'
import { fetchStepsForDate } from '@/lib/oura'
import { isDayComplete, todayART } from '@/lib/utils'

function getSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Sincroniza los pasos de una fecha desde Oura y recalcula `completed`.
// Se llama (a) desde el cliente al cargar "hoy" / botón "Sincronizar", y
// (b) desde el cron, para el día de ayer, antes de checkAndReset.
export async function POST(request: NextRequest) {
  const { date } = await request.json().catch(() => ({ date: null }))
  const targetDate = date ?? todayART()

  const supabase = getSupabase()

  const [{ data: day }, steps] = await Promise.all([
    supabase.from('days').select('*').eq('date', targetDate).single(),
    fetchStepsForDate(targetDate),
  ])

  if (!day) {
    return NextResponse.json({ error: 'no day row for date' }, { status: 404 })
  }

  const { data: cycle } = await supabase
    .from('study_cycles')
    .select('*')
    .lte('start_date', targetDate)
    .gte('end_date', targetDate)
    .maybeSingle()

  const optimistic = { ...day, steps }
  const completed = isDayComplete(optimistic, cycle ?? null)

  const { data: updated, error } = await supabase
    .from('days')
    .update({ steps, completed })
    .eq('id', day.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updated)
}
