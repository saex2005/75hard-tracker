import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database, MealSlot } from '@/lib/supabase'

function getSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

const MEALS: MealSlot[] = ['desayuno', 'almuerzo', 'merienda', 'cena', 'extra']

function isValidNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0
}

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date')

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date requerido (YYYY-MM-DD)' }, { status: 400 })
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('date', date)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { date, meal, food_id, food_name, grams, kcal, protein, carbs, fat } = body

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date requerido (YYYY-MM-DD)' }, { status: 400 })
  }
  if (!MEALS.includes(meal)) {
    return NextResponse.json({ error: `meal debe ser uno de: ${MEALS.join(', ')}` }, { status: 400 })
  }
  if (!food_name || typeof food_name !== 'string' || !food_name.trim()) {
    return NextResponse.json({ error: 'food_name requerido' }, { status: 400 })
  }
  if (!isValidNumber(grams) || grams <= 0) {
    return NextResponse.json({ error: 'grams requerido (número > 0)' }, { status: 400 })
  }
  if (!isValidNumber(kcal) || !isValidNumber(protein) || !isValidNumber(carbs) || !isValidNumber(fat)) {
    return NextResponse.json({ error: 'kcal, protein, carbs y fat requeridos (números ≥ 0)' }, { status: 400 })
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('food_logs')
    .insert({
      date,
      meal,
      food_id: typeof food_id === 'string' && food_id ? food_id : null,
      food_name: food_name.trim(),
      grams,
      kcal,
      protein,
      carbs,
      fat,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('food_logs')
    .delete()
    .eq('id', id)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Entrada no encontrada' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
