import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database, Food } from '@/lib/supabase'

function getSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Top 8 alimentos más usados en los últimos 30 días (para el atajo "Recientes")
export async function GET() {
  const supabase = getSupabase()

  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0]
  const { data: logs, error } = await supabase
    .from('food_logs')
    .select('food_id')
    .not('food_id', 'is', null)
    .gte('date', since)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Frecuencia por food_id, manteniendo el orden de uso más reciente como desempate
  const freq = new Map<string, number>()
  for (const log of logs ?? []) {
    if (log.food_id) freq.set(log.food_id, (freq.get(log.food_id) ?? 0) + 1)
  }

  const topIds = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id]) => id)

  if (topIds.length === 0) {
    return NextResponse.json([])
  }

  const { data: foods, error: foodsError } = await supabase
    .from('foods')
    .select('*')
    .in('id', topIds)

  if (foodsError) {
    return NextResponse.json({ error: foodsError.message }, { status: 500 })
  }

  // Reordenar según frecuencia (el .in() no garantiza orden)
  const byId = new Map((foods ?? []).map((f) => [f.id, f]))
  const ordered = topIds.map((id) => byId.get(id)).filter((f): f is Food => !!f)

  return NextResponse.json(ordered)
}
