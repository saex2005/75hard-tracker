import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase'

function getSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''

  if (q.length < 2) {
    return NextResponse.json({ error: 'q debe tener al menos 2 caracteres' }, { status: 400 })
  }

  const supabase = getSupabase()
  const { data, error } = await supabase.rpc('search_foods', { q })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Re-rank: matches por substring primero (el trigram solo puede rankear
  // "lechuga" arriba de "pechuga de pollo" para q="pechuga"), después
  // los que empiezan con la query, preservando el orden por similitud del RPC
  const nq = normalize(q)
  const ranked = (data ?? [])
    .map((food, i) => {
      const text = food.search_text ?? normalize(`${food.name} ${food.brand ?? ''}`)
      const starts = text.startsWith(nq) ? 2 : 0
      const contains = text.includes(nq) ? 1 : 0
      return { food, score: starts + contains, i }
    })
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((r) => r.food)

  return NextResponse.json(ranked)
}
