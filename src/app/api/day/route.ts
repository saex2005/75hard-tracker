import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase'

function getSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')

  if (!date) {
    return NextResponse.json({ error: 'date param required' }, { status: 400 })
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('days')
    .select('*')
    .eq('date', date)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json(data)
}

// Solo campos de tasks — date/day_number/id no se tocan por API
const PATCHABLE = [
  'gym_done', 'gym_minutes', 'cardio_done', 'cardio_minutes', 'water_bottles',
  'diet_done', 'reading_done', 'reading_page', 'photo_url',
  'insight_done', 'insight_minutes', 'completed',
] as const

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { id, ...rest } = body

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const patch: Partial<Database['public']['Tables']['days']['Update']> = {}
  for (const key of PATCHABLE) {
    if (key in rest) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(patch as any)[key] = rest[key]
    }
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'sin campos válidos para actualizar' }, { status: 400 })
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('days')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
